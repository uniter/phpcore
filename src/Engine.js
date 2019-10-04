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
    ExitValueWrapper = require('./Value/Exit'),
    FFIResult = require('./FFI/Result'),
    ObjectValueWrapper = require('./Value/Object'),
    Promise = require('lie'),
    ToolsWrapper = require('./Tools');

/**
 * Executes a transpiled PHP module
 *
 * @param {Environment} environment PHPCore environment to execute inside
 * @param {Scope} topLevelScope Scope for the top-level statements of the module
 * @param {Object} phpCommon
 * @param {Object} options Configuration options for this engine
 * @param {Function} wrapper The wrapper function for the transpiled PHP module
 * @param {Resumable|null} pausable Pausable library for async mode, null for psync or sync modes
 * @param {string} mode
 * @constructor
 */
function Engine(
    environment,
    topLevelScope,
    phpCommon,
    options,
    wrapper,
    pausable,
    mode
) {
    // Check the mode given is valid
    if (mode !== 'async' && mode !== 'psync' && mode !== 'sync') {
        throw new Error('Invalid mode "' + mode + '" given - must be one of "async", "psync" or "sync"');
    }

    // For async mode we require the Pausable library to be available
    if (mode === 'async' && !pausable) {
        throw new Error('Pausable library must be provided for async mode');
    }

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
     * @type {Resumable}
     */
    this.pausable = pausable;
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
     * Creates a new FFI Result, to provide the result of a call to a JS function
     *
     * @param {Function} syncCallback
     * @param {Function|null} asyncCallback
     * @returns {FFIResult}
     */
    createFFIResult: function (syncCallback, asyncCallback) {
        return new FFIResult(syncCallback, asyncCallback);
    },

    /**
     * Creates a Pause object for use in async mode
     *
     * @returns {PauseException}
     */
    createPause: function () {
        var engine = this;

        if (!engine.pausable) {
            throw new Error('Pausable is not available');
        }

        return engine.pausable.createPause();
    },

    /**
     * Defines a new class (in any namespace).
     * Note that the class will be defined on the current engine's environment,
     * so any other engines that share this environment will also see the new class
     *
     * @param {string} name FQCN for the class to define
     * @param {function} definitionFactory Called with `internals` object, returns the class definition
     * @returns {Class} Returns the instance of Class that represents a PHP class
     */
    defineClass: function (name, definitionFactory) {
        return this.environment.defineClass(name, definitionFactory);
    },

    /**
     * Defines a global function from a native JS one. If a fully-qualified name is provided
     * with a namespace prefix, eg. `My\Lib\MyFunc` then it will be defined in the specified namespace
     *
     * @param {string} name
     * @param {Function} fn
     */
    defineCoercingFunction: function (name, fn) {
        this.environment.defineCoercingFunction(name, fn);
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
     * Defines a global variable using a getter/setter pair
     *
     * @param {string} name
     * @param {Function} valueGetter
     * @param {Function} valueSetter
     */
    defineGlobalAccessor: function (name, valueGetter, valueSetter) {
        this.environment.defineGlobalAccessor(name, valueGetter, valueSetter);
    },

    defineSuperGlobal: function (name, nativeValue) {
        var engine = this,
            valueFactory = engine.environment.getState().getValueFactory(),
            value = valueFactory.coerce(nativeValue);

        engine.environment.defineSuperGlobal(name, value);
    },

    defineSuperGlobalAccessor: function (name, valueGetter, valueSetter) {
        this.environment.defineSuperGlobalAccessor(name, valueGetter, valueSetter);
    },

    /**
     * Executes this PHP script, returning either its resulting value if in synchronous mode
     * or a Promise if in asynchronous mode that will later be resolved with its resulting value
     * (from a top-level `return` statement, if any - otherwise defaulting to null)
     *
     * @return {Promise|Value}
     */
    execute: function () {
        var callFactory,
            callStack,
            engine = this,
            environment = engine.environment,
            globalNamespace,
            globalScope,
            loader,
            mode = engine.mode,
            module,
            moduleFactory,
            options = engine.options,
            path = options[PATH],
            isMainProgram = path === null,
            output,
            pausable = engine.pausable,
            phpCommon = engine.phpCommon,
            Exception = phpCommon.Exception,
            PHPError = phpCommon.PHPError,
            PHPException,
            PHPFatalError = phpCommon.PHPFatalError,
            referenceFactory,
            resultValue,
            scopeFactory,
            state,
            stderr = engine.getStderr(),
            stdin = engine.getStdin(),
            tools,
            valueFactory,
            wrapper = engine.wrapper,
            unwrap = function (wrapper) {
                return mode === 'async' ? wrapper.async(pausable) : wrapper.sync();
            },
            // TODO: Wrap this module with `pauser` to remove the need for this
            ExitValue = unwrap(ExitValueWrapper),
            ObjectValue = unwrap(ObjectValueWrapper),
            Tools = unwrap(ToolsWrapper),
            topLevelNamespaceScope,
            topLevelScope;

        state = environment.getState();
        callFactory = state.getCallFactory();
        loader = state.getLoader();
        moduleFactory = state.getModuleFactory();
        referenceFactory = state.getReferenceFactory();
        scopeFactory = state.getScopeFactory();
        valueFactory = state.getValueFactory();
        globalNamespace = state.getGlobalNamespace();
        callStack = state.getCallStack();
        globalScope = state.getGlobalScope();
        output = state.getOutput();
        PHPException = state.getPHPExceptionClass();
        // Use the provided top-level scope if specified, otherwise use the global scope
        // (used eg. when an `include(...)` is used inside a function)
        topLevelScope = engine.topLevelScope || globalScope;
        module = moduleFactory.create(path);
        topLevelNamespaceScope = scopeFactory.createNamespaceScope(globalNamespace, globalNamespace, module);

        // Create the runtime tools object, referenced by the transpiled JS output from PHPToJS
        tools = new Tools(
            callStack,
            environment,
            globalNamespace,
            loader,
            module,
            options,
            path,
            referenceFactory,
            scopeFactory,
            topLevelNamespaceScope,
            topLevelScope,
            valueFactory
        );

        // Push the 'main' global scope call onto the stack
        callStack.push(callFactory.create(topLevelScope, topLevelNamespaceScope));

        function handleError(error, reject) {
            if (error instanceof ExitValue) {
                return error;
            }

            if (error instanceof ObjectValue) {
                // Uncaught PHP Exceptions become E_FATAL errors
                (function (value) {
                    var error = value.getForThrow();

                    if (!(error instanceof PHPException)) {
                        throw new Exception('Weird value class thrown: ' + value.getClassName());
                    }

                    error = new PHPFatalError(
                        PHPFatalError.UNCAUGHT_EXCEPTION,
                        {
                            name: value.getClassName()
                        }
                    );

                    if (isMainProgram) {
                        stderr.write(error.message);
                    }

                    reject(error);
                }(error));

                return;
            }

            if (error instanceof PHPError) {
                if (isMainProgram) {
                    stderr.write(error.message);
                }

                reject(error);
                return;
            }

            reject(error);
        }

        // Asynchronous mode - Pausable must be available
        if (mode === 'async') {
            return new Promise(function (resolve, reject) {
                var code = 'return (' +
                    wrapper.toString() +
                    '(stdin, stdout, stderr, tools, globalNamespace));';

                pausable.execute(code, {
                    strict: true,
                    expose: {
                        stdin: stdin,
                        stdout: output,
                        stderr: stderr,
                        tools: tools,
                        globalNamespace: globalNamespace
                    }
                }).then(function (resultValue) {
                    // Pop the top-level scope (of the include, if this module was included) off the stack
                    // regardless of whether an error occurred
                    callStack.pop();

                    resolve(resultValue);
                }, function (error) {
                    var result;

                    // Pop the top-level scope (of the include, if this module was included) off the stack
                    // regardless of whether an error occurred
                    callStack.pop();

                    result = handleError(error, reject);

                    if (result) {
                        resolve(result);
                    }
                });
            });
        }

        // Otherwise load the module synchronously
        try {
            try {
                resultValue = wrapper(stdin, output, stderr, tools, globalNamespace);

                return mode === 'psync' ?
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
            if (mode === 'psync') {
                // Promise-sync mode - return a promise...

                return new Promise(function (resolve, reject) {
                    var resultValue = handleError(error, function (error) {
                        // ... rejected with the error if applicable
                        reject(error);
                    });

                    // Otherwise if it was a special ExitValue, resolve with it
                    if (resultValue) {
                        resolve(resultValue);
                    }
                });
            }

            return handleError(error, function (error) {
                throw error;
            });
        }
    },

    expose: function (object, name) {
        this.environment.expose(object, name);
    },

    getConstant: function (name) {
        return this.environment.getConstant(name);
    },

    getStderr: function () {
        return this.environment.getStderr();
    },

    getStdin: function () {
        return this.environment.getStdin();
    },

    getStdout: function () {
        return this.environment.getStdout();
    }
});

module.exports = Engine;
