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
    ObjectValueWrapper = require('./Value/Object'),
    Promise = require('lie'),
    ToolsWrapper = require('./Tools');

function Engine(
    environment,
    topLevelScope,
    phpCommon,
    options,
    wrapper,
    pausable
) {
    this.environment = environment;
    this.options = _.extend(
        {
            'path': null
        },
        options || {}
    );
    this.pausable = pausable;
    this.phpCommon = phpCommon;
    this.topLevelScope = topLevelScope || null;
    this.wrapper = wrapper;
}

_.extend(Engine.prototype, {
    createPause: function () {
        var engine = this;

        if (!engine.pausable) {
            throw new Error('Pausable is not available');
        }

        return engine.pausable.createPause();
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
            scopeFactory,
            state,
            stderr = engine.getStderr(),
            stdin = engine.getStdin(),
            tools,
            valueFactory,
            wrapper = engine.wrapper,
            unwrap = function (wrapper) {
                return pausable ? wrapper.async(pausable) : wrapper.sync();
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

        // Use asynchronous mode if Pausable is available
        if (pausable) {
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
                return wrapper(stdin, output, stderr, tools, globalNamespace);
            } finally {
                // Pop the top-level scope (of the include, if this module was included) off the stack
                // regardless of whether an error occurred
                callStack.pop();
            }
        } catch (error) {
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
