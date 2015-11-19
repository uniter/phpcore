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
    INCLUDE_OPTION = 'include',
    PATH = 'path',
    pauser = require('pauser'),
    Call = require('./Call'),
    KeyValuePair = require('./KeyValuePair'),
    List = require('./List'),
    NamespaceScopeWrapper = require('./NamespaceScope'),
    ObjectValueWrapper = require('./Value/Object'),
    Promise = require('lie');

function Engine(
    environment,
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

    execute: function () {
        var callStack,
            engine = this,
            environment = engine.environment,
            globalNamespace,
            globalScope,
            options = engine.options,
            path = options[PATH],
            isMainProgram = path === null,
            pausable = engine.pausable,
            phpCommon = engine.phpCommon,
            Exception = phpCommon.Exception,
            PHPError = phpCommon.PHPError,
            PHPException,
            PHPFatalError = phpCommon.PHPFatalError,
            referenceFactory,
            state,
            stderr = engine.getStderr(),
            stdin = engine.getStdin(),
            stdout = engine.getStdout(),
            tools,
            valueFactory,
            wrapper = engine.wrapper,
            unwrap = function (wrapper) {
                return pausable ? wrapper.async(pausable) : wrapper.sync();
            },
            NamespaceScope = unwrap(NamespaceScopeWrapper),
            ObjectValue = unwrap(ObjectValueWrapper);

        function include(includedPath) {
            var done = false,
                pause = null,
                result,
                subOptions = _.extend({}, options, {
                    'path': includedPath
                });

            function completeWith(moduleResult) {
                if (pause) {
                    pause.resume(moduleResult);
                } else {
                    result = moduleResult;
                }
            }

            if (!subOptions[INCLUDE_OPTION]) {
                throw new Exception(
                    'include(' + includedPath + ') :: No "include" transport is available for loading the module.'
                );
            }

            function resolve(module) {
                var executeResult;

                // Handle wrapper function being returned from loader for module
                if (_.isFunction(module)) {
                    executeResult = module(subOptions, environment).execute();

                    if (!pausable) {
                        done = true;

                        completeWith(executeResult);
                        return;
                    }

                    executeResult.then(
                        completeWith,
                        function (error) {
                            pause.throw(error);
                        }
                    );

                    return;
                }

                // Handle PHP code string being returned from loader for module
                if (_.isString(module)) {
                    throw new Exception('include(' + includedPath + ') :: Returning a PHP string is not supported');
                }

                throw new Exception('include(' + includedPath + ') :: Module is in a weird format');
            }

            function reject() {
                done = true;

                callStack.raiseError(
                    PHPError.E_WARNING,
                    'include(' + includedPath + '): failed to open stream: No such file or directory'
                );
                callStack.raiseError(
                    PHPError.E_WARNING,
                    'include(): Failed opening \'' + includedPath + '\' for inclusion'
                );

                completeWith(valueFactory.createNull());
            }

            subOptions[INCLUDE_OPTION](includedPath, {
                reject: reject,
                resolve: resolve
            }, path);

            if (done) {
                return result;
            }

            if (!pausable) {
                // Pausable is not available, so we cannot yield while the module is loaded
                throw new Exception('include(' + includedPath + ') :: Async support not enabled');
            }

            pause = pausable.createPause();
            pause.now();
        }

        function getNormalizedPath() {
            return path === null ? '(program)' : path;
        }

        state = environment.getState();
        referenceFactory = state.getReferenceFactory();
        valueFactory = state.getValueFactory();
        globalNamespace = state.getGlobalNamespace();
        callStack = state.getCallStack();
        globalScope = state.getGlobalScope();
        PHPException = state.getPHPExceptionClass();

        tools = {
            createClosure: function (func, scope) {
                return tools.valueFactory.createObject(
                    scope.createClosure(func),
                    globalNamespace.getClass('Closure')
                );
            },
            createInstance: unwrap(pauser([], function () {
                return function (namespaceScope, classNameValue, args) {
                    var className = classNameValue.getNative(),
                        classObject = namespaceScope.getClass(className);

                    return classObject.instantiate(args);
                };
            })),
            createKeyValuePair: function (key, value) {
                return new KeyValuePair(key, value);
            },
            createList: function (elements) {
                return new List(elements);
            },
            createNamespaceScope: function (namespace) {
                return new NamespaceScope(globalNamespace, valueFactory, namespace);
            },
            getPath: function () {
                return valueFactory.createString(getNormalizedPath());
            },
            getPathDirectory: function () {
                return valueFactory.createString(getNormalizedPath().replace(/\/[^\/]+$/, ''));
            },
            globalScope: globalScope,
            implyArray: function (variable) {
                // Undefined variables and variables containing null may be implicitly converted to arrays
                if (!variable.isDefined() || variable.getValue().getType() === 'null') {
                    variable.setValue(valueFactory.createArray([]));
                }

                return variable.getValue();
            },
            implyObject: function (variable) {
                return variable.getValue();
            },
            include: include,
            referenceFactory: referenceFactory,
            requireOnce: include,
            require: include,
            throwNoActiveClassScope: function () {
                throw new PHPFatalError(PHPFatalError.SELF_WHEN_NO_ACTIVE_CLASS);
            },
            valueFactory: valueFactory
        };

        // Push the 'main' global scope call onto the stack
        callStack.push(new Call(globalScope));

        function handleError(error, reject) {
            if (error instanceof ObjectValue) {
                // Uncaught PHP Exceptions become E_FATAL errors
                (function (value) {
                    var error = value.getNative();

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
                        stdout: stdout,
                        stderr: stderr,
                        tools: tools,
                        globalNamespace: globalNamespace
                    }
                }).then(resolve, function (error) {
                    handleError(error, reject);
                });
            });
        }

        // Otherwise load the module synchronously
        try {
            return wrapper(stdin, stdout, stderr, tools, globalNamespace);
        } catch (error) {
            handleError(error, function (error) {
                throw error;
            });
        }
    },

    expose: function (object, name) {
        this.environment.expose(object, name);
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
