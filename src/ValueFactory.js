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
    require('phpcommon'),
    require('./Iterator/ArrayIterator'),
    require('./Value/Array'),
    require('./Value/BarewordString'),
    require('./Value/Boolean'),
    require('./Reference/Element/ElementProvider'),
    require('./Value/Exit'),
    require('./Value/Float'),
    require('./Value/Integer'),
    require('./KeyValuePair'),
    require('./Value/Null'),
    require('./Value/Object'),
    require('./PHPObject'),
    require('./Value/String'),
    require('./Value'),
    require('es6-weak-map')
], function (
    _,
    phpCommon,
    ArrayIterator,
    ArrayValue,
    BarewordStringValue,
    BooleanValue,
    ElementProvider,
    ExitValue,
    FloatValue,
    IntegerValue,
    KeyValuePair,
    NullValue,
    ObjectValue,
    PHPObject,
    StringValue,
    Value,
    WeakMap
) {
    /**
     * Creates Value and related objects
     *
     * @param {Resumable|null} pausable
     * @param {string} mode
     * @param {ElementProvider} elementProvider
     * @param {Translator} translator
     * @param {CallFactory} callFactory
     * @param {ErrorPromoter} errorPromoter
     * @constructor
     */
    function ValueFactory(
        pausable,
        mode,
        elementProvider,
        translator,
        callFactory,
        errorPromoter
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
         * @type {Resumable|null}
         */
        this.pausable = pausable;
        /**
         * @type {Translator}
         */
        this.translator = translator;
        /**
         * Used for mapping exported unwrapped objects back to their original ObjectValue
         * when they are passed back to PHP-land
         *
         * @type {WeakMap}
         */
        this.unwrappedObjectToValueMap = new WeakMap();
        /**
         * @type {WeakMap}
         */
        this.valueToUnwrappedObjectMap = new WeakMap();
    }

    _.extend(ValueFactory.prototype, {
        coerce: function (value) {
            if (value instanceof Value) {
                return value;
            }

            return this.createFromNative(value);
        },
        coerceObject: function (value) {
            var factory = this;

            if (value instanceof Value) {
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

        createBarewordString: function (value) {
            var factory = this;

            return new BarewordStringValue(factory, factory.callStack, value);
        },
        createBoolean: function (value) {
            var factory = this;

            return new BooleanValue(factory, factory.callStack, value);
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

        createExit: function (statusValue) {
            var factory = this;

            return new ExitValue(factory, factory.callStack, statusValue);
        },
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

            if (factory.unwrappedObjectToValueMap.has(nativeObject)) {
                // Objects exported with .getNative() are mapped back to their original ObjectValue
                return factory.unwrappedObjectToValueMap.get(nativeObject);
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
        createInteger: function (value) {
            var factory = this;

            return new IntegerValue(factory, factory.callStack, value);
        },
        createNull: function () {
            var factory = this;

            return new NullValue(factory, factory.callStack);
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
         * Creates a PHPObject, which wraps an ObjectValue and allows its methods
         * to be called and passed native values for its parameter arguments
         * and coerces its return value back to a native too.
         *
         * @param {ObjectValue} object
         * @returns {PHPObject}
         */
        createPHPObject: function (object) {
            var factory = this;

            return new PHPObject(
                factory.callFactory,
                factory.callStack,
                factory.errorPromoter,
                factory.pausable,
                factory.mode,
                factory,
                object
            );
        },

        createStdClassObject: function () {
            var factory = this;

            return factory.globalNamespace.getClass('stdClass').instantiate();
        },
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
         * Fetches the unwrapped object that an ObjectValue has been unwrapped to,
         * or returns null if there is no existing mapping
         *
         * @param objectValue
         * @returns {object|null}
         */
        getUnwrappedObjectFromValue: function (objectValue) {
            return this.valueToUnwrappedObjectMap.get(objectValue) || null;
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

        isValue: function (object) {
            return object instanceof Value;
        },
        /**
         * Allows an unwrapped object to later be mapped back to its original ObjectValue
         * (eg. when passed back to PHP-land from JS-land as a method argument)
         *
         * @param {object} unwrappedObject
         * @param {ObjectValue} objectValue
         */
        mapUnwrappedObjectToValue: function (unwrappedObject, objectValue) {
            var factory = this;

            factory.unwrappedObjectToValueMap.set(unwrappedObject, objectValue);
            factory.valueToUnwrappedObjectMap.set(objectValue, unwrappedObject);
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
