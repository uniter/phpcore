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
    sinon = require('sinon'),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    FunctionFactory = require('../../src/FunctionFactory').sync(),
    PHPFatalError = require('phpcommon').PHPFatalError,
    PHPObject = require('../../src/PHPObject').sync(),
    MethodSpec = require('../../src/MethodSpec'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    StaticPropertyReference = require('../../src/Reference/StaticProperty'),
    UndeclaredStaticPropertyReference = require('../../src/Reference/UndeclaredStaticProperty'),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Class', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.functionFactory = sinon.createStubInstance(FunctionFactory);
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);
        this.superClass = sinon.createStubInstance(Class);
        this.valueFactory = new ValueFactory(null, this.callStack);
        this.InternalClass = sinon.stub();
        this.interfaceObject = sinon.createStubInstance(Class);
        this.interfaceObject.is.withArgs('My\\Interface').returns(true);
        this.namespaceScope.getClass.withArgs('My\\Interface').returns(this.interfaceObject);

        this.createClass = function (constructorName, superClass, valueFactory) {
            this.classObject = new Class(
                valueFactory || this.valueFactory,
                this.functionFactory,
                this.callStack,
                'My\\Class\\Path\\Here',
                constructorName,
                this.InternalClass,
                {
                    myFirstStaticProp: {
                        visibility: 'public',
                        value: function () {
                            return this.valueFactory.createString('my static prop value');
                        }.bind(this)
                    }
                },
                {},
                superClass,
                ['My\\Interface'],
                this.namespaceScope
            );
        }.bind(this);
        this.createClass('__construct', null);
    });

    describe('callMethod()', function () {
        describe('when the object is an instance of the native constructor', function () {
            beforeEach(function () {
                this.nativeObject = sinon.createStubInstance(this.InternalClass);
                this.objectValue = sinon.createStubInstance(ObjectValue);
                this.objectValue.getObject.returns(this.nativeObject);

                this.callMethod = function (methodName, args, isForwardingStaticCall) {
                    return this.classObject.callMethod(
                        methodName,
                        args,
                        this.objectValue,
                        null,
                        null,
                        !!isForwardingStaticCall
                    );
                }.bind(this);
            });

            describe('when the method is defined with the same case', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethod = this.methodFunction;
                    this.createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    this.methodFunction.returns(resultValue);
                    this.classObject.disableAutoCoercion();

                    expect(this.callMethod('myMethod', [argValue])).to.equal(resultValue);
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    this.methodFunction.returns('the result');
                    this.classObject.enableAutoCoercion();

                    resultValue = this.callMethod('myMethod', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith('the arg');
                });

                describe('for a forwarding static call', function () {
                    it('should not pass along the static class', function () {
                        var resultValue = sinon.createStubInstance(Value);
                        this.methodFunction.returns(resultValue);
                        this.classObject.disableAutoCoercion();

                        this.callMethod('myMethod', [], true);

                        expect(this.functionFactory.setNewStaticClassIfWrapped).not.to.have.been.called;
                    });
                });

                describe('for a non-forwarding static call', function () {
                    it('should pass along the static class', function () {
                        var resultValue = sinon.createStubInstance(Value);
                        this.methodFunction.returns(resultValue);
                        this.classObject.disableAutoCoercion();

                        this.callMethod('myMethod', [], false);

                        expect(this.functionFactory.setNewStaticClassIfWrapped).to.have.been.calledOnce;
                        expect(this.functionFactory.setNewStaticClassIfWrapped).to.have.been.calledWith(
                            sinon.match.same(this.methodFunction),
                            sinon.match.same(this.classObject)
                        );
                    });
                });
            });

            describe('when the method is defined with differing case', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethodWITHWRONGcase = this.methodFunction;
                    this.createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    this.methodFunction.returns(resultValue);
                    this.classObject.disableAutoCoercion();

                    expect(this.callMethod('myMethodWithWrongCase', [argValue])).to.equal(resultValue);
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    this.methodFunction.returns('the result');
                    this.classObject.enableAutoCoercion();

                    resultValue = this.callMethod('myMethodWithWrongCase', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when an own property is defined with the same name as the method', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethod = this.methodFunction;
                    this.nativeObject.myMethod = sinon.stub(); // Should be ignored
                    this.createClass('__construct', null);
                });

                it('should ignore the property and call the method when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    this.methodFunction.returns(resultValue);
                    this.classObject.disableAutoCoercion();

                    expect(this.callMethod('myMethod', [argValue])).to.equal(resultValue);
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should ignore the property and call the method when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    this.methodFunction.returns('the result');
                    this.classObject.enableAutoCoercion();

                    resultValue = this.callMethod('myMethod', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when the method is not defined', function () {
                it('should throw a PHPFatalError', function () {
                    this.createClass('__construct', null);

                    expect(function () {
                        this.callMethod('myMissingMethod', []);
                    }.bind(this)).to.throw(
                        PHPFatalError,
                        'Call to undefined method My\\Class\\Path\\Here::myMissingMethod()'
                    );
                });
            });
        });

        describe('when the object is not an instance of the native constructor (eg. JSObject/Closure)', function () {
            beforeEach(function () {
                this.nativeObject = {};
                this.objectValue = sinon.createStubInstance(ObjectValue);
                this.superClass = null;

                this.callMethod = function (methodName, args) {
                    return this.classObject.callMethod(
                        methodName,
                        args,
                        this.objectValue
                    );
                }.bind(this);
            });

            describe('when the method is defined with the same case', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethod = this.methodFunction;
                    this.createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    this.methodFunction.returns(resultValue);
                    this.classObject.disableAutoCoercion();

                    expect(this.callMethod('myMethod', [argValue])).to.equal(resultValue);
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    this.methodFunction.returns('the result');
                    this.classObject.enableAutoCoercion();

                    resultValue = this.callMethod('myMethod', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when the method is defined with differing case', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethodWITHWRONGcase = this.methodFunction;
                    this.createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    this.methodFunction.returns(resultValue);
                    this.classObject.disableAutoCoercion();

                    expect(this.callMethod('myMethodWithWrongCase', [argValue])).to.equal(resultValue);
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    this.methodFunction.returns('the result');
                    this.classObject.enableAutoCoercion();

                    resultValue = this.callMethod('myMethodWithWrongCase', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when an own property is defined with the same name as the method', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethod = this.methodFunction;
                    this.nativeObject.myMethod = sinon.stub(); // Should be ignored
                    this.createClass('__construct', null);
                });

                it('should ignore the property and call the method when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    this.methodFunction.returns(resultValue);
                    this.classObject.disableAutoCoercion();

                    expect(this.callMethod('myMethod', [argValue])).to.equal(resultValue);
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should ignore the property and call the method when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    this.methodFunction.returns('the result');
                    this.classObject.enableAutoCoercion();

                    resultValue = this.callMethod('myMethod', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(this.methodFunction).to.have.been.calledOnce;
                    expect(this.methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when the method is not defined', function () {
                it('should throw a PHPFatalError', function () {
                    this.createClass('__construct', null);

                    expect(function () {
                        this.callMethod('myMissingMethod', []);
                    }.bind(this)).to.throw(
                        PHPFatalError,
                        'Call to undefined method My\\Class\\Path\\Here::myMissingMethod()'
                    );
                });
            });
        });
    });

    describe('construct()', function () {
        beforeEach(function () {
            this.objectValue = sinon.createStubInstance(ObjectValue);
            this.constructorMethod = sinon.stub();
            this.nativeObject = new this.InternalClass();
            this.InternalClass.prototype.__construct = this.constructorMethod;
            this.objectValue.getObject.returns(this.nativeObject);
        });

        describe('when this class defines a constructor', function () {
            beforeEach(function () {
                this.createClass('__construct', this.superClass);
            });

            it('should not call the superclass\' constructor', function () {
                this.classObject.construct(this.objectValue);

                expect(this.superClass.construct).not.to.have.been.called;
            });

            it('should call the constructor method', function () {
                var arg1Value = this.valueFactory.createString('hello'),
                    arg2Value = this.valueFactory.createString('world');

                this.classObject.construct(this.objectValue, [arg1Value, arg2Value]);

                expect(this.constructorMethod).to.have.been.calledOnce;
                expect(this.constructorMethod.args[0][0].getNative()).to.equal('hello');
                expect(this.constructorMethod.args[0][1].getNative()).to.equal('world');
            });
        });

        describe('when this class does not define a constructor', function () {
            beforeEach(function () {
                this.createClass(null, this.superClass);
            });

            it('should call the superclass\' constructor', function () {
                this.classObject.construct(this.objectValue);

                expect(this.superClass.construct).to.have.been.calledOnce;
                expect(this.superClass.construct).to.have.been.calledWith(
                    sinon.match.same(this.objectValue)
                );
            });

            it('should not call any method on the object', function () {
                this.classObject.construct(this.objectValue, [1, 2]);

                expect(this.objectValue.callMethod).not.to.have.been.called;
            });
        });
    });

    describe('getConstantByName()', function () {
        it('should return the FQCN for the magic `::class` constant', function () {
            this.createClass('__construct', this.superClass);

            expect(this.classObject.getConstantByName('class').getNative()).to.equal('My\\Class\\Path\\Here');
        });
    });

    describe('getMethodSpec()', function () {
        beforeEach(function () {
            this.methodSpec = sinon.createStubInstance(MethodSpec);
            this.functionFactory.createMethodSpec.returns(this.methodSpec);
        });

        describe('when the object is an instance of the native constructor', function () {
            beforeEach(function () {
                this.nativeObject = sinon.createStubInstance(this.InternalClass);
                this.objectValue = sinon.createStubInstance(ObjectValue);
                this.objectValue.getObject.returns(this.nativeObject);
            });

            describe('when the method is defined with the same case', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethod = this.methodFunction;
                    this.createClass('__construct', null);
                });

                it('should create and return a MethodSpec with the correct info', function () {
                    expect(this.classObject.getMethodSpec('myMethod')).to.equal(this.methodSpec);
                    expect(this.functionFactory.createMethodSpec).to.have.been.calledOnce;
                    expect(this.functionFactory.createMethodSpec).to.have.been.calledWith(
                        sinon.match.same(this.classObject),
                        sinon.match.same(this.classObject),
                        'myMethod',
                        sinon.match.same(this.methodFunction)
                    );
                });
            });

            describe('when the method is defined with differing case', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethodWITHWRONGcase = this.methodFunction;
                    this.createClass('__construct', null);
                });

                it('should create and return a MethodSpec with the correct info', function () {
                    expect(this.classObject.getMethodSpec('myMethodWithWrongCase')).to.equal(this.methodSpec);
                    expect(this.functionFactory.createMethodSpec).to.have.been.calledOnce;
                    expect(this.functionFactory.createMethodSpec).to.have.been.calledWith(
                        sinon.match.same(this.classObject),
                        sinon.match.same(this.classObject),
                        'myMethodWithWrongCase',
                        sinon.match.same(this.methodFunction)
                    );
                });
            });

            describe('when an own property is defined with the same name as the method', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethod = this.methodFunction;
                    this.nativeObject.myMethod = sinon.stub(); // Should be ignored
                    this.createClass('__construct', null);
                });

                it('should ignore the property and create and return a MethodSpec with the correct info', function () {
                    expect(this.classObject.getMethodSpec('myMethod')).to.equal(this.methodSpec);
                    expect(this.functionFactory.createMethodSpec).to.have.been.calledOnce;
                    expect(this.functionFactory.createMethodSpec).to.have.been.calledWith(
                        sinon.match.same(this.classObject),
                        sinon.match.same(this.classObject),
                        'myMethod',
                        sinon.match.same(this.methodFunction)
                    );
                });
            });

            describe('when the method is not defined', function () {
                it('should return null', function () {
                    this.createClass('__construct', null);

                    expect(this.classObject.getMethodSpec('myMethod')).to.be.null;
                });
            });
        });

        describe('when the object is not an instance of the native constructor (eg. JSObject/Closure)', function () {
            beforeEach(function () {
                this.nativeObject = {};
                this.objectValue = sinon.createStubInstance(ObjectValue);
                this.superClass = null;
            });

            describe('when the method is defined with the same case', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethod = this.methodFunction;
                    this.createClass('__construct', null);
                });

                it('should create and return a MethodSpec with the correct info', function () {
                    expect(this.classObject.getMethodSpec('myMethod')).to.equal(this.methodSpec);
                    expect(this.functionFactory.createMethodSpec).to.have.been.calledOnce;
                    expect(this.functionFactory.createMethodSpec).to.have.been.calledWith(
                        sinon.match.same(this.classObject),
                        sinon.match.same(this.classObject),
                        'myMethod',
                        sinon.match.same(this.methodFunction)
                    );
                });
            });

            describe('when the method is defined with differing case', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethodWITHWRONGcase = this.methodFunction;
                    this.createClass('__construct', null);
                });

                it('should create and return a MethodSpec with the correct info', function () {
                    expect(this.classObject.getMethodSpec('myMethodWithWrongCase')).to.equal(this.methodSpec);
                    expect(this.functionFactory.createMethodSpec).to.have.been.calledOnce;
                    expect(this.functionFactory.createMethodSpec).to.have.been.calledWith(
                        sinon.match.same(this.classObject),
                        sinon.match.same(this.classObject),
                        'myMethodWithWrongCase',
                        sinon.match.same(this.methodFunction)
                    );
                });
            });

            describe('when an own property is defined with the same name as the method', function () {
                beforeEach(function () {
                    this.methodFunction = sinon.stub();
                    this.InternalClass.prototype.myMethod = this.methodFunction;
                    this.nativeObject.myMethod = sinon.stub(); // Should be ignored
                    this.createClass('__construct', null);
                });

                it('should create and return a MethodSpec with the correct info', function () {
                    expect(this.classObject.getMethodSpec('myMethod')).to.equal(this.methodSpec);
                    expect(this.functionFactory.createMethodSpec).to.have.been.calledOnce;
                    expect(this.functionFactory.createMethodSpec).to.have.been.calledWith(
                        sinon.match.same(this.classObject),
                        sinon.match.same(this.classObject),
                        'myMethod',
                        sinon.match.same(this.methodFunction)
                    );
                });
            });

            describe('when the method is not defined', function () {
                it('should return null', function () {
                    this.createClass('__construct', null);

                    expect(this.classObject.getMethodSpec('myMethod')).to.be.null;
                });
            });
        });
    });

    describe('getStaticPropertyByName()', function () {
        it('should be able to fetch a static property defined by the current class', function () {
            this.createClass('__construct', null);

            expect(this.classObject.getStaticPropertyByName('myFirstStaticProp').getValue().getNative())
                .to.equal('my static prop value');
        });

        it('should be able to fetch a static property defined by the parent class', function () {
            var staticProperty = sinon.createStubInstance(StaticPropertyReference);
            staticProperty.getValue.returns(this.valueFactory.createString('my inherited static prop value'));
            this.superClass.getStaticPropertyByName
                .withArgs('myInheritedStaticProp')
                .returns(staticProperty);

            this.createClass('__construct', this.superClass);

            expect(this.classObject.getStaticPropertyByName('myInheritedStaticProp').getValue().getNative())
                .to.equal('my inherited static prop value');
        });

        it('should return an UndeclaredStaticPropertyReference when the property is not defined', function () {
            var propertyReference;
            this.createClass('__construct', null);

            propertyReference = this.classObject.getStaticPropertyByName('myUndeclaredStaticProp');

            expect(propertyReference).to.be.an.instanceOf(UndeclaredStaticPropertyReference);
        });
    });

    describe('getSuperClass()', function () {
        it('should return the parent of this class when it has one', function () {
            this.createClass('__construct', this.superClass);

            expect(this.classObject.getSuperClass()).to.equal(this.superClass);
        });

        it('should return null when this class does not have a parent', function () {
            this.createClass('__construct', null);

            expect(this.classObject.getSuperClass()).to.be.null;
        });
    });

    describe('instantiate()', function () {
        beforeEach(function () {
            this.objectValue = sinon.createStubInstance(ObjectValue);
            this.createClass('__construct', this.superClass);
        });

        it('should call the internal constructor with arguments wrapped by default', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);
            sinon.stub(this.valueFactory, 'createObject').returns(this.objectValue);

            this.classObject.instantiate([arg1, arg2]);

            expect(this.InternalClass).to.have.been.calledOnce;
            expect(this.InternalClass).to.have.been.calledOn(sinon.match.same(this.objectValue));
            expect(this.InternalClass).to.have.been.calledWith(
                sinon.match.same(arg1),
                sinon.match.same(arg2)
            );
        });

        it('should call the internal constructor with arguments unwrapped with auto-coercion enabled', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);
            sinon.stub(this.valueFactory, 'createObject').returns(this.objectValue);
            arg1.getNative.returns(21);
            arg2.getNative.returns('second');
            this.classObject.enableAutoCoercion();

            this.classObject.instantiate([arg1, arg2]);

            expect(this.InternalClass).to.have.been.calledOnce;
            expect(this.InternalClass).to.have.been.calledOn(sinon.match.same(this.objectValue));
            expect(this.InternalClass).to.have.been.calledWith(21, 'second');
        });

        it('should wrap an instance of the InternalClass in an ObjectValue', function () {
            sinon.stub(this.valueFactory, 'createObject').returns(this.objectValue);

            this.classObject.instantiate([]);

            expect(this.valueFactory.createObject).to.have.been.calledOnce;
            expect(this.valueFactory.createObject).to.have.been.calledWith(
                sinon.match.instanceOf(this.InternalClass)
            );
        });

        it('should return the created object', function () {
            sinon.stub(this.valueFactory, 'createObject').returns(this.objectValue);

            expect(this.classObject.instantiate([])).to.equal(this.objectValue);
        });
    });

    describe('is()', function () {
        beforeEach(function () {
            this.createClass('__construct', this.superClass);
        });

        it('should return true for the current class name case-insensitively', function () {
            expect(this.classObject.is('my\\CLASS\\path\\hEre')).to.be.true;
        });

        it('should return true when the superclass reports with true', function () {
            this.superClass.is.withArgs('Some\\Parent\\Class\\Path\\Here').returns(true);

            expect(this.classObject.is('Some\\Parent\\Class\\Path\\Here')).to.be.true;
        });

        it('should return false when not the current class or an ancestor class', function () {
            this.superClass.is.returns(false);

            expect(this.classObject.is('Some\\Class\\Or\\Other')).to.be.false;
        });

        it('should return true when this class implements the interface', function () {
            this.superClass.is.returns(false);

            expect(this.classObject.is('My\\Interface')).to.be.true;
        });

        it('should return false when this class does not implement the interface', function () {
            this.superClass.is.returns(false);

            expect(this.classObject.is('Not\\My\\Interface')).to.be.false;
        });
    });

    describe('isAutoCoercionEnabled()', function () {
        it('should return false by default', function () {
            expect(this.classObject.isAutoCoercionEnabled()).to.be.false;
        });

        it('should return true when enabled', function () {
            this.classObject.enableAutoCoercion();

            expect(this.classObject.isAutoCoercionEnabled()).to.be.true;
        });

        it('should return false when re-disabled', function () {
            this.classObject.enableAutoCoercion();
            this.classObject.disableAutoCoercion();

            expect(this.classObject.isAutoCoercionEnabled()).to.be.false;
        });
    });

    describe('isInFamilyOf()', function () {
        it('should return true when the same class is passed in', function () {
            expect(this.classObject.isInFamilyOf(this.classObject)).to.be.true;
        });

        it('should return true when this class extends the provided one', function () {
            var superClass = sinon.createStubInstance(Class);
            this.createClass('__construct', superClass);

            expect(this.classObject.isInFamilyOf(superClass)).to.be.true;
        });

        it('should return true when the provided class extends this one', function () {
            var childClass = sinon.createStubInstance(Class);
            childClass.extends.withArgs(sinon.match.same(this.classObject)).returns(true);

            expect(this.classObject.isInFamilyOf(childClass)).to.be.true;
        });

        it('should return false when the provided class has no relation to this one', function () {
            var foreignClass = sinon.createStubInstance(Class);
            foreignClass.extends.withArgs(sinon.match.same(this.classObject)).returns(false);

            expect(this.classObject.isInFamilyOf(foreignClass)).to.be.false;
        });
    });

    describe('proxyInstanceForJS()', function () {
        it('should return a PHPObject that wraps the provided instance of this class', function () {
            var instance = sinon.createStubInstance(ObjectValue),
                phpObject = sinon.createStubInstance(PHPObject);
            sinon.stub(this.valueFactory, 'createPHPObject').withArgs(sinon.match.same(instance)).returns(phpObject);

            expect(this.classObject.proxyInstanceForJS(instance)).to.equal(phpObject);
        });
    });

    describe('unwrapInstanceForJS()', function () {
        describe('when an unwrapper is defined', function () {
            it('should use the unwrapper to unwrap correctly when auto-coercion is disabled', function () {
                var instance = sinon.createStubInstance(ObjectValue),
                    nativeObject = {};
                instance.getProperty.withArgs('myProp').returns(this.valueFactory.createString('my first result'));
                this.classObject.defineUnwrapper(function () {
                    return {yourProp: this.getProperty('myProp').getNative()};
                });

                expect(this.classObject.unwrapInstanceForJS(instance, nativeObject)).to.deep.equal({
                    yourProp: 'my first result'
                });
            });

            it('should use the unwrapper to unwrap correctly when auto-coercion is enabled', function () {
                var instance = sinon.createStubInstance(ObjectValue),
                    nativeObject = {myProp: 'my second result'};
                this.classObject.defineUnwrapper(function () {
                    return {yourProp: this.myProp};
                });
                this.classObject.enableAutoCoercion();

                expect(this.classObject.unwrapInstanceForJS(instance, nativeObject)).to.deep.equal({
                    yourProp: 'my second result'
                });
            });
        });

        describe('when no unwrapper is defined', function () {
            it('should return an instance of the generated UnwrappedClass, able to call methods', function () {
                var instance = sinon.createStubInstance(ObjectValue),
                    nativeObject = {myProp: 4},
                    unwrapped;
                instance.callMethod.withArgs('doubleMyPropAndAdd', 21).returns(this.valueFactory.createInteger(29));
                sinon.stub(this.valueFactory, 'createPHPObject').callsFake(function (objectValue) {
                    var phpObject = sinon.createStubInstance(PHPObject);
                    phpObject.callMethod.callsFake(function (name, args) {
                        return objectValue.callMethod(name, args).getNative();
                    });
                    return phpObject;
                });
                this.InternalClass.prototype.doubleMyPropAndAdd = function () {};

                unwrapped = this.classObject.unwrapInstanceForJS(instance, nativeObject);

                expect(unwrapped.doubleMyPropAndAdd(21)).to.equal(29);
            });

            it('should always return the same instance of the generated UnwrappedClass for each ObjectValue', function () {
                var existingUnwrapped,
                    instance = sinon.createStubInstance(ObjectValue),
                    nativeObject = {myProp: 4};
                existingUnwrapped = this.classObject.unwrapInstanceForJS(instance, nativeObject);

                expect(this.classObject.unwrapInstanceForJS(instance, nativeObject)).to.equal(existingUnwrapped);
            });

            it('should map the unwrapped object back to the original ObjectValue', function () {
                var instance = sinon.createStubInstance(ObjectValue),
                    nativeObject = {myProp: 'my second result'};
                sinon.stub(this.valueFactory, 'mapUnwrappedObjectToValue');

                this.classObject.unwrapInstanceForJS(instance, nativeObject);

                expect(this.valueFactory.mapUnwrappedObjectToValue).to.have.been.calledOnce;
                expect(this.valueFactory.mapUnwrappedObjectToValue).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(instance)
                );
            });
        });
    });
});
