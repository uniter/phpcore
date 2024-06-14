/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    OverloadedTypedFunction = require('../../Function/Overloaded/OverloadedTypedFunction'),
    TypedFunction = require('../../Function/TypedFunction');

/**
 * @param {string} mode Synchronicity mode: "async", "psync" or "sync"
 * @param {Userland} userland
 * @param {Flow} flow
 * @param {ControlScope} controlScope
 * @param {Includer} includer
 * @param {OnceIncluder} onceIncluder
 * @param {Evaluator} evaluator
 * @param {ValueFactory} valueFactory
 * @param {ValueProvider} valueProvider
 * @param {ReferenceFactory} referenceFactory
 * @param {ControlFactory} controlFactory
 * @param {FutureFactory} futureFactory
 * @param {CallFactory} callFactory
 * @param {CallStack} callStack
 * @param {ValueHelper} valueHelper
 * @param {ClassAutoloader} classAutoloader
 * @param {ErrorConfiguration} errorConfiguration
 * @param {ErrorPromoter} errorPromoter
 * @param {ErrorReporting} errorReporting
 * @param {GarbageCollector} garbageCollector
 * @param {Namespace} globalNamespace
 * @param {Scope} globalScope
 * @param {INIState} iniState
 * @param {OptionSet} optionSet
 * @param {Output} output
 * @param {Runtime} runtime
 * @param {Stream} stdout
 * @param {TraceFormatter} traceFormatter
 * @param {Translator} translator
 * @param {PHPState} state
 * @param {Environment} environment
 * @constructor
 */
function Internals(
    mode,
    userland,
    flow,
    controlScope,
    includer,
    onceIncluder,
    evaluator,
    valueFactory,
    valueProvider,
    referenceFactory,
    controlFactory,
    futureFactory,
    callFactory,
    callStack,
    valueHelper,
    classAutoloader,
    errorConfiguration,
    errorPromoter,
    errorReporting,
    garbageCollector,
    globalNamespace,
    globalScope,
    iniState,
    optionSet,
    output,
    runtime,
    stdout,
    traceFormatter,
    translator,
    state,
    environment
) {
    /**
     * @public
     * @type {CallFactory}
     */
    this.callFactory = callFactory;
    /**
     * @public
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @public
     * @type {ClassAutoloader}
     */
    this.classAutoloader = classAutoloader;
    /**
     * @public
     * @type {ControlFactory}
     */
    this.controlFactory = controlFactory;
    /**
     * @public
     * @type {ControlScope}
     */
    this.controlScope = controlScope;
    /**
     * @public
     * @type {Environment}
     */
    this.environment = environment;
    /**
     * @public
     * @type {ErrorConfiguration}
     */
    this.errorConfiguration = errorConfiguration;
    /**
     * @public
     * @type {ErrorPromoter}
     */
    this.errorPromoter = errorPromoter;
    /**
     * @public
     * @type {ErrorReporting}
     */
    this.errorReporting = errorReporting;
    /**
     * @public
     * @type {Evaluator}
     */
    this.evaluator = evaluator;
    /**
     * @public
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @public
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @public
     * @type {GarbageCollector}
     */
    this.garbageCollector = garbageCollector;
    /**
     * @public
     * @type {Namespace}
     */
    this.globalNamespace = globalNamespace;
    /**
     * @public
     * @type {Scope}
     */
    this.globalScope = globalScope;
    /**
     * @public
     * @type {Includer}
     */
    this.includer = includer;
    /**
     * @public
     * @type {INIState}
     */
    this.iniState = iniState;
    /**
     * @public
     * @type {string}
     */
    this.mode = mode;
    /**
     * @public
     * @type {OnceIncluder}
     */
    this.onceIncluder = onceIncluder;
    /**
     * @public
     * @type {OptionSet}
     */
    this.optionSet = optionSet;
    /**
     * @public
     * @type {Output}
     */
    this.output = output;
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
    /**
     * @public
     * @type {Runtime}
     */
    this.runtime = runtime;
    /**
     * @public
     * @type {PHPState}
     */
    this.state = state;
    /**
     * @public
     * @type {Stream}
     */
    this.stdout = stdout;
    /**
     * @public
     * @type {TraceFormatter}
     */
    this.traceFormatter = traceFormatter;
    /**
     * @public
     * @type {Translator}
     */
    this.translator = translator;
    /**
     * @public
     * @type {Userland}
     */
    this.userland = userland;
    /**
     * @public
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @public
     * @type {ValueHelper}
     */
    this.valueHelper = valueHelper;
    /**
     * @public
     * @type {ValueProvider}
     */
    this.valueProvider = valueProvider;
}

_.extend(Internals.prototype, {
    /**
     * Creates a new Future-wrapped Value whose executor is always called asynchronously in a macrotask.
     *
     * @param {Function} executor
     * @returns {FutureInterface<Value>}
     */
    createAsyncMacrotaskFutureValue: function (executor) {
        return this.valueFactory.createAsyncMacrotaskFuture(executor);
    },

    /**
     * Creates a new Future-wrapped Value whose executor is always called asynchronously in a microtask.
     *
     * @param {Function} executor
     * @returns {FutureInterface<Value>}
     */
    createAsyncMicrotaskFutureValue: function (executor) {
        return this.valueFactory.createAsyncMicrotaskFuture(executor);
    },

    /**
     * Creates a new Future to be resolved with the given value after deferring.
     *
     * @param {*} value
     * @returns {FutureInterface}
     */
    createAsyncPresent: function (value) {
        return this.futureFactory.createAsyncPresent(value);
    },

    /**
     * Creates a new Future-wrapped Value to be resolved with the given value after deferring.
     *
     * @param {*} value
     * @returns {FutureInterface<Value>}
     */
    createAsyncPresentValue: function (value) {
        return this.valueFactory.createAsyncPresent(value);
    },

    /**
     * Creates a new Future to be rejected with the given error after deferring.
     *
     * @param {Error} error
     * @returns {FutureInterface}
     */
    createAsyncRejection: function (error) {
        return this.futureFactory.createAsyncRejection(error);
    },

    /**
     * Creates a new FFI Result, to provide the result of a call to a JS function
     *
     * @param {Function} syncCallback
     * @param {Function|null} asyncCallback
     * @returns {FFIResult}
     */
    createFFIResult: function (syncCallback, asyncCallback) {
        return this.state.createFFIResult(syncCallback, asyncCallback);
    },

    /**
     * Creates a Future.
     *
     * @param {Function} executor
     * @returns {FutureInterface}
     */
    createFuture: function (executor) {
        return this.futureFactory.createFuture(executor);
    },

    /**
     * Creates a Future-wrapped Value.
     *
     * @param {Function} executor
     * @returns {FutureInterface<Value>}
     */
    createFutureValue: function (executor) {
        return this.valueFactory.createFuture(executor);
    },

    /**
     * Creates a present Future.
     *
     * @param {*} value
     * @returns {FutureInterface}
     */
    createPresent: function (value) {
        return this.futureFactory.createPresent(value);
    },

    /**
     * Creates a present Future-wrapped Value. Note that this will always result in a Future,
     * rather than potentially a Value (which is when ChainableInterface<Value> would be typed).
     *
     * @param {Value} value
     * @returns {FutureInterface<Value>}
     */
    createPresentValue: function (value) {
        return this.valueFactory.createPresent(value);
    },

    /**
     * Creates a rejected Future.
     *
     * @param {Error} error
     * @returns {FutureInterface}
     */
    createRejection: function (error) {
        return this.futureFactory.createRejection(error);
    },

    /**
     * Fetches a binding by its name
     *
     * @param {string} bindingName
     * @returns {*}
     */
    getBinding: function (bindingName) {
        return this.state.getBinding(bindingName);
    },

    /**
     * Fetches the native value of a constant by its name
     *
     * @param {string} name
     * @returns {*}
     */
    getConstant: function (name) {
        return this.state.getConstant(name);
    },

    /**
     * Fetches the value of a global variable, if defined.
     * If the variable is not defined then a NULL value will be returned.
     *
     * @param {string} name
     * @return {Value}
     */
    getGlobal: function (name) {
        return this.state.getGlobal(name);
    },

    /**
     * Fetches a defined service by its ID.
     *
     * @param {string} id
     * @returns {*}
     */
    getService: function (id) {
        return this.state.getService(id);
    },

    /**
     * Implicitly converts undefined variables/references and those containing null to arrays.
     *
     * @param {Reference|Value|Variable} arrayReference
     * @returns {ChainableInterface<Value>}
     */
    implyArray: function (arrayReference) {
        var internals = this,
            maybePresentValue,
            needsArrayAssignmentFuture;

        if (!arrayReference.isDefined()) {
            // Note that if the reference is not defined, it may still be non-empty,
            // if for example it is a virtual property fetched with ->__get().
            needsArrayAssignmentFuture = arrayReference.isEmpty();
        } else {
            maybePresentValue = arrayReference.getValue();

            if (internals.valueFactory.isValue(maybePresentValue) && maybePresentValue.getType() === 'array') {
                // Fastest case: value is present and already an array, just return.
                return maybePresentValue;
            }

            needsArrayAssignmentFuture = maybePresentValue
                .next(function (presentValue) {
                    return presentValue.getType() === 'null';
                });
        }

        return needsArrayAssignmentFuture
            .next(function (needsArrayAssignment) {
                var arrayValue;

                if (needsArrayAssignment) {
                    arrayValue = internals.valueFactory.createArray([]);

                    return internals.valueFactory.isValue(arrayReference) ?
                        arrayValue :
                        arrayReference.setValue(arrayValue);
                }

                return arrayReference.getValue();
            });
    },

    /**
     * Determines whether we're in true asynchronous mode (not psync or sync mode)
     *
     * @return {boolean}
     */
    isAsync: function () {
        return this.mode === 'async';
    },

    /**
     * Determines whether we're in Promise-synchronous mode
     *
     * @return {boolean}
     */
    isPsync: function () {
        return this.mode === 'psync';
    },

    /**
     * Determines whether we're in synchronous mode
     *
     * @return {boolean}
     */
    isSync: function () {
        return this.mode === 'sync';
    },

    /**
     * Sets the value of an existing PHP global. If a native value is given
     * then it will be coerced to a PHP one.
     * If the global is not defined than an error will be thrown -
     * use .defineGlobal(...) when defining a new variable
     *
     * @param {string} name
     * @param {Value|*} value Value object or native value to be coerced
     * @throws {Error} Throws if the variable is not defined in the global scope
     */
    setGlobal: function (name, value) {
        this.state.setGlobal(name, value);
    },

    /**
     * Creates a native function definition with type information.
     *
     * @param {string} signature
     * @param {Function} func
     * @returns {TypedFunction}
     */
    typeFunction: function (signature, func) {
        return new TypedFunction(signature, func);
    },

    /**
     * Creates an OverloadedTypedFunction.
     * Use .typeFunction(...) to construct each of the typed functions per parameter count.
     *
     * @param {TypedFunction[]} typedFunctions
     * @returns {OverloadedTypedFunction}
     */
    typeOverloadedFunction: function (typedFunctions) {
        return new OverloadedTypedFunction(typedFunctions);
    }
});

module.exports = Internals;
