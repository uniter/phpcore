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
    phpCommon = require('phpcommon'),
    PHPError = phpCommon.PHPError,
    PHPFatalError = phpCommon.PHPFatalError,
    PHPParseError = phpCommon.PHPParseError;

/**
 * @param {PHPState} state
 * @constructor
 */
function Environment(state) {
    /**
     * @type {PHPState}
     */
    this.state = state;
}

_.extend(Environment.prototype, {
    /**
     * Defines the given alias for the given function
     *
     * @param {string} originalName
     * @param {string} aliasName
     */
    aliasFunction: function (originalName, aliasName) {
        this.state.aliasFunction(originalName, aliasName);
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
     * Defines a new class (in any namespace)
     *
     * @param {string} name FQCN for the class to define
     * @param {function} definitionFactory Called with `internals` object, returns the class definition
     */
    defineClass: function (name, definitionFactory) {
        this.state.defineClass(name, definitionFactory);
    },

    /**
     * Defines a global function from a native JS one. If a fully-qualified name is provided
     * with a namespace prefix, eg. `My\Lib\MyFunc` then it will be defined in the specified namespace
     *
     * @param {string} name
     * @param {Function} fn
     * @param {string=} signature Function signature (parameter and return type definitions)
     */
    defineCoercingFunction: function (name, fn, signature) {
        this.state.defineCoercingFunction(name, fn, signature);
    },

    /**
     * Defines a constant with the given native value
     *
     * @param {string} name
     * @param {*} value
     * @param {object} options
     */
    defineConstant: function (name, value, options) {
        this.state.defineConstant(name, value, options);
    },

    /**
     * Defines a new function (in any namespace).
     *
     * @param {string} name Fully-qualified name for the function to define
     * @param {function} definitionFactory Called with `internals` object, returns the function definition
     * @returns {Class} Returns the defined function
     */
    defineFunction: function (name, definitionFactory) {
        return this.state.defineFunction(name, definitionFactory);
    },

    /**
     * Defines a global variable and gives it the provided value
     *
     * @param {string} name
     * @param {Value} value
     */
    defineGlobal: function (name, value) {
        this.state.defineGlobal(name, value);
    },

    /**
     * Defines a global variable using a getter/setter pair.
     *
     * @param {string} name
     * @param {Function} valueGetter
     * @param {Function=} valueSetter
     * @param {Function=} unsetter
     * @param {Function=} referenceGetter
     * @param {Function=} referenceSetter
     * @param {Function=} referenceClearer
     * @param {Function=} definednessGetter
     * @param {Function=} readablenessGetter
     * @param {Function=} emptinessGetter
     * @param {Function=} setnessGetter
     * @param {Function=} referencenessGetter
     * @param {Function=} undefinednessRaiser
     */
    defineGlobalAccessor: function (
        name,
        valueGetter,
        valueSetter,
        unsetter,
        referenceGetter,
        referenceSetter,
        referenceClearer,
        definednessGetter,
        readablenessGetter,
        emptinessGetter,
        setnessGetter,
        referencenessGetter,
        undefinednessRaiser
    ) {
        this.state.defineGlobalAccessor(
            name,
            valueGetter,
            valueSetter,
            unsetter,
            referenceGetter,
            referenceSetter,
            referenceClearer,
            definednessGetter,
            readablenessGetter,
            emptinessGetter,
            setnessGetter,
            referencenessGetter,
            undefinednessRaiser
        );
    },

    /**
     * Defines a global function from a native JS one. If a fully-qualified name is provided
     * with a namespace prefix, eg. `My\Lib\MyFunc` then it will be defined in the specified namespace
     *
     * @param {string} name
     * @param {Function} fn
     * @param {string=} signature Function signature (parameter and return type definitions)
     */
    defineNonCoercingFunction: function (name, fn, signature) {
        this.state.defineNonCoercingFunction(name, fn, signature);
    },

    /**
     * Defines a global function from a native JS one. If a fully-qualified name is provided
     * with a namespace prefix, e.g. `My\Lib\MyFunc` then it will be defined in the specified namespace.
     * The function will install multiple variants whose signatures must differ in parameter count.
     *
     * @param {string} fqfn Fully-Qualified Function Name
     * @param {Function} definitionFactory
     */
    defineOverloadedFunction: function (fqfn, definitionFactory) {
        this.state.defineOverloadedFunction(fqfn, definitionFactory);
    },

    /**
     * Defines a super global variable (available in all scopes implicitly,
     * unlike a normal global which is not available unless imported with a `global` statement)
     * and gives it the provided value. If a native value is given then it will be coerced to a PHP one.
     *
     * @param {string} name
     * @param {Value|*} value
     */
    defineSuperGlobal: function (name, value) {
        this.state.defineSuperGlobal(name, value);
    },

    defineSuperGlobalAccessor: function (name, valueGetter, valueSetter) {
        this.state.defineSuperGlobalAccessor(name, valueGetter, valueSetter);
    },

    expose: function (object, name) {
        this.state.getGlobalScope().expose(object, name);
    },

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
     * Fetches the configured synchronicity mode.
     *
     * @returns {'async'|'psync'|'sync'}
     */
    getMode: function () {
        return this.state.getMode();
    },

    getOptions: function () {
        return this.state.getOptions();
    },

    getState: function () {
        return this.state;
    },

    getStderr: function () {
        return this.state.getStderr();
    },

    getStdin: function () {
        return this.state.getStdin();
    },

    getStdout: function () {
        return this.state.getStdout();
    },

    /**
     * Reports a PHPError (fatal or parse error) originating from the parser or transpiler
     *
     * @param {PHPError} error
     * @throws {Error} Throws if a non-PHPError is given
     */
    reportError: function (error) {
        var errorReporting = this.state.getErrorReporting();

        // Handle any PHP errors from the transpiler or parser using the ErrorReporting
        // mechanism for PHPCore (as INI settings such as `display_errors` should take effect)
        if (error instanceof PHPFatalError) {
            errorReporting.reportError(
                PHPError.E_ERROR,
                error.getMessage(),
                error.getFilePath(),
                error.getLineNumber(),
                null,
                false
            );
        } else if (error instanceof PHPParseError) {
            errorReporting.reportError(
                PHPError.E_PARSE,
                error.getMessage(),
                error.getFilePath(),
                error.getLineNumber(),
                null,
                false
            );
        } else {
            throw new Error('Invalid error type given');
        }
    },

    /**
     * Sets the value of an existing PHP global. If a native value is given
     * then it will be coerced to a PHP one.
     * If the global is not defined than an error will be thrown -
     * use .defineGlobal(...) when defining a new variable
     *
     * @param {string} name
     * @param {Value|*} value
     * @throws {Error} Throws if the variable is not defined in the global scope
     */
    setGlobal: function (name, value) {
        this.state.setGlobal(name, value);
    },

    /**
     * Takes the given proxy and returns a new one with a synchronous API,
     * even in Promise-synchronous mode
     *
     * @param {ProxyClass} proxy
     * @return {ProxyClass}
     */
    toNativeWithSyncApi: function (proxy) {
        return this.state.getFFIValueHelper().toNativeWithSyncApi(proxy);
    }
});

module.exports = Environment;
