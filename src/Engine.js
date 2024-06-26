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
    PATH = 'path',
    Promise = require('lie'),
    Value = require('./Value').sync();

/**
 * Executes a transpiled PHP module
 *
 * @param {Environment} environment PHPCore environment to execute inside
 * @param {Scope|null} topLevelScope Scope for the top-level statements of the module
 * @param {Object} phpCommon
 * @param {Object} options Configuration options for this engine
 * @param {Function} wrapper The wrapper function for the transpiled PHP module
 * @param {string} mode
 * @constructor
 */
function Engine(
    environment,
    topLevelScope,
    phpCommon,
    options,
    wrapper,
    mode
) {
    /**
     * @type {Environment}
     */
    this.environment = environment;
    /**
     * @type {string}
     */
    this.mode = mode;
    /**
     * @type {object}
     */
    this.options = _.extend(
        {
            'path': null
        },
        options || {}
    );
    /**
     * @type {Object}
     */
    this.phpCommon = phpCommon;
    /**
     * @type {Scope|null}
     */
    this.topLevelScope = topLevelScope || null;
    /**
     * @type {Function}
     */
    this.wrapper = wrapper;
}

_.extend(Engine.prototype, {
    /**
     * Defines the given alias for the given function
     *
     * @param {string} originalName
     * @param {string} aliasName
     */
    aliasFunction: function (originalName, aliasName) {
        this.environment.aliasFunction(originalName, aliasName);
    },

    /**
     * Creates a new FFI Result, to provide the result of a call to a JS function
     *
     * @param {Function} syncCallback
     * @param {Function|null} asyncCallback
     * @returns {FFIResult}
     */
    createFFIResult: function (syncCallback, asyncCallback) {
        return this.environment.createFFIResult(syncCallback, asyncCallback);
    },

    /**
     * Defines a new class (in any namespace).
     * Note that the class will be defined on the current engine's environment,
     * so any other engines that share this environment will also see the new class
     *
     * @param {string} name FQCN for the class to define
     * @param {function} definitionFactory Called with `internals` object, returns the class definition
     */
    defineClass: function (name, definitionFactory) {
        this.environment.defineClass(name, definitionFactory);
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
        this.environment.defineCoercingFunction(name, fn, signature);
    },

    /**
     * Defines a constant with the given native value
     *
     * @param {string} name
     * @param {*} value
     * @param {object} options
     */
    defineConstant: function (name, value, options) {
        this.environment.defineConstant(name, value, options);
    },

    /**
     * Defines a new function (in any namespace).
     * Note that the function will be defined on the current engine's environment,
     * so any other engines that share this environment will also see the new function
     *
     * @param {string} name Fully-qualified name for the function to define
     * @param {function} definitionFactory Called with `internals` object, returns the function definition
     * @returns {Class} Returns the defined function
     */
    defineFunction: function (name, definitionFactory) {
        return this.environment.defineFunction(name, definitionFactory);
    },

    /**
     * Defines a global variable and gives it the provided value
     *
     * @param {string} name
     * @param {*} nativeValue
     */
    defineGlobal: function (name, nativeValue) {
        var engine = this,
            valueFactory = engine.environment.getState().getValueFactory(),
            value = valueFactory.coerce(nativeValue);

        engine.environment.defineGlobal(name, value);
    },

    /**
     * Defines a global variable using a getter/setter pair and other optional callbacks.
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
        this.environment.defineGlobalAccessor(
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
        this.environment.defineNonCoercingFunction(name, fn, signature);
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
        this.environment.defineOverloadedFunction(fqfn, definitionFactory);
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
        this.environment.defineSuperGlobal(name, value);
    },

    defineSuperGlobalAccessor: function (name, valueGetter, valueSetter) {
        this.environment.defineSuperGlobalAccessor(name, valueGetter, valueSetter);
    },

    /**
     * Executes this PHP script, returning either its resulting value if in synchronous mode
     * or a Promise if in asynchronous mode that will later be resolved with its resulting value
     * (from a top-level `return` statement, if any - otherwise defaulting to null)
     *
     * @returns {Promise|Value}
     */
    execute: function __uniterInboundStackMarker__() {
        var callFactory,
            callStack,
            core,
            coreFactory,
            engine = this,
            environment = engine.environment,
            errorReporting,
            globalNamespace,
            globalScope,
            mode = engine.mode,
            module,
            moduleFactory,
            options = engine.options,
            path = options[PATH],
            isMainProgram = engine.topLevelScope === null,
            phpCommon = engine.phpCommon,
            PHPError = phpCommon.PHPError,
            PHPParseError = phpCommon.PHPParseError,
            resultValue,
            scopeFactory,
            state,
            wrapper = engine.wrapper,
            userland,
            topLevelNamespaceScope,
            topLevelScope,
            valueProvider;

        state = environment.getState();
        callFactory = state.getCallFactory();
        coreFactory = state.getCoreFactory();
        errorReporting = state.getErrorReporting();
        moduleFactory = state.getModuleFactory();
        scopeFactory = state.getScopeFactory();
        globalNamespace = state.getGlobalNamespace();
        callStack = state.getCallStack();
        globalScope = state.getGlobalScope();
        userland = state.getUserland();
        valueProvider = state.getValueProvider();
        // Use the provided top-level scope if specified, otherwise use the global scope
        // (used eg. when an `include(...)` is used inside a function)
        topLevelScope = scopeFactory.createEngineScope(engine.topLevelScope || globalScope);
        module = moduleFactory.create(globalNamespace, path);
        topLevelNamespaceScope = module.getTopLevelNamespaceScope();

        core = coreFactory.createCore(topLevelScope);

        // We are entering PHP-land from JS-land.
        topLevelScope.enterCoroutine();

        // Push the call for this scope onto the stack (the "main" top-level one initially,
        // then for a load such as include or eval it will be its top-level scope)
        callStack.push(callFactory.create(topLevelScope, topLevelNamespaceScope));

        function handleError(error) {
            var errorValue,
                trace;

            if (error instanceof Value && error.getType() === 'exit') {
                return error;
            }

            if (error instanceof Value && error.getType() === 'object') {
                if (!isMainProgram) {
                    // For included files/eval etc., just pass the Throwable up the call stack
                    throw error;
                }

                errorValue = error;
                error = errorValue.coerceToNativeError();
                trace = errorValue.getInternalProperty('trace');

                if (error instanceof PHPParseError) {
                    // ParseErrors are special - when they reach the top level scope,
                    // if nothing has caught them then they are displayed as
                    // "PHP Parse error: ..." rather than "PHP Fatal error: Uncaught ParseError ..."
                    errorReporting.reportError(
                        PHPError.E_PARSE,
                        errorValue.getProperty('message').getNative(),
                        errorValue.getProperty('file').getNative(),
                        errorValue.getProperty('line').getNative(),
                        trace,
                        false
                    );
                } else {
                    errorReporting.reportError(
                        PHPError.E_ERROR,
                        error.getMessage(),
                        errorValue.getProperty('file').getNative(),
                        errorValue.getProperty('line').getNative(),
                        trace,
                        errorValue.getInternalProperty('reportsOwnContext')
                    );
                }

                throw error;
            }

            if (error instanceof PHPError) {
                // Some fatal errors are not catchable

                if (isMainProgram) {
                    errorReporting.reportError(
                        PHPError.E_ERROR,
                        error.getMessage(),
                        error.getFilePath(),
                        error.getLineNumber(),
                        null,
                        false
                    );
                }

                throw error;
            }

            // Otherwise it must be a native/internal JS error
            if (isMainProgram) {
                /*
                 * TODO: Improve native error handling. Perhaps native errors (except for Uniter's
                 *       internal Exceptions, once all either use or extend that class?) should
                 *       be catchable as a special JSError PHP class that implements Throwable,
                 *       leaving any uncaught ones to be reported by the existing uncaught handling
                 */
                errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Native JavaScript error: ' + error.message,
                    error.fileName || null,  // Firefox only
                    error.lineNumber || null // Firefox only
                );
            }

            throw error;
        }

        /**
         * Top-level entrypoint passed to Userland for all synchronicity modes.
         *
         * @returns {Reference|Value|Variable}
         */
        function topLevel() {
            return wrapper(core);
        }

        /**
         * Wraps the main program's result in a public FFI ResultValue.
         *
         * @param {Value} internalResultValue
         * @returns {ResultValue|Value}
         */
        function createResultValue(internalResultValue) {
            return isMainProgram ?
                valueProvider.createResultValue(internalResultValue) :
                internalResultValue;
        }

        // Asynchronous mode
        if (mode === 'async') {
            return userland
                .enterTopLevel(topLevel, topLevelNamespaceScope)
                .then(function (resultValue) {
                    // Pop the top-level scope (of the include, if this module was included) off the stack
                    // regardless of whether an error occurred
                    callStack.pop();

                    return createResultValue(resultValue).toPromise();
                })
                .catch(function (error) {
                    var result;

                    // Pop the top-level scope (of the include, if this module was included) off the stack
                    // regardless of whether an error occurred
                    callStack.pop();

                    result = handleError(error);

                    return createResultValue(result).toPromise();
                });
        }

        // Otherwise load the module synchronously
        // TODO: Improve Userland for sync behavior to avoid branching here?
        try {
            try {
                resultValue = createResultValue(userland.enterTopLevel(topLevel, topLevelNamespaceScope))
                    .yieldSync();

                return mode === 'psync' && isMainProgram ?
                    // Promise-sync mode - return a promise resolved with the result
                    Promise.resolve(resultValue) :

                    // Sync mode - just return the result, with no Promise involved
                    resultValue;
            } finally {
                // Pop the top-level scope (of the include, if this module was included) off the stack
                // regardless of whether an error occurred
                callStack.pop();
            }
        } catch (error) {
            if (mode === 'psync' && isMainProgram) {
                // Promise-sync mode - return a promise...

                return new Promise(function (resolve) {
                    var resultValue = handleError(error);

                    // Otherwise if it was a special ExitValue, resolve with it
                    resolve(
                        createResultValue(resultValue)
                            .yieldSync()
                    );
                });
            }

            return handleError(error);
        }
    },

    /**
     * Exposes a JS object as a global PHP variable.
     *
     * @deprecated Use .defineGlobal(...) or .defineGlobalAccessor(...) instead.
     *
     * @param {object} object
     * @param {string} name
     */
    expose: function (object, name) {
        this.environment.expose(object, name);
    },

    getConstant: function (name) {
        return this.environment.getConstant(name);
    },

    /**
     * Fetches the value of a global variable, if defined.
     * If the variable is not defined then a NULL value will be returned.
     *
     * @param {string} name
     * @return {Value}
     */
    getGlobal: function (name) {
        return this.environment.getGlobal(name);
    },

    getStderr: function () {
        return this.environment.getStderr();
    },

    getStdin: function () {
        return this.environment.getStdin();
    },

    getStdout: function () {
        return this.environment.getStdout();
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
        this.environment.setGlobal(name, value);
    },

    /**
     * Takes the given proxy and returns a new one with a synchronous API,
     * even in Promise-synchronous mode
     *
     * @param {ProxyClass} proxy
     * @return {ProxyClass}
     */
    toNativeWithSyncApi: function (proxy) {
        return this.environment.toNativeWithSyncApi(proxy);
    }
});

module.exports = Engine;
