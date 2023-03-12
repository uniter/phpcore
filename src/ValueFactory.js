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
    require('core-js-pure/actual/queue-microtask'),
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
    require('./Control/Pause'),
    require('./FFI/Value/PHPObject'),
    require('./Reference/Reference'),
    require('./Value/Resource'),
    require('./Value/String'),
    require('./Value'),
    require('./FFI/Value/ValueStorage'),
    require('./Variable')
], function (
    _,
    phpCommon,
    queueMicrotask,
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
    Pause,
    PHPObject,
    Reference,
    ResourceValue,
    StringValue,
    Value,
    ValueStorage,
    Variable
) {
    var Exception = phpCommon.Exception,
        createBoolean = function (factory, value) {
            return new BooleanValue(
                factory,
                factory.referenceFactory,
                factory.futureFactory,
                factory.callStack,
                factory.flow,
                value
            );
        },
        queueMacrotask = typeof requestIdleCallback !== 'undefined' ?
            function (callback) {
                requestIdleCallback(callback);
            } :
            function (callback) {
                setTimeout(callback, 1);
            };

    /**
     * Creates Value and related objects
     *
     * @param {string} mode
     * @param {Translator} translator
     * @param {CallFactory} callFactory
     * @param {ErrorPromoter} errorPromoter
     * @param {ValueStorage} valueStorage
     * @param {ControlBridge} controlBridge
     * @param {ControlScope} controlScope
     * @constructor
     */
    function ValueFactory(
        mode,
        translator,
        callFactory,
        errorPromoter,
        valueStorage,
        controlBridge,
        controlScope
    ) {
        /**
         * @type {CallFactory}
         */
        this.callFactory = callFactory;
        /**
         * @type {CallStack|null}
         */
        this.callStack = null;
        /**
         * Cache for the resolved Closure Class object, for FFI to save on expensive lookups.
         *
         * @type {Class|null}
         */
        this.closureClass = null;
        /**
         * @type {ControlBridge}
         */
        this.controlBridge = controlBridge;
        /**
         * @type {ControlScope}
         */
        this.controlScope = controlScope;
        /**
         * @type {ElementProvider}
         */
        this.elementProvider = null;
        /**
         * The single BooleanValue<false> for efficiency, created lazily in .createBoolean(...).
         * See notes for .nullValue.
         *
         * @type {BooleanValue|null}
         */
        this.falseValue = null;
        /**
         * @type {Flow|null}
         */
        this.flow = null;
        /**
         * @type {FutureFactory|null}
         */
        this.futureFactory = null;
        /**
         * Cache for the resolved JSObject Class object, for FFI to save on expensive lookups.
         *
         * @type {Class|null}
         */
        this.jsObjectClass = null;
        /**
         * Used for generating a unique ID for the next ObjectValue that is created
         * (shown in the output of var_dump(...), for example).
         *
         * @type {number}
         */
        this.nextObjectID = 1;
        /**
         * Used for generating a unique ID for the next ResourceValue that is created
         * (shown in the output of var_dump(...), for example).
         *
         * @type {number}
         */
        this.nextResourceID = 1;
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
         * @type {NumericStringParser|null}
         */
        this.numericStringParser = null;
        /**
         * @type {ReferenceFactory|null}
         */
        this.referenceFactory = null;
        /**
         * @type {Translator}
         */
        this.translator = translator;
        /**
         * The single BooleanValue<true> for efficiency, created lazily in .createBoolean(...).
         * See notes for .nullValue.
         *
         * @type {BooleanValue|null}
         */
        this.trueValue = null;
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

            if (factory.controlBridge.isFuture(value)) {
                return factory.deriveFuture(value);
            }

            if (value instanceof FFIResult) {
                // An FFI Result was returned, so we need to handle it as appropriate
                // (may result in a Future-wrapped Value in async mode).
                return value.resolve();
            }

            if (value instanceof Reference || value instanceof Variable) {
                return value.getValue();
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

            return factory.createBoxedJSObject(value);
        },

        /**
         * Creates the relevant numeric value type from the result of an arithmetic operation
         *
         * @param {FloatValue|IntegerValue} coercedLeftValue
         * @param {FloatValue|IntegerValue} coercedRightValue
         * @param {number} resultNative
         * @returns {FloatValue|IntegerValue}
         */
        createArithmeticResult: function (coercedLeftValue, coercedRightValue, resultNative) {
            var factory = this;

            if (
                coercedLeftValue.getType() === 'float' ||
                coercedRightValue.getType() === 'float' ||
                !Number.isInteger(resultNative) // TODO: Test me via *Value classes
            ) {
                return factory.createFloat(resultNative);
            }

            return factory.createInteger(resultNative);
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
                factory.referenceFactory,
                factory.futureFactory,
                factory.callStack,
                factory.flow,
                value,
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
         * Creates a new Future-wrapped Value whose executor is always called asynchronously in a macrotask
         * (macrotasks wait for the _next_ event loop tick, allowing DOM events to fire etc.).
         *
         * @param {Function} executor
         * @returns {FutureInterface<Value>}
         */
        createAsyncMacrotaskFuture: function (executor) {
            return this.createFuture(function (resolve, reject) {
                queueMacrotask(function () {
                    try {
                        executor(resolve, reject);
                    } catch (error) {
                        if (error instanceof Pause) {
                            throw new Exception('Unexpected Pause raised by Future executor');
                        }

                        // Any errors raised during evaluation of the Future executor should reject the Future.
                        reject(error);
                    }
                });
            });
        },

        /**
         * Creates a new Future-wrapped Value whose executor is always called asynchronously in a microtask
         * (microtasks are called at the end of the _current_ event loop tick, so any DOM events etc.
         * will not be fired in between).
         *
         * @param {Function} executor
         * @returns {FutureInterface<Value>}
         */
        createAsyncMicrotaskFuture: function (executor) {
            return this.createFuture(function (resolve, reject) {
                queueMicrotask(function () {
                    try {
                        executor(resolve, reject);
                    } catch (error) {
                        if (error instanceof Pause) {
                            throw new Exception('Unexpected Pause raised by Future executor');
                        }

                        // Any errors raised during evaluation of the Future executor should reject the Future.
                        reject(error);
                    }
                });
            });
        },

        /**
         * Creates a new Future-wrapped Value to be resolved with the given value after deferring.
         *
         * @param {*} value
         * @returns {FutureInterface<Value>}
         */
        createAsyncPresent: function (value) {
            return this.createFuture(function (resolve) {
                queueMicrotask(function () {
                    resolve(value);
                });
            });
        },

        /**
         * Creates a new Future-wrapped Value to be rejected with the given error after deferring.
         *
         * @param {Error} error
         * @returns {FutureInterface<Value>}
         */
        createAsyncRejection: function (error) {
            return this.createFuture(function (resolve, reject) {
                queueMicrotask(function () {
                    reject(error);
                });
            });
        },

        /**
         * Creates a BarewordStringValue
         *
         * @param {string} value
         * @param {NamespaceScope} namespaceScope
         * @return {BarewordStringValue}
         */
        createBarewordString: function (value, namespaceScope) {
            var factory = this;

            return new BarewordStringValue(
                factory,
                factory.referenceFactory,
                factory.futureFactory,
                factory.callStack,
                factory.flow,
                value,
                factory.globalNamespace,
                factory.numericStringParser,
                namespaceScope
            );
        },

        /**
         * Creates a BooleanValue.
         *
         * Note that there are only ever two instances of BooleanValue, to save on memory usage.
         *
         * @param {boolean} value
         * @return {BooleanValue}
         */
        createBoolean: function (value) {
            var factory = this;

            if (value) {
                if (factory.trueValue === null) {
                    factory.trueValue = createBoolean(factory, true);
                }

                return factory.trueValue;
            }

            if (factory.falseValue === null) {
                factory.falseValue = createBoolean(factory, false);
            }

            return factory.falseValue;
        },

        /**
         * Creates an ObjectValue instance of JSObject that wraps the given native object
         *
         * @param {Object} nativeObject
         * @returns {ObjectValue<JSObject>}
         */
        createBoxedJSObject: function (nativeObject) {
            var factory = this,
                jsObjectClass,
                objectValue;

            // TODO: Improve integration test coverage for this?
            if (factory.valueStorage.hasObjectValueForExport(nativeObject)) {
                objectValue = factory.valueStorage.getObjectValueForExport(nativeObject);
            } else {
                jsObjectClass = factory.jsObjectClass;

                // Cache the built-in JSObject Class instance for future lookups.
                if (!jsObjectClass) {
                    jsObjectClass = factory.globalNamespace.getClass('JSObject').yieldSync();

                    factory.jsObjectClass = jsObjectClass;
                }

                objectValue = factory.createObject(nativeObject, jsObjectClass);
                factory.valueStorage.setObjectValueForExport(nativeObject, objectValue);
            }

            return objectValue;
        },

        /**
         * Instantiates a PHP Closure instance with the given internal closure object
         *
         * @param {Closure} closure Internal closure object
         * @return {ObjectValue}
         */
        createClosureObject: function (closure) {
            var factory = this,
                closureClass = factory.closureClass;

            // Cache the built-in Closure Class instance for future lookups.
            if (!closureClass) {
                closureClass = factory.globalNamespace.getClass('Closure').yieldSync();

                factory.closureClass = closureClass;
            }

            return closureClass.instantiateWithInternals([], {
                'closure': closure
            });
        },

        /**
         * Creates an ObjectValue wrapping a PHP Error instance (e.g. a call to an undefined method)
         *
         * @param {string} className eg. Error, ParseError, DivisionByZeroError
         * @param {string|null=} message
         * @param {number|null=} code
         * @param {ObjectValue|null=} previousThrowable
         * @param {string|null=} filePath To override the file path - null explicitly overrides with "unknown"
         * @param {number|null=} lineNumber To override the line number - null explicitly overrides with "unknown"
         * @param {boolean=} reportsOwnContext Whether the error handles reporting its own file/line context
         * @param {string=} context Additional context to add to the end of the message when displayed
         * @param {boolean=} skipCurrentStackFrame Whether to skip the current stack frame for the trace
         * @returns {ChainableInterface<ObjectValue>}
         */
        createErrorObject: function (
            className,
            message,
            code,
            previousThrowable,
            filePath,
            lineNumber,
            reportsOwnContext,
            context,
            skipCurrentStackFrame
        ) {
            var factory = this;

            return factory.globalNamespace.getClass(className)
                .next(function (classObject) {
                    return classObject.instantiate([
                        factory.createString(message || ''),
                        factory.createInteger(code || 0),
                        previousThrowable || factory.createNull()
                    ], [
                        context,
                        Boolean(skipCurrentStackFrame)
                    ]);
                })
                .next(function (errorObject) {
                    // TODO: Pass all of these through to shadow constructor via above instead?
                    if (reportsOwnContext) {
                        errorObject.setInternalProperty('reportsOwnContext', true);
                    }

                    // File and line cannot be passed as constructor args,
                    // so we need to manually set them here if specified

                    if (filePath !== undefined) {
                        errorObject.setProperty(
                            'file',
                            filePath !== null ? factory.createString(filePath) : factory.createNull()
                        );
                    }

                    if (lineNumber !== undefined) {
                        errorObject.setProperty(
                            'line',
                            lineNumber !== null ? factory.createInteger(lineNumber) : factory.createNull()
                        );
                    }

                    return errorObject;
                });
        },

        /**
         * Creates an ExitValue. This is a special type of value only returned as the result
         * of an `exit;` or `die;` statement being executed from PHP
         *
         * @param {Value|null} statusValue
         * @return {ExitValue}
         */
        createExit: function (statusValue) {
            var factory = this;

            return new ExitValue(
                factory,
                factory.referenceFactory,
                factory.futureFactory,
                factory.callStack,
                factory.flow,
                statusValue
            );
        },

        /**
         * Creates a FloatValue
         *
         * @param {number} value
         * @return {FloatValue}
         */
        createFloat: function (value) {
            var factory = this;

            return new FloatValue(
                factory,
                factory.referenceFactory,
                factory.futureFactory,
                factory.callStack,
                factory.flow,
                value
            );
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
                return factory.createNumber(nativeValue);
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
                orderedElements;

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
                    orderedElements = [];

                    // Plain object has no methods: can be safely cast to an associative array
                    _.forOwn(nativeObject, function (value, key) {
                        orderedElements.push(new KeyValuePair(factory.coerce(key), factory.coerce(value)));
                    });

                    return factory.createArray(orderedElements);
                }

                // Plain object, but has methods: needs to be cast to a JSObject
            }

            return factory.createBoxedJSObject(nativeObject);
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
         * Creates a new Future-wrapped Value.
         *
         * @param {Function} executor
         * @returns {FutureInterface<Value>}
         */
        createFuture: function (executor) {
            var factory = this;

            return factory.futureFactory.createFuture(function (resolveFuture, rejectFuture, nestCoroutine) {
                executor(
                    function resolve(result) {
                        // For Future-wrapped Values, we always want to coerce the eventual result to a Value.
                        return resolveFuture(factory.coerce(result));
                    },
                    function reject(error) {
                        return rejectFuture(error);
                    },
                    nestCoroutine
                );
            });
        },

        /**
         * Creates a Future-wrapped Value (if required) as the start of a chain,
         * allowing for the initial result to be returned rather than having to call resolve().
         *
         * @param {Function} executor
         * @returns {ChainableInterface<Value>}
         */
        createFutureChain: function (executor) {
            var factory = this,
                result;

            try {
                result = executor();
            } catch (error) {
                return factory.createRejection(error);
            }

            return factory.coerce(result);
        },

        /**
         * Creates an IntegerValue
         *
         * @param {number} value
         * @return {IntegerValue}
         */
        createInteger: function (value) {
            var factory = this;

            return new IntegerValue(
                factory,
                factory.referenceFactory,
                factory.futureFactory,
                factory.callStack,
                factory.flow,
                value
            );
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
                factory.nullValue = new NullValue(
                    factory,
                    factory.referenceFactory,
                    factory.futureFactory,
                    factory.callStack,
                    factory.flow
                );
            }

            return factory.nullValue;
        },

        /**
         * Creates an IntegerValue if the native number given is an integer, otherwise a FloatValue
         *
         * @param {number} nativeValue
         * @returns {FloatValue|IntegerValue}
         */
        createNumber: function (nativeValue) {
            var factory = this;

            if (Math.floor(nativeValue) === nativeValue) {
                return factory.createInteger(nativeValue);
            }

            return factory.createFloat(nativeValue);
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
                factory.referenceFactory,
                factory.futureFactory,
                factory.callStack,
                factory.flow,
                factory.translator,
                nativeValue,
                classObject,
                factory.nextObjectID++
            );
        },

        /**
         * Creates a new present Future-wrapped Value with the given value.
         *
         * Note that in most cases this method should not be used, as a known "present" ChainableInterface
         * value should simply be returned directly and not wrapped as a Future.
         *
         * @param {Value} value
         * @returns {FutureInterface<Value>}
         */
        createPresent: function (value) {
            return this.createFuture(function (resolve) {
                resolve(value);
            });
        },

        /**
         * Creates a new Rejection for the given error
         *
         * @param {Error} error
         * @returns {Rejection}
         */
        createRejection: function (error) {
            return this.createFuture(function (resolve, reject) {
                reject(error);
            });
        },

        /**
         * Creates a ResourceValue for a given type and inner resource data object.
         *
         * @param {string} type
         * @param {Object} resource
         * @returns {ResourceValue}
         */
        createResource: function (type, resource) {
            var factory = this;

            return new ResourceValue(
                factory,
                factory.referenceFactory,
                factory.futureFactory,
                factory.callStack,
                factory.flow,
                resource,
                type,
                factory.nextResourceID++
            );
        },

        /**
         * Creates an instance of the builtin stdClass class.
         *
         * @return {ChainableInterface<ObjectValue>}
         */
        createStdClassObject: function () {
            var factory = this;

            return factory.globalNamespace.getClass('stdClass').yieldSync().instantiate();
        },

        /**
         * Creates a StringValue
         *
         * @param {string} value
         * @return {StringValue}
         */
        createString: function (value) {
            var factory = this;

            return new StringValue(
                factory,
                factory.referenceFactory,
                factory.futureFactory,
                factory.callStack,
                factory.flow,
                value,
                factory.globalNamespace,
                factory.numericStringParser
            );
        },

        /**
         * Creates an ObjectValue wrapping a PHP Error instance (eg. a call to an undefined method).
         *
         * @param {string} className eg. Error, ParseError, DivisionByZeroError
         * @param {string} translationKey
         * @param {Object.<string, string>=} placeholderVariables
         * @param {number|null=} code
         * @param {ObjectValue|null=} previousThrowable
         * @param {string=} filePath To override the file path
         * @param {number=} lineNumber To override the line number
         * @returns {ChainableInterface<ObjectValue>}
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
         * Creates an ObjectValue wrapping a PHP Exception instance (eg. a RuntimeException).
         *
         * @param {string} className eg. Exception, LogicException, RuntimeException
         * @param {string} translationKey
         * @param {Object.<string, string>=} placeholderVariables
         * @param {number|null=} code
         * @param {ObjectValue|null=} previousThrowable
         * @returns {ChainableInterface<ObjectValue>}
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
         * Derives a new Future-wrapped Value from an existing Future.
         *
         * @param {FutureInterface} future
         * @returns {FutureInterface<Value>}
         */
        deriveFuture: function (future) {
            // Note that .createFuture(...) will coerce the result (if resolved) to a Value.
            return this.createFuture(function (resolve, reject) {
                // Use .nextIsolated() rather than .next() to avoid creating a further Future just for chaining.
                future.nextIsolated(resolve, reject);
            });
        },

        /**
         * Creates an ObjectValue instance of the specified class.
         *
         * @param {string} className
         * @param {Array} constructorArgNatives
         * @returns {ChainableInterface<ObjectValue>}
         */
        instantiateObject: function (className, constructorArgNatives) {
            var factory = this,
                constructorArgValues = _.map(constructorArgNatives, function (argNative) {
                    return factory.coerce(argNative);
                });

            return factory.globalNamespace.getClass(className)
                .next(function (classObject) {
                    return classObject.instantiate(constructorArgValues);
                });
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
         * Sets the ElementProvider.
         *
         * @param {ElementProvider} elementProvider
         */
        setElementProvider: function (elementProvider) {
            this.elementProvider = elementProvider;
        },

        /**
         * Sets the Flow service.
         *
         * @param {Flow} flow
         */
        setFlow: function (flow) {
            this.flow = flow;
        },

        /**
         * Sets the FutureFactory
         *
         * @param {FutureFactory} futureFactory
         */
        setFutureFactory: function (futureFactory) {
            this.futureFactory = futureFactory;
        },

        /**
         * Sets the root/global namespace
         *
         * @param {Namespace} globalNamespace
         */
        setGlobalNamespace: function (globalNamespace) {
            this.globalNamespace = globalNamespace;
        },

        /**
         * Sets the NumericStringParser service.
         *
         * @param {NumericStringParser} numericStringParser
         */
        setNumericStringParser: function (numericStringParser) {
            this.numericStringParser = numericStringParser;
        },

        /**
         * Sets the ReferenceFactory
         *
         * @param {ReferenceFactory} referenceFactory
         */
        setReferenceFactory: function (referenceFactory) {
            this.referenceFactory = referenceFactory;
        }
    });

    return ValueFactory;
}, {strict: true});
