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
    Promise = require('bluebird'),
    ScopeWrapper = require('./Scope');

function Engine(
    runtime,
    environment,
    phpCommon,
    options,
    wrapper,
    pausable,
    phpToAST,
    phpToJS
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
    this.phpToAST = phpToAST;
    this.phpToJS = phpToJS;
    this.runtime = runtime;
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
            phpParser,
            phpToJS = engine.phpToJS,
            Exception = phpCommon.Exception,
            PHPError = phpCommon.PHPError,
            PHPException,
            PHPFatalError = phpCommon.PHPFatalError,
            referenceFactory,
            runtime = engine.runtime,
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
            ObjectValue = unwrap(ObjectValueWrapper),
            Scope = unwrap(ScopeWrapper);

        function include(path) {
            var done = false,
                pause = null,
                result,
                subOptions = _.extend({}, options, {
                    'path': path
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
                    'include(' + path + ') :: No "include" transport is available for loading the module.'
                );
            }

            function resolve(module) {
                var executeResult,
                    subWrapper,
                    subModule;

                // Handle PHP code string being returned from loader for module
                if (_.isString(module)) {
                    if (!phpParser) {
                        throw new Exception('include(' + path + ') :: PHP parser is not available');
                    }

                    if (!phpToJS) {
                        throw new Exception('include(' + path + ') :: PHPToJS is not available');
                    }

                    // Tell the parser the path to the current file
                    // so it can be included in error messages
                    phpParser.getState().setPath(path);

                    /*jshint evil: true */
                    try {
                        subWrapper = new Function(
                            'return ' +
                            phpToJS.transpile(
                                phpParser.parse(module),
                                {'bare': true}
                            ) +
                            ';'
                        )();
                    } catch (error) {
                        if (pause) {
                            pause.throw(error);
                            return;
                        }

                        throw error;
                    }

                    subModule = runtime.compile(subWrapper);
                    executeResult = subModule(subOptions, environment).execute();

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

                throw new Exception('include(' + path + ') :: Module is in a weird format');
            }

            function reject() {
                done = true;

                callStack.raiseError(
                    PHPError.E_WARNING,
                    'include(' + path + '): failed to open stream: No such file or directory'
                );
                callStack.raiseError(
                    PHPError.E_WARNING,
                    'include(): Failed opening \'' + path + '\' for inclusion'
                );

                completeWith(valueFactory.createNull());
            }

            subOptions[INCLUDE_OPTION](path, {
                reject: reject,
                resolve: resolve
            });

            if (done) {
                return result;
            }

            if (!pausable) {
                // Pausable is not available, so we cannot yield while the module is loaded
                throw new Exception('include(' + path + ') :: Async support not enabled');
            }

            pause = pausable.createPause();
            pause.now();
        }

        function getNormalizedPath() {
            return path === null ? '(program)' : path;
        }

        phpParser = environment.getParser();
        state = environment.getState();
        referenceFactory = state.getReferenceFactory();
        valueFactory = state.getValueFactory();
        globalNamespace = state.getGlobalNamespace();
        callStack = state.getCallStack();
        globalScope = state.getGlobalScope();
        PHPException = state.getPHPExceptionClass();

        tools = {
            createClosure: function (func, scope) {
                func.scopeWhenCreated = scope;

                return tools.valueFactory.createObject(
                    func,
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
                return new NamespaceScope(globalNamespace, namespace);
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
            popCall: function () {
                callStack.pop();
            },
            pushCall: function (thisObject, currentClass) {
                var call;

                if (!valueFactory.isValue(thisObject)) {
                    thisObject = null;
                }

                call = new Call(new Scope(callStack, valueFactory, thisObject, currentClass));

                callStack.push(call);

                return call;
            },
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
