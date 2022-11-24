/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var expect = require('chai').expect,
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    tools = require('./tools'),
    ControlBridge = require('../../src/Control/ControlBridge'),
    ControlFactory = require('../../src/Control/ControlFactory'),
    ControlScope = require('../../src/Control/ControlScope'),
    ErrorReporting = require('../../src/Error/ErrorReporting'),
    Exception = phpCommon.Exception,
    FFIInternals = require('../../src/FFI/Internals/Internals'),
    FFIResult = require('../../src/FFI/Result'),
    GlobalStackHooker = require('../../src/FFI/Stack/GlobalStackHooker'),
    HostScheduler = require('../../src/Control/HostScheduler'),
    Loader = require('../../src/Load/Loader').sync(),
    OptionSet = require('../../src/OptionSet'),
    Output = require('../../src/Output/Output'),
    PauseFactory = require('../../src/Control/PauseFactory'),
    PHPState = require('../../src/PHPState').sync(),
    Reference = require('../../src/Reference/Reference'),
    Runtime = require('../../src/Runtime').sync(),
    ScopeFactory = require('../../src/ScopeFactory'),
    Stream = require('../../src/Stream'),
    Translator = phpCommon.Translator,
    ValueProvider = require('../../src/Value/ValueProvider');

describe('PHPState', function () {
    var globalStackHooker,
        installedBuiltinTypes,
        optionSet,
        state,
        stderr,
        stdin,
        stdout,
        runtime,
        valueFactory;

    beforeEach(function () {
        globalStackHooker = sinon.createStubInstance(GlobalStackHooker);
        installedBuiltinTypes = {};
        optionSet = sinon.createStubInstance(OptionSet);
        stdin = sinon.createStubInstance(Stream);
        stdout = sinon.createStubInstance(Stream);
        stderr = sinon.createStubInstance(Stream);
        runtime = sinon.createStubInstance(Runtime);
        valueFactory = tools.createIsolatedState().getValueFactory();

        state = new PHPState(
            runtime,
            globalStackHooker,
            installedBuiltinTypes,
            stdin,
            stdout,
            stderr,
            'async'
        );
    });

    describe('constructor()', function () {
        it('should install non-namespaced classes into the global namespace', function () {
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    classes: {
                        'MyClass': function () {
                            return sinon.stub();
                        }
                    }
                },
                stdin,
                stdout,
                stderr,
                'async'
            );

            expect(state.getGlobalNamespace().hasClass('MyClass')).to.be.true;
        });

        it('should install namespaced classes into the correct namespace', function () {
            var MyClass = sinon.stub();
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    classes: {
                        'Some\\Stuff\\AClass': function () {
                            return MyClass;
                        }
                    }
                },
                stdin,
                stdout,
                stderr,
                'async'
            );

            expect(state.getGlobalNamespace().hasClass('AClass')).to.be.false;
            expect(state.getGlobalNamespace().getDescendant('Some\\Stuff').hasClass('AClass')).to.be.true;
        });

        it('should throw if a class that does not extend another attempts to call its superconstructor', async function () {
            var AClass;
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    classes: {
                        'Some\\Stuff\\AClass': function (internals) {
                            function AClass() {
                                internals.callSuperConstructor(this, arguments).yieldSync();
                            }

                            return AClass;
                        }
                    }
                },
                stdin,
                stdout,
                stderr,
                'async'
            );
            AClass = await state.getGlobalNamespace().getClass('Some\\Stuff\\AClass').toPromise();

            return expect(AClass.instantiate().toPromise()).to.eventually.be.rejectedWith(
                Exception,
                'Cannot call superconstructor: no superclass is defined for class "Some\\Stuff\\AClass"'
            );
        });

        it('should allow function group factories to access constants early', async function () {
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    constantGroups: [
                        function () {
                            return {
                                'MY_CONST': 21
                            };
                        }
                    ],
                    functionGroups: [
                        function (internals) {
                            var MY_CONST = internals.getConstant('MY_CONST');
                            return {
                                getMyConstant: function () {
                                    return internals.valueFactory.createInteger(MY_CONST);
                                }
                            };
                        }
                    ]
                },
                stdin,
                stdout,
                stderr,
                'async'
            );

            expect((await state.getFunction('getMyConstant').call().toPromise()).getNative()).to.equal(21);
        });

        it('should define untyped functions correctly with a FunctionSpec', function () {
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                myFunction: function () {
                                    return internals.valueFactory.createInteger(21);
                                }
                            };
                        }
                    ]
                },
                stdin,
                stdout,
                stderr,
                'async'
            );

            expect(state.getFunction('myFunction').functionSpec.getFunctionName())
                .to.equal('myFunction');
        });

        it('should define typed functions correctly with a FunctionSpec', function () {
            var functionSpec,
                parameters;
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                myFunction: internals.typeFunction('iterable &$myIterable', function () {
                                    return internals.valueFactory.createInteger(21);
                                })
                            };
                        }
                    ]
                },
                stdin,
                stdout,
                stderr,
                'async'
            );

            functionSpec = state.getFunction('myFunction').functionSpec;
            expect(functionSpec.getFunctionName()).to.equal('myFunction');
            parameters = functionSpec.getParameters();
            expect(parameters).to.have.length(1);
            expect(parameters[0].getLineNumber()).to.be.null;
            expect(parameters[0].getName()).to.equal('myIterable');
            expect(parameters[0].getType().getDisplayName()).to.equal('iterable');
            expect(parameters[0].isPassedByReference()).to.be.true;
            expect(parameters[0].isRequired()).to.be.true;
        });

        it('should allow functions to be aliased', async function () {
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    functionGroups: [
                        function (internals) {
                            return {
                                myOriginalFunc: function () {
                                    return internals.valueFactory.createString('my result');
                                },

                                myAliasForFunc: 'myOriginalFunc'
                            };
                        }
                    ]
                },
                stdin,
                stdout,
                stderr,
                'async'
            );

            expect((await state.getFunction('myAliasForFunc').call().toPromise()).getNative())
                .to.equal('my result');
        });

        it('should install any option groups as options', function () {
            state = new PHPState(
                runtime,
                globalStackHooker,
                {},
                stdin,
                stdout,
                stderr,
                'async',
                [
                    function (internals) {
                        return {
                            myOption: internals.valueFactory.createString('my option value')
                        };
                    }
                ]
            );

            expect(state.getOptions().myOption.getType()).to.equal('string');
            expect(state.getOptions().myOption.getNative()).to.equal('my option value');
        });

        it('should install any initial options as options', function () {
            state = new PHPState(
                runtime,
                globalStackHooker,
                {},
                stdin,
                stdout,
                stderr,
                'async',
                [],
                {
                    yourOption: 21
                }
            );

            expect(state.getOptions().yourOption).to.equal(21);
        });

        it('should install any binding groups', function () {
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    bindingGroups: [
                        function () {
                            return {
                                my_binding: function () {
                                    return 21;
                                }
                            };
                        }
                    ]
                },
                stdin,
                stdout,
                stderr,
                'async'
            );

            expect(state.getBinding('my_binding')).to.equal(21);
        });

        it('should install any default INI options, allowing access to constants early', function () {
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    constantGroups: [
                        function () {
                            return {
                                'MY_CONST': 212
                            };
                        }
                    ],
                    defaultINIGroups: [
                        function (internals) {
                            return {
                                'my_ini_setting': internals.getConstant('MY_CONST')
                            };
                        }
                    ]
                },
                stdin,
                stdout,
                stderr,
                'async'
            );

            expect(state.getINIOption('my_ini_setting')).to.equal(212);
        });

        it('should run any initialisers', function () {
            var initialiser1 = sinon.stub(),
                initialiser2 = sinon.stub(),
                internals;
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    initialiserGroups: [initialiser1, initialiser2]
                },
                stdin,
                stdout,
                stderr,
                'sync'
            );
            internals = state.getFFIInternals();

            expect(initialiser1).to.have.been.calledOnce;
            expect(initialiser1).to.have.been.calledWith(sinon.match.same(internals));
            expect(initialiser2).to.have.been.calledOnce;
            expect(initialiser2).to.have.been.calledWith(sinon.match.same(internals));
        });

        it('should load the state inside a Coroutine', function (done) {
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    initialiserGroups: [
                        function () {
                            expect(state.getControlScope().inCoroutine()).to.be.true;

                            done();
                        }
                    ]
                },
                stdin,
                stdout,
                stderr,
                'async'
            );
        });

        it('should install any opcode handlers', function () {
            var opcodeHandler = sinon.stub();
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    opcodeGroups: [
                        function (internals) {
                            internals.setOpcodeFetcher('calculation');

                            return {
                                'my_opcode': opcodeHandler
                            };
                        }
                    ]
                },
                stdin,
                stdout,
                stderr,
                'sync'
            );

            expect(state.getCoreBinder().getOpcodeHandlers(['my_opcode'])).to.contain(opcodeHandler);
        });

        it('should install any translations', function () {
            state = new PHPState(
                runtime,
                globalStackHooker,
                {
                    translationCatalogues: [
                        {
                            'en_GB': {
                                'some_namespace': {
                                    'my_key': 'Hello there ${name}!'
                                }
                            }
                        }
                    ]
                },
                stdin,
                stdout,
                stderr,
                'sync'
            );

            expect(
                state.getTranslator().translate('some_namespace.my_key', {name: 'Fred'})
            ).to.equal('Hello there Fred!');
        });

        ['async', 'sync', 'psync'].forEach(function (mode) {
            it('should expose the current synchronicity mode when "' + mode + '"', function () {
                state = new PHPState(
                    runtime,
                    globalStackHooker,
                    {},
                    stdin,
                    stdout,
                    stderr,
                    mode,
                    [
                        function (internals) {
                            return {
                                myMode: internals.mode
                            };
                        }
                    ]
                );

                expect(state.getOptions().myMode).to.equal(mode);
            });
        });

        it('should expose the error configuration', function () {
            state = new PHPState(
                runtime,
                globalStackHooker,
                {},
                stdin,
                stdout,
                stderr,
                'sync',
                [
                    function (internals) {
                        internals.iniState.set('error_reporting', 1234);

                        return {
                            myErrorReportingLevel: internals.errorConfiguration.getErrorReportingLevel()
                        };
                    }
                ]
            );

            expect(state.getOptions().myErrorReportingLevel).to.equal(1234);
        });

        it('should throw an error if the specified binding is not defined', function () {
            expect(function () {
                /*jshint nonew:false */
                new PHPState(
                    runtime,
                    globalStackHooker,
                    {
                        functionGroups: [
                            function (internals) {
                                internals.getBinding('some_undefined_binding');
                            }
                        ]
                    },
                    stdin,
                    stdout,
                    stderr,
                    'async'
                );
            }).to.throw(Exception, 'No binding is defined with name "some_undefined_binding"');
        });

        it('should throw an error if any option group attempts to access a binding too early', function () {
            expect(function () {
                state = new PHPState(
                    runtime,
                    globalStackHooker,
                    {},
                    stdin,
                    stdout,
                    stderr,
                    'async',
                    [
                        function (internals) {
                            internals.getBinding('my_binding');
                        }
                    ]
                );
            }).to.throw(Exception, 'Option groups cannot access bindings too early');
        });

        it('should set any provided INI options after all option groups have been handled', function () {
            state = new PHPState(
                runtime,
                globalStackHooker,
                {},
                stdin,
                stdout,
                stderr,
                'sync',
                [],
                {
                    'ini': {
                        'display_errors': 'Off'
                    }
                }
            );

            expect(state.getINIOption('display_errors')).to.equal('Off');
        });
    });

    describe('aliasFunction()', function () {
        it('should be able to alias a function defined inside a namespace', async function () {
            state.defineCoercingFunction('My\\Stuff\\myOriginalFunc', function (arg1, arg2) {
                return arg1 + arg2;
            });

            state.aliasFunction('My\\Stuff\\myOriginalFunc', 'myAliasFunc');

            expect(
                (
                    await state.getFunction('My\\Stuff\\myAliasFunc')
                        .call(
                            null,
                            valueFactory.createInteger(21),
                            valueFactory.createInteger(4)
                        )
                        .toPromise()
                )
                .getNative()
            ).to.equal(25);
        });
    });

    describe('createFFIResult()', function () {
        it('should return an FFIResult', function () {
            var asyncCallback = sinon.stub(),
                syncCallback = sinon.stub().returns(21),
                result = state.createFFIResult(syncCallback, asyncCallback);

            expect(result).to.be.an.instanceOf(FFIResult);
            expect(result.getSync()).to.equal(21);
        });
    });

    describe('defineCoercingFunction()', function () {
        it('should define a function that coerces its return value and unwraps its arguments', async function () {
            var resultValue;
            state.defineCoercingFunction('double_it', function (numberToDouble) {
                return numberToDouble * 2;
            });

            resultValue = await state.getFunction('double_it')(
                valueFactory.createInteger(21)
            ).toPromise();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(42);
        });

        it('should be able to define a function in a namespace', async function () {
            var namespace = state.getGlobalNamespace().getDescendant('My\\Stuff'),
                resultValue;
            state.defineCoercingFunction('My\\Stuff\\double_it', function (numberToDouble) {
                return numberToDouble * 2;
            });

            // Explicitly fetch via the namespace, to ensure we aren't just erroneously
            // allowing function names to contain backslashes
            resultValue = await namespace.getFunction('double_it')(
                valueFactory.createInteger(21)
            ).toPromise();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(42);
        });

        it('should define an untyped function correctly with a FunctionSpec', function () {
            state.defineCoercingFunction('my_function', function () {});

            expect(state.getFunction('my_function').functionSpec.getFunctionName())
                .to.equal('my_function');
        });

        it('should define a typed function correctly with a FunctionSpec', function () {
            var functionSpec,
                parameters;

            state.defineCoercingFunction('my_function', function () {}, 'iterable $myParam');

            functionSpec = state.getFunction('my_function').functionSpec;
            expect(functionSpec.getFunctionName()).to.equal('my_function');
            parameters = functionSpec.getParameters();
            expect(parameters).to.have.length(1);
            expect(parameters[0].getLineNumber()).to.be.null;
            expect(parameters[0].getName()).to.equal('myParam');
            expect(parameters[0].getType().getDisplayName()).to.equal('iterable');
            expect(parameters[0].isPassedByReference()).to.be.false;
            expect(parameters[0].isRequired()).to.be.true;
        });
    });

    describe('defineConstant()', function () {
        it('should define a constant on the correct namespace', function () {
            state.defineConstant('\\My\\Stuff\\MY_CONST', 21, {caseInsensitive: true});

            expect(state.getGlobalNamespace().getDescendant('My\\Stuff').getConstant('my_COnsT').getNative())
                .to.equal(21);
        });
    });

    describe('defineFunction()', function () {
        it('should be able to define a coercing function', async function () {
            var func,
                resultValue;
            state.defineFunction('My\\Stuff\\my_multiplier', function () {
                return function (num1, num2) {
                    return num1 * num2;
                };
            });
            func = state.getFunction('My\\Stuff\\my_multiplier');

            resultValue = await func(valueFactory.createInteger(4), valueFactory.createInteger(3)).toPromise();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(12);
        });

        it('should be able to define a non-coercing function', async function () {
            var func,
                resultValue;
            state.defineFunction('My\\Stuff\\my_multiplier', function (internals) {
                internals.disableAutoCoercion();

                return function (num1Reference, num2Reference) {
                    return num1Reference.getValue().getNative() * num2Reference.getValue().getNative();
                };
            });
            func = state.getFunction('My\\Stuff\\my_multiplier');

            resultValue = await func(valueFactory.createInteger(4), valueFactory.createInteger(3)).toPromise();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(12);
        });
    });

    describe('defineGlobal()', function () {
        it('should be able to define a global and assign it the given Value object', function () {
            state.defineGlobal('myGlobal', valueFactory.createInteger(27));

            expect(state.getGlobalScope().getVariable('myGlobal').getValue().getNative()).to.equal(27);
        });

        it('should be able to define a global and assign it the given native value', function () {
            state.defineGlobal('myGlobal', 1001);

            expect(state.getGlobalScope().getVariable('myGlobal').getValue().getNative()).to.equal(1001);
        });

        it('should return the assigned value', function () {
            var resultValue = state.defineGlobal('myGlobal', 1001);

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1001);
        });

        it('should throw when the global is already defined', function () {
            state.defineGlobal('myGlobal', 21);

            expect(function () {
                state.defineGlobal('myGlobal', 21); // Attempt to redefine
            }).to.throw(
                'PHPState.defineGlobal() :: Variable "myGlobal" is already defined in the global scope'
            );
        });
    });

    describe('defineGlobalAccessor()', function () {
        it('should install a getter for the global', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            valueGetter.returns(21);

            state.defineGlobalAccessor('MY_GLOB', valueGetter, valueSetter);

            expect(state.getGlobalScope().getVariable('MY_GLOB').getValue().getNative()).to.equal(21);
        });

        it('should install a setter for the global', function () {
            var value = valueFactory.createInteger(27),
                valueGetter = sinon.stub(),
                valueSetter = sinon.spy();

            state.defineGlobalAccessor('MY_GLOB', valueGetter, valueSetter);
            state.getGlobalScope().getVariable('MY_GLOB').setValue(value);

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter).to.have.been.calledOn(state.getFFIInternals());
            expect(valueSetter.args[0][0].getType()).to.equal('int');
            expect(valueSetter.args[0][0].getNative()).to.equal(27);
        });

        it('should install a reference setter for the global', function () {
            var reference = sinon.createStubInstance(Reference),
                referenceSetter = sinon.spy(),
                valueGetter = sinon.stub(),
                valueSetter = sinon.spy();

            state.defineGlobalAccessor('MY_GLOB', valueGetter, valueSetter, null, null, referenceSetter);
            state.getGlobalScope().getVariable('MY_GLOB').setReference(reference);

            expect(referenceSetter).to.have.been.calledOnce;
            expect(referenceSetter).to.have.been.calledOn(state.getFFIInternals());
            expect(referenceSetter).to.have.been.calledWith(sinon.match.same(reference));
        });
    });

    describe('defineNonCoercingFunction()', function () {
        it('should define a function that coerces its return value but does not unwrap its arguments', async function () {
            var resultValue;
            state.defineNonCoercingFunction('double_it', function (numberToDoubleReference) {
                return numberToDoubleReference.getValue().getNative() * 2;
            });

            resultValue = await state.getFunction('double_it')(
                valueFactory.createInteger(21)
            ).toPromise();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(42);
        });

        it('should be able to define a function in a namespace', async function () {
            var namespace = state.getGlobalNamespace().getDescendant('My\\Stuff'),
                resultValue;
            state.defineNonCoercingFunction('My\\Stuff\\double_it', function (numberToDoubleReference) {
                return numberToDoubleReference.getValue().getNative() * 2;
            });

            // Explicitly fetch via the namespace, to ensure we aren't just erroneously
            // allowing function names to contain backslashes
            resultValue = await namespace.getFunction('double_it')(
                valueFactory.createInteger(21)
            ).toPromise();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(42);
        });

        it('should define an untyped function correctly with a FunctionSpec', function () {
            state.defineNonCoercingFunction('my_function', function () {});

            expect(state.getFunction('my_function').functionSpec.getFunctionName())
                .to.equal('my_function');
        });

        it('should define a typed function correctly with a FunctionSpec', function () {
            var functionSpec,
                parameters;

            state.defineNonCoercingFunction('my_function', function () {}, 'iterable &$myParam');

            functionSpec = state.getFunction('my_function').functionSpec;
            expect(functionSpec.getFunctionName()).to.equal('my_function');
            parameters = functionSpec.getParameters();
            expect(parameters).to.have.length(1);
            expect(parameters[0].getLineNumber()).to.be.null;
            expect(parameters[0].getName()).to.equal('myParam');
            expect(parameters[0].getType().getDisplayName()).to.equal('iterable');
            expect(parameters[0].isPassedByReference()).to.be.true;
            expect(parameters[0].isRequired()).to.be.true;
        });
    });

    describe('defineServiceGroup()', function () {
        it('should allow defining custom services', function () {
            state.defineServiceGroup(function (internals) {
                var getService = internals.getServiceFetcher();

                return {
                    'my_service': function () {
                        return {'dependency': getService('my_dependency')};
                    },
                    'my_dependency': function () {
                        return {'my': 'dependency'};
                    }
                };
            });

            expect(state.getService('my_service')).to.deep.equal({
                'dependency': {'my': 'dependency'}
            });
        });

        // Note that to do this correctly, an addon should be used.
        it('should throw when attempting to redefine an instantiated service', function () {
            expect(function () {
                state.defineServiceGroup(function (internals) {
                    internals.allowServiceOverride(); // Still should not allow overriding already-instantiated services.

                    return {
                        'call_stack': {my: 'invalid fake CallStack'}
                    };
                });
            }).to.throw(Exception, 'Service with ID "call_stack" has already been instantiated');
        });
    });

    describe('defineSuperGlobal()', function () {
        it('should be able to define a superglobal and assign it the given Value object', function () {
            state.defineSuperGlobal('MY_SUPER_GLOB', valueFactory.createInteger(27));

            expect(state.getSuperGlobalScope().getVariable('MY_SUPER_GLOB').getValue().getNative()).to.equal(27);
        });

        it('should be able to define a superglobal and assign it the given native value', function () {
            state.defineSuperGlobal('MY_SUPER_GLOB', 1001);

            expect(state.getSuperGlobalScope().getVariable('MY_SUPER_GLOB').getValue().getNative()).to.equal(1001);
        });
    });

    describe('defineSuperGlobalAccessor()', function () {
        it('should install a getter for the superglobal', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            valueGetter.returns(21);

            state.defineSuperGlobalAccessor('MY_SUPER_GLOB', valueGetter, valueSetter);

            expect(state.getSuperGlobalScope().getVariable('MY_SUPER_GLOB').getValue().getNative()).to.equal(21);
        });

        it('should install a setter for the superglobal', function () {
            var value = valueFactory.createInteger(27),
                valueGetter = sinon.stub(),
                valueSetter = sinon.spy();

            state.defineSuperGlobalAccessor('MY_SUPER_GLOB', valueGetter, valueSetter);
            state.getSuperGlobalScope().getVariable('MY_SUPER_GLOB').setValue(value);

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter.args[0][0].getType()).to.equal('int');
            expect(valueSetter.args[0][0].getNative()).to.equal(27);
        });
    });

    describe('getConstant()', function () {
        it('should return the native value of the constant from the global namespace when defined', function () {
            var value = valueFactory.createString('my value');
            state.getGlobalNamespace().defineConstant('MY_CONST', value);

            expect(state.getConstant('MY_CONST')).to.equal('my value');
        });

        it('should return null when the constant is not defined', function () {
            expect(state.getConstant('MY_UNDEFINED_CONST')).to.be.null;
        });
    });

    describe('getControlBridge()', function () {
        it('should return the ControlBridge service', function () {
            expect(state.getControlBridge()).to.be.an.instanceOf(ControlBridge);
        });
    });

    describe('getControlFactory()', function () {
        it('should return the ControlFactory service', function () {
            expect(state.getControlFactory()).to.be.an.instanceOf(ControlFactory);
        });
    });

    describe('getControlScope()', function () {
        it('should return the ControlScope service', function () {
            expect(state.getControlScope()).to.be.an.instanceOf(ControlScope);
        });
    });

    describe('getErrorReporting()', function () {
        it('should return the ErrorReporting service', function () {
            expect(state.getErrorReporting()).to.be.an.instanceOf(ErrorReporting);
        });
    });

    describe('getFFIInternals()', function () {
        it('should return the FFI Internals service', function () {
            expect(state.getFFIInternals()).to.be.an.instanceOf(FFIInternals);
        });
    });

    describe('getFunction()', function () {
        it('should be able to fetch a function defined inside a namespace', async function () {
            state.defineCoercingFunction('My\\Stuff\\myFunc', function (arg1, arg2) {
                return arg1 + arg2;
            });

            expect(
                (
                    await state.getFunction('My\\Stuff\\myFunc')
                        .call(
                            null,
                            valueFactory.createInteger(10),
                            valueFactory.createInteger(7)
                        )
                        .toPromise()
                )
                .getNative()
            ).to.equal(17);
        });
    });

    describe('getGlobal()', function () {
        it('should be able to fetch the value of a defined global variable', function () {
            state.defineGlobal('myGlobal', valueFactory.createInteger(9876));

            expect(state.getGlobal('myGlobal').getNative()).to.equal(9876);
        });

        it('should return a NULL value for an undefined global variable', function () {
            var value = state.getGlobal('myUndefinedGlobal');

            expect(value.getType()).to.equal('null');
        });
    });

    describe('getHostScheduler()', function () {
        it('should return the HostScheduler service', function () {
            expect(state.getHostScheduler()).to.be.an.instanceOf(HostScheduler);
        });
    });

    describe('getLoader()', function () {
        it('should return a Loader', function () {
            expect(state.getLoader()).to.be.an.instanceOf(Loader);
        });
    });

    describe('getOutput()', function () {
        it('should return an Output', function () {
            expect(state.getOutput()).to.be.an.instanceOf(Output);
        });

        it('should return an Output connected up to stdout', function () {
            state.getOutput().write('good evening');

            expect(stdout.write).to.have.been.calledOnce;
            expect(stdout.write).to.have.been.calledWith('good evening');
        });
    });

    describe('getPauseFactory()', function () {
        it('should return the PauseFactory service', function () {
            expect(state.getPauseFactory()).to.be.an.instanceOf(PauseFactory);
        });
    });

    describe('getScopeFactory()', function () {
        it('should return a ScopeFactory', function () {
            expect(state.getScopeFactory()).to.be.an.instanceOf(ScopeFactory);
        });
    });

    describe('getTranslator()', function () {
        it('should return the Translator service', function () {
            expect(state.getTranslator()).to.be.an.instanceOf(Translator);
        });
    });

    describe('getValueProvider()', function () {
        it('should return the ValueProvider service', function () {
            expect(state.getValueProvider()).to.be.an.instanceOf(ValueProvider);
        });
    });

    describe('queueMacrotask()', function () {
        it('should resolve the callback in the next event loop tick', function (done) {
            var callback = sinon.spy(done);

            state.queueMacrotask(callback);

            expect(callback).not.to.have.been.called;
            state.queueMicrotask(function () {
                expect(callback).not.to.have.been.called;
            });
        });
    });

    describe('queueMicrotask()', function () {
        it('should resolve the callback at the end of the current event loop tick', function (done) {
            var callback = sinon.spy(done);

            state.queueMicrotask(callback);

            expect(callback).not.to.have.been.called;
            state.queueMicrotask(function () {
                expect(callback).to.have.been.calledOnce;
            });
        });
    });

    describe('setGlobal()', function () {
        it('should be able to change the value of a defined variable to a Value object', function () {
            state.defineGlobal('myGlobal', valueFactory.createInteger(21));

            state.setGlobal('myGlobal', valueFactory.createInteger(1001));

            expect(state.getGlobal('myGlobal').getNative()).to.equal(1001);
        });

        it('should be able to change the value of a defined variable to a native value', function () {
            state.defineGlobal('myGlobal', valueFactory.createInteger(21));

            state.setGlobal('myGlobal', 987654);

            expect(state.getGlobal('myGlobal').getNative()).to.equal(987654);
        });

        it('should return the assigned value', function () {
            var resultValue;
            state.defineGlobal('myGlobal', valueFactory.createInteger(21));

            resultValue = state.setGlobal('myGlobal', 1234);

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1234);
        });

        it('should throw when the specified variable is not defined', function () {
            expect(function () {
                state.setGlobal('myUndefinedGlobal', 987654);
            }).to.throw(
                'PHPState.setGlobal() :: Variable "myUndefinedGlobal" is not defined in the global scope'
            );
        });
    });
});
