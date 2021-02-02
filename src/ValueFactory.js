/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash'),
    require('is-promise'),
    require('phpcommon'),
    require('./Iterator/ArrayIterator'),
    require('./Value/Array'),
    require('./Value/BarewordString'),
    require('./Value/Boolean'),
    require('./Reference/Element/ElementProvider'),
    require('./Value/Exit'),
    require('./FFI/Result'),
    require('./Value/Float'),
    require('./Value/Integer'),
    require('./KeyValuePair'),
    require('./Value/Null'),
    require('./Value/Object'),
    require('./FFI/Value/PHPObject'),
    require('./Value/String'),
    require('./Value'),
    require('./FFI/Value/ValueStorage')
], function (
    _,
    isPromise,
    phpCommon,
    ArrayIterator,
    ArrayValue,
    BarewordStringValue,
    BooleanValue,
    ElementProvider,
    ExitValue,
    FFIResult,
    FloatValue,
    IntegerValue,
    KeyValuePair,
    NullValue,
    ObjectValue,
    PHPObject,
    StringValue,
    Value,
    ValueStorage
) {
    var Exception = phpCommon.Exception;

    /**
     * Creates Value and related objects
     *
     * @param {Resumable|null} pausable
     * @param {string} mode
     * @param {ElementProvider} elementProvider
     * @param {Translator} translator
     * @param {CallFactory} callFactory
     * @param {ErrorPromoter} errorPromoter
     * @param {ValueStorage} valueStorage
     * @constructor
     */
    function ValueFactory(
        pausable,
        mode,
        elementProvider,
        translator,
        callFactory,
        errorPromoter,
        valueStorage
    ) {
        /**
         * @type {CallFactory}
         */
        this.callFactory = callFactory;
        /**
         * @type {ElementProvider}
         */
        this.elementProvider = elementProvider || new ElementProvider();
        /**
         * Used for generating a unique ID for the next ObjectValue that is created
         * (shown in the output of var_dump(...), for example)
         *
         * @type {number}
         */
        this.nextObjectID = 1;
        /**
         * @type {CallStack|null}
         */
        this.callStack = null;
        /**
         * @type {ErrorPromoter}
         */
        this.errorPromoter = errorPromoter;
        /**
         * @type {Namespace|null}
         */
        this.globalNamespace = null;
        /**
         * @type {string}
         */
        this.mode = mode;
        /**
         * The single NullValue for efficiency, created lazily in .createNull(...).
         * It must be created lazily there as it depends on CallStack, which due to a circular dependency
         * is injected via setter: .setCallStack(...). That setter is not always called, eg. by various unit tests,
         * for simplicity.
         *
         * @type {NullValue|null}
         */
        this.nullValue = null;
        /**
         * @type {Resumable|null}
         */
        this.pausable = pausable;
        /**
         * @type {Translator}
         */
        this.translator = translator;
        /**
         * @type {ValueStorage}
         */
        this.valueStorage = valueStorage || new ValueStorage();
    }

    _.extend(ValueFactory.prototype, {
        /**
         * Attempts to resolve the given value to a Value object instance.
         * - If already a Value instance, simply returns it.
         * - If an FFIResult, it is handled as appropriate (pausing PHP execution if in async mode)
         * - If any other primitive or object, it is coerced to a Value instance
         *
         * @param {*} value
         * @return {Value}
         */
        coerce: function (value) {
            var factory = this;

            if (value instanceof Value) {
                return value;
            }

            if (value instanceof FFIResult) {
                // An FFI Result was returned, so we need to handle it as appropriate
                return value.resolve(factory);
            }

            // TODO: Consider removing this behaviour altogether now that we have FFIResult?
            if (isPromise(value) && factory.pausable) {
                // A promise was returned (note that returning an FFIResult is preferred)
                return this.coercePromise(value);
            }

            return factory.createFromNative(value);
        },

        /**
         * Coerces the given array-like of natives and/or values
         * into an array where all have been coerced to values
         *
         * @param {*[]} arrayLike
         * @returns {Value[]}
         */
        coerceList: function (arrayLike) {
            var coercedValues = [],
                factory = this;

            _.each(arrayLike, function (element) {
                coercedValues.push(factory.coerce(element));
            });

            return coercedValues;
        },

        /**
         * Coerces a JavaScript object to a PHP object instance of the special JSObject class
         *
         * @param {Object|Value} value
         * @return {ObjectValue|Value}
         * @throws {Error} Throws when a value other than an ObjectValue instance, null or undefined is given
         */
        coerceObject: function (value) {
            var factory = this;

            if (value instanceof Value) {
                if (value.getType() !== 'object') {
                    throw new Exception('Tried to coerce a Value of type "' + value.getType() + '" to object');
                }

                return value;
            }

            if (value === null || typeof value === 'undefined') {
                return factory.createNull();
            }

            if (typeof value !== 'object') {
                throw new Error('Only objects, null or undefined may be coerced to an object');
            }

            return factory.createObject(value, factory.globalNamespace.getClass('JSObject'));
        },

        /**
         * Awaits a promise (in async mode). Throws if in psync or sync mode
         *
         * @param {Promise} promise
         * @returns {Value}
         */
        coercePromise: function (promise) {
            var factory = this,
                pause;

            if (!factory.pausable) {
                throw new Exception('Cannot await a promise in non-async mode');
            }

            pause = factory.pausable.createPause();

            // Wait for the returned promise to resolve or reject before continuing
            promise.then(function (resultValue) {
                // Remember we still need to coerce the result
                pause.resume(factory.coerce(resultValue));
            }, function (error) {
                pause.throw(error);
            });

            return pause.now();
        },

        /**
         * Creates a PHP ArrayValue. A custom element provider may optionally be provided,
         * if special elements are required (for example, HookableElements, which are used
         * by the special $GLOBALS superglobal for two-way binding to global variables)
         *
         * @param {Array} value
         * @param {ElementProvider|HookableElementProvider=} elementProvider
         * @return {ArrayValue}
         */
        createArray: function (value, elementProvider) {
            var factory = this;

            return new ArrayValue(
                factory,
                factory.callStack,
                value,
                null,
                elementProvider || factory.elementProvider
            );
        },

        /**
         * Creates an ArrayIterator
         *
         * @param {ArrayValue|ObjectValue} arrayLikeValue
         * @returns {ArrayIterator}
         */
        createArrayIterator: function (arrayLikeValue) {
            return new ArrayIterator(arrayLikeValue);
        },

        /**
         * Creates a BarewordStringValue
         *
         * @param {string} value
         * @return {BarewordStringValue}
         */
        createBarewordString: function (value) {
            var factory = this;

            return new BarewordStringValue(factory, factory.callStack, value);
        },

        /**
         * Creates a BooleanValue
         *
         * TODO: Consider having only two instances of BooleanValue, one for true and one for false,
         *       to save on memory usage
         *
         * @param {boolean} value
         * @return {BooleanValue}
         */
        createBoolean: function (value) {
            var factory = this;

            return new BooleanValue(factory, factory.callStack, value);
        },

        /**
         * Instantiates a PHP Closure instance with the given internal closure object
         *
         * @param {Closure} closure Internal closure object
         * @return {ObjectValue}
         */
        createClosureObject: function (closure) {
            var factory = this,
                closureClass = factory.globalNamespace.getClass('Closure');

            return closureClass.instantiateWithInternals([], {
                'closure': closure
            });
        },

        /**
         * Creates an ObjectValue wrapping a PHP Error instance (eg. a call to an undefined method)
         *
         * @param {string} className eg. Error, ParseError, DivisionByZeroError
         * @param {string|null=} message
         * @param {number|null=} code
         * @param {ObjectValue|null=} previousThrowable
         * @param {string=} filePath To override the file path
         * @param {number=} lineNumber To override the line number
         * @param {boolean=} reportsOwnContext Whether the error handles reporting its own file/line context
         * @returns {ObjectValue}
         */
        createErrorObject: function (
            className,
            message,
            code,
            previousThrowable,
            filePath,
            lineNumber,
            reportsOwnContext
        ) {
            var factory = this,
                errorObject = factory.globalNamespace.getClass(className).instantiate([
                    factory.createString(message || ''),
                    factory.createInteger(code || 0),
                    previousThrowable || factory.createNull()
                ]);

            if (reportsOwnContext) {
                errorObject.setInternalProperty('reportsOwnContext', true);
            }

            // File and line cannot be passed as constructor args,
            // so we need to manually set them here if specified

            if (filePath !== null && filePath !== undefined) {
                errorObject.setProperty('file', factory.createString(filePath));
            }

            if (lineNumber !== null && lineNumber !== undefined) {
                errorObject.setProperty('line', factory.createInteger(lineNumber));
            }

            return errorObject;
        },

        /**
         * Creates an ExitValue. This is a special type of value only returned as the result
         * of an `exit;` or `die;` statement being executed from PHP
         *
         * @param {Value} statusValue
         * @return {ExitValue}
         */
        createExit: function (statusValue) {
            var factory = this;

            return new ExitValue(factory, factory.callStack, statusValue);
        },

        /**
         * Creates a FloatValue
         *
         * @param {number} value
         * @return {FloatValue}
         */
        createFloat: function (value) {
            var factory = this;

            return new FloatValue(factory, factory.callStack, value);
        },

        /**
         * Coerces a native JavaScript value to a suitable *Value object,
         * based on its type. For example, a string primitive value from JS
         * will be coerced to a StringValue instance for PHP
         *
         * @param {*} nativeValue
         * @returns {Value}
         */
        createFromNative: function (nativeValue) {
            var factory = this;

            if (nativeValue === null || typeof nativeValue === 'undefined') {
                return factory.createNull();
            }

            if (_.isString(nativeValue)) {
                return factory.createString(nativeValue);
            }

            if (_.isNumber(nativeValue)) {
                return factory.createInteger(nativeValue);
            }

            if (_.isBoolean(nativeValue)) {
                return factory.createBoolean(nativeValue);
            }

            if (_.isArray(nativeValue)) {
                return factory.createFromNativeArray(nativeValue);
            }

            return factory.createFromNativeObject(nativeValue);
        },

        /**
         * Coerces a native JavaScript object to either an ArrayValue or ObjectValue object,
         * depending on its suitability to be cast as an associative array
         *
         * @param {object} nativeObject
         * @returns {ArrayValue|ObjectValue}
         */
        createFromNativeObject: function (nativeObject) {
            var factory = this,
                hasAMethod = false,
                orderedElements = [];

            if (nativeObject instanceof PHPObject) {
                // PHPObjects wrap instances of PHP classes when exported with .getProxy()
                return nativeObject.getObjectValue();
            }

            if (factory.valueStorage.hasObjectValueForExport(nativeObject)) {
                // Objects exported with .getNative() are mapped back to their original ObjectValue
                return factory.valueStorage.getObjectValueForExport(nativeObject);
            }

            // Handle plain objects -> associative arrays
            if (Object.getPrototypeOf(nativeObject) === Object.prototype) {
                _.forOwn(nativeObject, function (value) {
                    if (_.isFunction(value)) {
                        hasAMethod = true;
                        return false;
                    }
                });

                if (!hasAMethod) {
                    // Plain object has no methods: can be safely cast to an associative array
                    _.forOwn(nativeObject, function (value, key) {
                        orderedElements.push(new KeyValuePair(factory.coerce(key), factory.coerce(value)));
                    });

                    return factory.createArray(orderedElements);
                }

                // Plain object, but has methods: needs to be cast to a JSObject
            }

            return factory.createObject(nativeObject, factory.globalNamespace.getClass('JSObject'));
        },

        /**
         * Takes a native Array object and converts it to a wrapped ArrayValue for PHP
         *
         * @param {Array} nativeArray
         * @returns {ArrayValue}
         */
        createFromNativeArray: function (nativeArray) {
            var factory = this,
                orderedElements = [];

            _.each(nativeArray, function (value, index) {
                orderedElements[index] = value;
            });

            _.forOwn(nativeArray, function (value, key) {
                if (!isFinite(key) || key >= nativeArray.length) {
                    orderedElements.push(new KeyValuePair(factory.coerce(key), factory.coerce(value)));
                }
            });

            return factory.createArray(orderedElements);
        },

        /**
         * Creates an IntegerValue
         *
         * @param {number} value
         * @return {IntegerValue}
         */
        createInteger: function (value) {
            var factory = this;

            return new IntegerValue(factory, factory.callStack, value);
        },

        /**
         * Creates a NullValue
         *
         * Note that there is only ever a single instance of NullValue to save on memory usage.
         *
         * @return {NullValue}
         */
        createNull: function () {
            var factory = this;

            if (factory.nullValue === null) {
                factory.nullValue = new NullValue(factory, factory.callStack);
            }

            return factory.nullValue;
        },

        /**
         * Creates an ObjectValue for a given native value and class
         *
         * @param {object} nativeValue
         * @param {Class} classObject
         * @returns {ObjectValue}
         */
        createObject: function (nativeValue, classObject) {
            var factory = this;

            // Object ID tracking is incomplete: ID should be freed when all references are lost
            return new ObjectValue(
                factory,
                factory.callStack,
                factory.translator,
                nativeValue,
                classObject,
                factory.nextObjectID++
            );
        },

        /**
         * Creates an instance of the builtin stdClass class
         *
         * @return {ObjectValue}
         */
        createStdClassObject: function () {
            var factory = this;

            return factory.globalNamespace.getClass('stdClass').instantiate();
        },

        /**
         * Creates a StringValue
         *
         * @param {string} value
         * @return {StringValue}
         */
        createString: function (value) {
            var factory = this;

            return new StringValue(factory, factory.callStack, value);
        },

        /**
         * Creates an ObjectValue wrapping a PHP Error instance (eg. a call to an undefined method)
         *
         * @param {string} className eg. Error, ParseError, DivisionByZeroError
         * @param {string} translationKey
         * @param {Object.<string, string>=} placeholderVariables
         * @param {number|null=} code
         * @param {ObjectValue|null=} previousThrowable
         * @param {string=} filePath To override the file path
         * @param {number=} lineNumber To override the line number
         * @returns {ObjectValue}
         */
        createTranslatedErrorObject: function (
            className,
            translationKey,
            placeholderVariables,
            code,
            previousThrowable,
            filePath,
            lineNumber
        ) {
            var factory = this,
                message = factory.translator.translate(translationKey, placeholderVariables);

            return factory.createErrorObject(
                className,
                message,
                code,
                previousThrowable,
                filePath,
                lineNumber
            );
        },

        /**
         * Creates an ObjectValue wrapping a PHP Exception instance (eg. a RuntimeException)
         *
         * @param {string} className eg. Exception, LogicException, RuntimeException
         * @param {string} translationKey
         * @param {Object.<string, string>=} placeholderVariables
         * @param {number|null=} code
         * @param {ObjectValue|null=} previousThrowable
         * @returns {ObjectValue}
         */
        createTranslatedExceptionObject: function (
            className,
            translationKey,
            placeholderVariables,
            code,
            previousThrowable
        ) {
            var factory = this,
                message = factory.translator.translate(translationKey, placeholderVariables);

            return factory.instantiateObject(
                className,
                [
                    message,
                    code,
                    previousThrowable
                ]
            );
        },

        /**
         * Creates an ObjectValue instance of the specified class
         *
         * @param {string} className
         * @param {Array} constructorArgNatives
         * @returns {ObjectValue}
         */
        instantiateObject: function (className, constructorArgNatives) {
            var factory = this,
                constructorArgValues = _.map(constructorArgNatives, function (argNative) {
                    return factory.coerce(argNative);
                });

            return factory.globalNamespace.getClass(className).instantiate(constructorArgValues);
        },

        /**
         * Determines whether the given object is a PHP Value instance
         *
         * @param {Object} object
         * @return {boolean}
         */
        isValue: function (object) {
            return object instanceof Value;
        },

        /**
         * Sets the CallStack to use for created value objects
         *
         * @param {CallStack} callStack
         */
        setCallStack: function (callStack) {
            this.callStack = callStack;
        },

        /**
         * Sets the root/global namespace
         *
         * @param {Namespace} globalNamespace
         */
        setGlobalNamespace: function (globalNamespace) {
            this.globalNamespace = globalNamespace;
        }
    });

    return ValueFactory;
}, {strict: true});
