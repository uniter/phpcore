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
    ErrorReporting = require('../../src/Error/ErrorReporting'),
    Exception = phpCommon.Exception,
    Loader = require('../../src/Loader').sync(),
    OptionSet = require('../../src/OptionSet'),
    Output = require('../../src/Output/Output'),
    PHPState = require('../../src/PHPState').sync(),
    Runtime = require('../../src/Runtime').sync(),
    ScopeFactory = require('../../src/ScopeFactory'),
    Stream = require('../../src/Stream'),
    Translator = phpCommon.Translator,
    ValueFactory = require('../../src/ValueFactory').sync();

describe('PHPState', function () {
    var installedBuiltinTypes,
        optionSet,
        state,
        stderr,
        stdin,
        stdout,
        pausable,
        runtime,
        valueFactory;

    beforeEach(function () {
        installedBuiltinTypes = {};
        optionSet = sinon.createStubInstance(OptionSet);
        stdin = sinon.createStubInstance(Stream);
        stdout = sinon.createStubInstance(Stream);
        stderr = sinon.createStubInstance(Stream);
        pausable = {};
        runtime = sinon.createStubInstance(Runtime);
        valueFactory = new ValueFactory();

        state = new PHPState(
            runtime,
            installedBuiltinTypes,
            stdin,
            stdout,
            stderr,
            pausable,
            'async'
        );
    });

    describe('constructor', function () {
        it('should install non-namespaced classes into the global namespace', function () {
            state = new PHPState(
                runtime,
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
                pausable,
                'async'
            );

            expect(state.getGlobalNamespace().hasClass('MyClass')).to.be.true;
        });

        it('should install namespaced classes into the correct namespace', function () {
            var MyClass = sinon.stub();
            state = new PHPState(
                runtime,
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
                pausable,
                'async'
            );

            expect(state.getGlobalNamespace().hasClass('AClass')).to.be.false;
            expect(state.getGlobalNamespace().getDescendant('Some\\Stuff').hasClass('AClass')).to.be.true;
        });

        it('should throw if a class that does not extend another attempts to call its superconstructor', function () {
            var AClass;
            state = new PHPState(
                runtime,
                {
                    classes: {
                        'Some\\Stuff\\AClass': function (internals) {
                            function AClass() {
                                internals.callSuperConstructor(this, arguments);
                            }

                            return AClass;
                        }
                    }
                },
                stdin,
                stdout,
                stderr,
                pausable,
                'async'
            );
            AClass = state.getGlobalNamespace().getClass('Some\\Stuff\\AClass');

            expect(function () {
                AClass.instantiate();
            }).to.throw(
                'Cannot call superconstructor: no superclass is defined for class "Some\\Stuff\\AClass"'
            );
        });

        it('should allow function group factories to access constants early', function () {
            state = new PHPState(
                runtime,
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
                pausable,
                'async'
            );

            expect(state.getFunction('getMyConstant').call().getNative()).to.equal(21);
        });

        it('should define functions correctly with a FunctionSpec', function () {
            state = new PHPState(
                runtime,
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
                pausable,
                'async'
            );

            expect(state.getFunction('myFunction').functionSpec.getFunctionName())
                .to.equal('myFunction');
        });

        it('should allow functions to be aliased', function () {
            state = new PHPState(
                runtime,
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
                pausable,
                'async'
            );

            expect(state.getFunction('myAliasForFunc').call().getNative())
                .to.equal('my result');
        });

        it('should install any option groups as options', function () {
            state = new PHPState(
                runtime,
                {},
                stdin,
                stdout,
                stderr,
                pausable,
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
                {},
                stdin,
                stdout,
                stderr,
                pausable,
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
                pausable,
                'async'
            );

            expect(state.getBinding('my_binding')).to.equal(21);
        });

        it('should install any default INI options, allowing access to constants early', function () {
            state = new PHPState(
                runtime,
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
                pausable,
                'async'
            );

            expect(state.getINIOption('my_ini_setting')).to.equal(212);
        });

        it('should install any translations', function () {
            state = new PHPState(
                runtime,
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
                pausable,
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
                    {},
                    stdin,
                    stdout,
                    stderr,
                    pausable,
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
                {},
                stdin,
                stdout,
                stderr,
                pausable,
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
                    pausable,
                    'async'
                );
            }).to.throw(Exception, 'No binding is defined with name "some_undefined_binding"');
        });

        it('should throw an error if any option group attempts to access a binding too early', function () {
            expect(function () {
                state = new PHPState(
                    runtime,
                    {},
                    stdin,
                    stdout,
                    stderr,
                    pausable,
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
                {},
                stdin,
                stdout,
                stderr,
                pausable,
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
        it('should be able to alias a function defined inside a namespace', function () {
            state.defineCoercingFunction('My\\Stuff\\myOriginalFunc', function (arg1, arg2) {
                return arg1 + arg2;
            });

            state.aliasFunction('My\\Stuff\\myOriginalFunc', 'myAliasFunc');

            expect(
                state.getFunction('My\\Stuff\\myAliasFunc')
                    .call(
                        null,
                        valueFactory.createInteger(21),
                        valueFactory.createInteger(4)
                    )
                    .getNative()
            ).to.equal(25);
        });
    });

    describe('defineCoercingFunction()', function () {
        it('should define a function that coerces its return value and unwraps its arguments', function () {
            var resultValue;
            state.defineCoercingFunction('double_it', function (numberToDouble) {
                return numberToDouble * 2;
            });

            resultValue = state.getFunction('double_it')(
                valueFactory.createInteger(21)
            );

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(42);
        });

        it('should be able to define a function in a namespace', function () {
            var namespace = state.getGlobalNamespace().getDescendant('My\\Stuff'),
                resultValue;
            state.defineCoercingFunction('My\\Stuff\\double_it', function (numberToDouble) {
                return numberToDouble * 2;
            });

            // Explicitly fetch via the namespace, to ensure we aren't just erroneously
            // allowing function names to contain backslashes
            resultValue = namespace.getFunction('double_it')(
                valueFactory.createInteger(21)
            );

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(42);
        });

        it('should define a function correctly with a FunctionSpec', function () {
            state.defineCoercingFunction('my_function', function () {});

            expect(state.getFunction('my_function').functionSpec.getFunctionName())
                .to.equal('my_function');
        });
    });

    describe('defineConstant()', function () {
        it('should define a constant on the correct namespace', function () {
            state.defineConstant('\\My\\Stuff\\MY_CONST', 21, {caseInsensitive: true});

            expect(state.getGlobalNamespace().getDescendant('My\\Stuff').getConstant('my_COnsT').getNative())
                .to.equal(21);
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
            expect(valueSetter).to.have.been.calledWith(27);
        });
    });

    describe('defineNonCoercingFunction()', function () {
        it('should define a function that coerces its return value but does not unwrap its arguments', function () {
            var resultValue;
            state.defineNonCoercingFunction('double_it', function (numberToDoubleReference) {
                return numberToDoubleReference.getValue().getNative() * 2;
            });

            resultValue = state.getFunction('double_it')(
                valueFactory.createInteger(21)
            );

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(42);
        });

        it('should be able to define a function in a namespace', function () {
            var namespace = state.getGlobalNamespace().getDescendant('My\\Stuff'),
                resultValue;
            state.defineNonCoercingFunction('My\\Stuff\\double_it', function (numberToDoubleReference) {
                return numberToDoubleReference.getValue().getNative() * 2;
            });

            // Explicitly fetch via the namespace, to ensure we aren't just erroneously
            // allowing function names to contain backslashes
            resultValue = namespace.getFunction('double_it')(
                valueFactory.createInteger(21)
            );

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(42);
        });

        it('should define a function correctly with a FunctionSpec', function () {
            state.defineNonCoercingFunction('my_function', function () {});

            expect(state.getFunction('my_function').functionSpec.getFunctionName())
                .to.equal('my_function');
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
            expect(valueSetter).to.have.been.calledWith(27);
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

    describe('getErrorReporting()', function () {
        it('should return the ErrorReporting service', function () {
            expect(state.getErrorReporting()).to.be.an.instanceOf(ErrorReporting);
        });
    });

    describe('getFunction()', function () {
        it('should be able to fetch a function defined inside a namespace', function () {
            state.defineCoercingFunction('My\\Stuff\\myFunc', function (arg1, arg2) {
                return arg1 + arg2;
            });

            expect(
                state.getFunction('My\\Stuff\\myFunc')
                    .call(
                        null,
                        valueFactory.createInteger(10),
                        valueFactory.createInteger(7)
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

        it('should throw when the specified variable is not defined', function () {
            expect(function () {
                state.setGlobal('myUndefinedGlobal', 987654);
            }).to.throw(
                'PHPState.setGlobal() :: Variable "myUndefinedGlobal" is not defined in the global scope'
            );
        });
    });
});
