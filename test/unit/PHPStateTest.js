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
    beforeEach(function () {
        this.installedBuiltinTypes = {};
        this.optionSet = sinon.createStubInstance(OptionSet);
        this.stdin = sinon.createStubInstance(Stream);
        this.stdout = sinon.createStubInstance(Stream);
        this.stderr = sinon.createStubInstance(Stream);
        this.pausable = {};
        this.runtime = sinon.createStubInstance(Runtime);
        this.valueFactory = new ValueFactory();

        this.state = new PHPState(
            this.runtime,
            this.installedBuiltinTypes,
            this.stdin,
            this.stdout,
            this.stderr,
            this.pausable,
            'async'
        );
    });

    describe('constructor', function () {
        it('should install non-namespaced classes into the global namespace', function () {
            this.state = new PHPState(
                this.runtime,
                {
                    classes: {
                        'MyClass': function () {
                            return sinon.stub();
                        }
                    }
                },
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable,
                'async'
            );

            expect(this.state.getGlobalNamespace().hasClass('MyClass')).to.be.true;
        });

        it('should install namespaced classes into the correct namespace', function () {
            var MyClass = sinon.stub();
            this.state = new PHPState(
                this.runtime,
                {
                    classes: {
                        'Some\\Stuff\\AClass': function () {
                            return MyClass;
                        }
                    }
                },
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable,
                'async'
            );

            expect(this.state.getGlobalNamespace().hasClass('AClass')).to.be.false;
            expect(this.state.getGlobalNamespace().getDescendant('Some\\Stuff').hasClass('AClass')).to.be.true;
        });

        it('should throw if a class that does not extend another attempts to call its superconstructor', function () {
            var AClass;
            this.state = new PHPState(
                this.runtime,
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
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable,
                'async'
            );
            AClass = this.state.getGlobalNamespace().getClass('Some\\Stuff\\AClass');

            expect(function () {
                AClass.instantiate();
            }.bind(this)).to.throw(
                'Cannot call superconstructor: no superclass is defined for class "Some\\Stuff\\AClass"'
            );
        });

        it('should allow function group factories to access constants early', function () {
            this.state = new PHPState(
                this.runtime,
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
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable,
                'async'
            );

            expect(this.state.getGlobalNamespace().getFunction('getMyConstant').call().getNative()).to.equal(21);
        });

        it('should define functions correctly with a FunctionSpec', function () {
            this.state = new PHPState(
                this.runtime,
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
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable,
                'async'
            );

            expect(this.state.getGlobalNamespace().getFunction('myFunction').functionSpec.getFunctionName())
                .to.equal('myFunction');
        });

        it('should install any option groups as options', function () {
            this.state = new PHPState(
                this.runtime,
                {},
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable,
                'async',
                [
                    function (internals) {
                        return {
                            myOption: internals.valueFactory.createString('my option value')
                        };
                    }
                ]
            );

            expect(this.state.getOptions().myOption.getType()).to.equal('string');
            expect(this.state.getOptions().myOption.getNative()).to.equal('my option value');
        });

        it('should install any initial options as options', function () {
            this.state = new PHPState(
                this.runtime,
                {},
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable,
                'async',
                [],
                {
                    yourOption: 21
                }
            );

            expect(this.state.getOptions().yourOption).to.equal(21);
        });

        it('should install any binding groups', function () {
            this.state = new PHPState(
                this.runtime,
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
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable,
                'async'
            );

            expect(this.state.getBinding('my_binding')).to.equal(21);
        });

        it('should install any default INI options, allowing access to constants early', function () {
            this.state = new PHPState(
                this.runtime,
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
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable,
                'async'
            );

            expect(this.state.getINIOption('my_ini_setting')).to.equal(212);
        });

        it('should install any translations', function () {
            this.state = new PHPState(
                this.runtime,
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
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable,
                'sync'
            );

            expect(
                this.state.getTranslator().translate('some_namespace.my_key', {name: 'Fred'})
            ).to.equal('Hello there Fred!');
        });

        ['async', 'sync', 'psync'].forEach(function (mode) {
            it('should expose the current synchronicity mode when "' + mode + '"', function () {
                this.state = new PHPState(
                    this.runtime,
                    {},
                    this.stdin,
                    this.stdout,
                    this.stderr,
                    this.pausable,
                    mode,
                    [
                        function (internals) {
                            return {
                                myMode: internals.mode
                            };
                        }
                    ]
                );

                expect(this.state.getOptions().myMode).to.equal(mode);
            });
        });

        it('should expose the error configuration', function () {
            this.state = new PHPState(
                this.runtime,
                {},
                this.stdin,
                this.stdout,
                this.stderr,
                this.pausable,
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

            expect(this.state.getOptions().myErrorReportingLevel).to.equal(1234);
        });

        it('should throw an error if the specified binding is not defined', function () {
            expect(function () {
                /*jshint nonew:false */
                new PHPState(
                    this.runtime,
                    {
                        functionGroups: [
                            function (internals) {
                                internals.getBinding('some_undefined_binding');
                            }
                        ]
                    },
                    this.stdin,
                    this.stdout,
                    this.stderr,
                    this.pausable,
                    'async'
                );
            }.bind(this)).to.throw(Exception, 'No binding is defined with name "some_undefined_binding"');
        });

        it('should throw an error if any option group attempts to access a binding too early', function () {
            expect(function () {
                this.state = new PHPState(
                    this.runtime,
                    {},
                    this.stdin,
                    this.stdout,
                    this.stderr,
                    this.pausable,
                    'async',
                    [
                        function (internals) {
                            internals.getBinding('my_binding');
                        }
                    ]
                );
            }.bind(this)).to.throw(Exception, 'Option groups cannot access bindings too early');
        });
    });

    describe('defineCoercingFunction()', function () {
        it('should define a function that coerces its return value and unwraps its arguments', function () {
            var resultValue;
            this.state.defineCoercingFunction('double_it', function (numberToDouble) {
                return numberToDouble * 2;
            });

            resultValue = this.state.getGlobalNamespace().getFunction('double_it')(
                this.state.getValueFactory().createInteger(21)
            );

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(42);
        });

        it('should define a function correctly with a FunctionSpec', function () {
            this.state.defineCoercingFunction('my_function', function () {});

            expect(this.state.getGlobalNamespace().getFunction('my_function').functionSpec.getFunctionName())
                .to.equal('my_function');
        });
    });

    describe('defineConstant()', function () {
        it('should define a constant on the correct namespace', function () {
            this.state.defineConstant('\\My\\Stuff\\MY_CONST', 21, {caseInsensitive: true});

            expect(this.state.getGlobalNamespace().getDescendant('My\\Stuff').getConstant('my_COnsT').getNative())
                .to.equal(21);
        });
    });

    describe('defineGlobal()', function () {
        it('should define the global and assign it the given value', function () {
            var value = this.valueFactory.createInteger(27);

            this.state.defineGlobal('MY_GLOB', value);

            expect(this.state.getGlobalScope().getVariable('MY_GLOB').getValue().getNative()).to.equal(27);
        });
    });

    describe('defineGlobalAccessor()', function () {
        it('should install a getter for the global', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            valueGetter.returns(21);

            this.state.defineGlobalAccessor('MY_GLOB', valueGetter, valueSetter);

            expect(this.state.getGlobalScope().getVariable('MY_GLOB').getValue().getNative()).to.equal(21);
        });

        it('should install a setter for the global', function () {
            var value = this.valueFactory.createInteger(27),
                valueGetter = sinon.stub(),
                valueSetter = sinon.spy();

            this.state.defineGlobalAccessor('MY_GLOB', valueGetter, valueSetter);
            this.state.getGlobalScope().getVariable('MY_GLOB').setValue(value);

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter).to.have.been.calledWith(27);
        });
    });

    describe('defineNonCoercingFunction()', function () {
        it('should define a function that coerces its return value but does not unwrap its arguments', function () {
            var resultValue;
            this.state.defineNonCoercingFunction('double_it', function (numberToDoubleReference) {
                return numberToDoubleReference.getValue().getNative() * 2;
            });

            resultValue = this.state.getGlobalNamespace().getFunction('double_it')(
                this.state.getValueFactory().createInteger(21)
            );

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(42);
        });

        it('should define a function correctly with a FunctionSpec', function () {
            this.state.defineNonCoercingFunction('my_function', function () {});

            expect(this.state.getGlobalNamespace().getFunction('my_function').functionSpec.getFunctionName())
                .to.equal('my_function');
        });
    });

    describe('defineSuperGlobal()', function () {
        it('should define the superglobal and assign it the given value', function () {
            var value = this.valueFactory.createInteger(101);

            this.state.defineSuperGlobal('MY_SUPER_GLOB', value);

            expect(this.state.getSuperGlobalScope().getVariable('MY_SUPER_GLOB').getValue().getNative()).to.equal(101);
        });
    });

    describe('defineSuperGlobalAccessor()', function () {
        it('should install a getter for the superglobal', function () {
            var valueGetter = sinon.stub(),
                valueSetter = sinon.spy();
            valueGetter.returns(21);

            this.state.defineSuperGlobalAccessor('MY_SUPER_GLOB', valueGetter, valueSetter);

            expect(this.state.getSuperGlobalScope().getVariable('MY_SUPER_GLOB').getValue().getNative()).to.equal(21);
        });

        it('should install a setter for the superglobal', function () {
            var value = this.valueFactory.createInteger(27),
                valueGetter = sinon.stub(),
                valueSetter = sinon.spy();

            this.state.defineSuperGlobalAccessor('MY_SUPER_GLOB', valueGetter, valueSetter);
            this.state.getSuperGlobalScope().getVariable('MY_SUPER_GLOB').setValue(value);

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter).to.have.been.calledWith(27);
        });
    });

    describe('getConstant()', function () {
        it('should return the native value of the constant from the global namespace when defined', function () {
            var value = this.valueFactory.createString('my value');
            this.state.getGlobalNamespace().defineConstant('MY_CONST', value);

            expect(this.state.getConstant('MY_CONST')).to.equal('my value');
        });

        it('should return null when the constant is not defined', function () {
            expect(this.state.getConstant('MY_UNDEFINED_CONST')).to.be.null;
        });
    });

    describe('getErrorReporting()', function () {
        it('should return the ErrorReporting service', function () {
            expect(this.state.getErrorReporting()).to.be.an.instanceOf(ErrorReporting);
        });
    });

    describe('getLoader()', function () {
        it('should return a Loader', function () {
            expect(this.state.getLoader()).to.be.an.instanceOf(Loader);
        });
    });

    describe('getOutput()', function () {
        it('should return an Output', function () {
            expect(this.state.getOutput()).to.be.an.instanceOf(Output);
        });

        it('should return an Output connected up to stdout', function () {
            this.state.getOutput().write('good evening');

            expect(this.stdout.write).to.have.been.calledOnce;
            expect(this.stdout.write).to.have.been.calledWith('good evening');
        });
    });

    describe('getScopeFactory()', function () {
        it('should return a ScopeFactory', function () {
            expect(this.state.getScopeFactory()).to.be.an.instanceOf(ScopeFactory);
        });
    });

    describe('getTranslator()', function () {
        it('should return the Translator service', function () {
            expect(this.state.getTranslator()).to.be.an.instanceOf(Translator);
        });
    });
});
