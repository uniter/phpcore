/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

/**
 * @param {string} mode Synchronicity mode: "async", "psync" or "sync"
 * @param {Resumable|null} pausable
 * @param {ValueFactory} valueFactory
 * @param {CallFactory} callFactory
 * @param {CallStack} callStack
 * @param {ValueHelper} valueHelper
 * @param {ClassAutoloader} classAutoloader
 * @param {ErrorConfiguration} errorConfiguration
 * @param {ErrorPromoter} errorPromoter
 * @param {ErrorReporting} errorReporting
 * @param {Namespace} globalNamespace,
 * @param {Scope} globalScope,
 * @param {INIState} iniState,
 * @param {OptionSet} optionSet,
 * @param {Output} output,
 * @param {Runtime} runtime,
 * @param {Stream} stdout,
 * @param {TraceFormatter} traceFormatter,
 * @param {Translator} translator,
 * @param {PHPState} state
 * @constructor
 */
function Internals(
    mode,
    pausable,
    valueFactory,
    callFactory,
    callStack,
    valueHelper,
    classAutoloader,
    errorConfiguration,
    errorPromoter,
    errorReporting,
    globalNamespace,
    globalScope,
    iniState,
    optionSet,
    output,
    runtime,
    stdout,
    traceFormatter,
    translator,
    state
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
     * @type {OptionSet}
     */
    this.optionSet = optionSet;
    /**
     * @public
     * @type {Output}
     */
    this.output = output;
    /**
     * @public
     * @type {Resumable|null}
     */
    this.pausable = pausable;
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
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @public
     * @type {ValueHelper}
     */
    this.valueHelper = valueHelper;

    // Sanity check
    if (mode === 'async' && !pausable) {
        throw new Error('Pausable is required for async mode');
    }
}

_.extend(Internals.prototype, {
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
    }
});

module.exports = Internals;
