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
    PHPObject = require('../../src/PHPObject').sync(),
    MethodSpec = require('../../src/MethodSpec'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    StaticPropertyReference = require('../../src/Reference/StaticProperty'),
    UndeclaredStaticPropertyReference = require('../../src/Reference/UndeclaredStaticProperty'),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Class', function () {
    var callStack,
        classObject,
        createClass,
        functionFactory,
        interfaceObject,
        namespaceScope,
        superClass,
        valueFactory,
        InternalClass;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        functionFactory = sinon.createStubInstance(FunctionFactory);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        superClass = sinon.createStubInstance(Class);
        valueFactory = new ValueFactory(null, callStack);
        InternalClass = sinon.stub();
        interfaceObject = sinon.createStubInstance(Class);
        interfaceObject.is
            .withArgs('My\\Interface')
            .returns(true);
        namespaceScope.getClass
            .withArgs('My\\Interface')
            .returns(interfaceObject);

        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        createClass = function (constructorName, superClass, constants) {
            classObject = new Class(
                valueFactory,
                functionFactory,
                callStack,
                'My\\Class\\Path\\Here',
                constructorName,
                InternalClass,
                InternalClass.prototype,
                {
                    myPublicStaticProp: {
                        visibility: 'public',
                        value: function () {
                            return valueFactory.createString('my public static prop value');
                        }
                    },
                    myProtectedStaticProp: {
                        visibility: 'protected',
                        value: function () {
                            return valueFactory.createString('my protected static prop value');
                        }
                    },
                    myPrivateStaticProp: {
                        visibility: 'private',
                        value: function () {
                            return valueFactory.createString('my private static prop value');
                        }
                    }
                },
                constants || {},
                superClass,
                ['My\\Interface'],
                namespaceScope
            );
        };
        createClass('__construct', null);
    });

    describe('callMethod()', function () {
        describe('when the object is an instance of the native constructor', function () {
            var callMethod,
                nativeObject,
                objectValue;

            beforeEach(function () {
                nativeObject = sinon.createStubInstance(InternalClass);
                objectValue = sinon.createStubInstance(ObjectValue);
                objectValue.getObject.returns(nativeObject);

                callMethod = function (methodName, args, isForwardingStaticCall) {
                    return classObject.callMethod(
                        methodName,
                        args,
                        objectValue,
                        null,
                        null,
                        !!isForwardingStaticCall
                    );
                };
            });

            describe('when the method is defined with the same case', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethod = methodFunction;
                    createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    methodFunction.returns(resultValue);
                    classObject.disableAutoCoercion();

                    expect(callMethod('myMethod', [argValue])).to.equal(resultValue);
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    methodFunction.returns('the result');
                    classObject.enableAutoCoercion();

                    resultValue = callMethod('myMethod', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith('the arg');
                });

                describe('for a forwarding static call', function () {
                    it('should not pass along the static class', function () {
                        var resultValue = sinon.createStubInstance(Value);
                        methodFunction.returns(resultValue);
                        classObject.disableAutoCoercion();

                        callMethod('myMethod', [], true);

                        expect(functionFactory.setNewStaticClassIfWrapped).not.to.have.been.called;
                    });
                });

                describe('for a non-forwarding static call', function () {
                    it('should pass along the static class', function () {
                        var resultValue = sinon.createStubInstance(Value);
                        methodFunction.returns(resultValue);
                        classObject.disableAutoCoercion();

                        callMethod('myMethod', [], false);

                        expect(functionFactory.setNewStaticClassIfWrapped).to.have.been.calledOnce;
                        expect(functionFactory.setNewStaticClassIfWrapped).to.have.been.calledWith(
                            sinon.match.same(methodFunction),
                            sinon.match.same(classObject)
                        );
                    });
                });
            });

            describe('when the method is defined with differing case', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethodWITHWRONGcase = methodFunction;
                    createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    methodFunction.returns(resultValue);
                    classObject.disableAutoCoercion();

                    expect(callMethod('myMethodWithWrongCase', [argValue])).to.equal(resultValue);
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    methodFunction.returns('the result');
                    classObject.enableAutoCoercion();

                    resultValue = callMethod('myMethodWithWrongCase', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when an own property is defined with the same name as the method', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethod = methodFunction;
                    nativeObject.myMethod = sinon.stub(); // Should be ignored
                    createClass('__construct', null);
                });

                it('should ignore the property and call the method when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    methodFunction.returns(resultValue);
                    classObject.disableAutoCoercion();

                    expect(callMethod('myMethod', [argValue])).to.equal(resultValue);
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should ignore the property and call the method when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    methodFunction.returns('the result');
                    classObject.enableAutoCoercion();

                    resultValue = callMethod('myMethod', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when the method is not defined', function () {
                it('should throw a PHPFatalError', function () {
                    createClass('__construct', null);

                    expect(function () {
                        callMethod('myMissingMethod', []);
                    }).to.throw(
                        'Fake PHP Fatal error for #core.undefined_method with {"className":"My\\\\Class\\\\Path\\\\Here","methodName":"myMissingMethod"}'
                    );
                });
            });
        });

        describe('when the object is not an instance of the native constructor (eg. JSObject/Closure)', function () {
            var callMethod,
                nativeObject,
                objectValue;

            beforeEach(function () {
                nativeObject = {};
                objectValue = sinon.createStubInstance(ObjectValue);
                superClass = null;

                callMethod = function (methodName, args) {
                    return classObject.callMethod(
                        methodName,
                        args,
                        objectValue
                    );
                };
            });

            describe('when the method is defined with the same case', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethod = methodFunction;
                    createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    methodFunction.returns(resultValue);
                    classObject.disableAutoCoercion();

                    expect(callMethod('myMethod', [argValue])).to.equal(resultValue);
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    methodFunction.returns('the result');
                    classObject.enableAutoCoercion();

                    resultValue = callMethod('myMethod', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when the method is defined with differing case', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethodWITHWRONGcase = methodFunction;
                    createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    methodFunction.returns(resultValue);
                    classObject.disableAutoCoercion();

                    expect(callMethod('myMethodWithWrongCase', [argValue])).to.equal(resultValue);
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    methodFunction.returns('the result');
                    classObject.enableAutoCoercion();

                    resultValue = callMethod('myMethodWithWrongCase', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when an own property is defined with the same name as the method', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethod = methodFunction;
                    nativeObject.myMethod = sinon.stub(); // Should be ignored
                    createClass('__construct', null);
                });

                it('should ignore the property and call the method when auto coercion is disabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = sinon.createStubInstance(Value);
                    methodFunction.returns(resultValue);
                    classObject.disableAutoCoercion();

                    expect(callMethod('myMethod', [argValue])).to.equal(resultValue);
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should ignore the property and call the method when auto coercion is enabled', function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    methodFunction.returns('the result');
                    classObject.enableAutoCoercion();

                    resultValue = callMethod('myMethod', [argValue]);

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith('the arg');
                });
            });

            describe('when the method is not defined', function () {
                it('should throw a PHPFatalError', function () {
                    createClass('__construct', null);

                    expect(function () {
                        callMethod('myMissingMethod', []);
                    }).to.throw(
                        'Fake PHP Fatal error for #core.undefined_method with {"className":"My\\\\Class\\\\Path\\\\Here","methodName":"myMissingMethod"}'
                    );
                });
            });
        });
    });

    describe('construct()', function () {
        var constructorMethod,
            nativeObject,
            objectValue;

        beforeEach(function () {
            objectValue = sinon.createStubInstance(ObjectValue);
            constructorMethod = sinon.stub();
            nativeObject = new InternalClass();
            InternalClass.prototype.__construct = constructorMethod;
            objectValue.getObject.returns(nativeObject);
        });

        describe('when this class defines a constructor', function () {
            beforeEach(function () {
                createClass('__construct', superClass);
            });

            it('should not call the superclass\' constructor', function () {
                classObject.construct(objectValue);

                expect(superClass.construct).not.to.have.been.called;
            });

            it('should call the constructor method', function () {
                var arg1Value = valueFactory.createString('hello'),
                    arg2Value = valueFactory.createString('world');

                classObject.construct(objectValue, [arg1Value, arg2Value]);

                expect(constructorMethod).to.have.been.calledOnce;
                expect(constructorMethod.args[0][0].getNative()).to.equal('hello');
                expect(constructorMethod.args[0][1].getNative()).to.equal('world');
            });
        });

        describe('when this class does not define a constructor', function () {
            beforeEach(function () {
                createClass(null, superClass);
            });

            it('should call the superclass\' constructor', function () {
                classObject.construct(objectValue);

                expect(superClass.construct).to.have.been.calledOnce;
                expect(superClass.construct).to.have.been.calledWith(
                    sinon.match.same(objectValue)
                );
            });

            it('should not call any method on the object', function () {
                classObject.construct(objectValue, [1, 2]);

                expect(objectValue.callMethod).not.to.have.been.called;
            });
        });
    });

    describe('getConstantByName()', function () {
        beforeEach(function () {
            interfaceObject.getConstantByName.throws(new Error('Constant not defined'));
            superClass.getConstantByName.throws(new Error('Constant not defined'));
        });

        it('should return the FQCN for the magic `::class` constant', function () {
            createClass('__construct', superClass);

            expect(classObject.getConstantByName('class').getNative()).to.equal('My\\Class\\Path\\Here');
        });

        it('should be able to fetch a constant defined by the current class', function () {
            createClass('__construct', superClass, {
                'MY_CONST': function () {
                    return valueFactory.createString('my value');
                }
            });

            expect(classObject.getConstantByName('MY_CONST').getNative()).to.equal('my value');
        });

        it('should be able to fetch a constant defined by an interface implemented directly by the current class', function () {
            interfaceObject.getConstantByName
                .withArgs('MY_INTERFACE_CONST')
                .returns(valueFactory.createString('my value from interface'));
            createClass('__construct', superClass);

            expect(classObject.getConstantByName('MY_INTERFACE_CONST').getNative())
                .to.equal('my value from interface');
        });

        it('should be able to fetch a constant defined by the superclass (or other ancestor)', function () {
            superClass.getConstantByName
                .withArgs('MY_SUPER_CONST')
                .returns(valueFactory.createString('my value from superclass'));
            createClass('__construct', superClass);

            expect(classObject.getConstantByName('MY_SUPER_CONST').getNative())
                .to.equal('my value from superclass');
        });

        it('should raise the correct error when the constant is not defined in the class hierarchy', function () {
            createClass('__construct', null);

            expect(function () {
                classObject.getConstantByName('MY_CONST');
            }).to.throw(
                'Fake PHP Fatal error for #core.undefined_class_constant with {"name":"MY_CONST"}'
            );
        });
    });

    describe('getMethodSpec()', function () {
        var methodSpec;

        beforeEach(function () {
            methodSpec = sinon.createStubInstance(MethodSpec);
            functionFactory.createMethodSpec.returns(methodSpec);
        });

        describe('when the object is an instance of the native constructor', function () {
            var nativeObject,
                objectValue;

            beforeEach(function () {
                nativeObject = sinon.createStubInstance(InternalClass);
                objectValue = sinon.createStubInstance(ObjectValue);
                objectValue.getObject.returns(nativeObject);
            });

            describe('when the method is defined with the same case', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethod = methodFunction;
                    createClass('__construct', null);
                });

                it('should create and return a MethodSpec with the correct info', function () {
                    expect(classObject.getMethodSpec('myMethod')).to.equal(methodSpec);
                    expect(functionFactory.createMethodSpec).to.have.been.calledOnce;
                    expect(functionFactory.createMethodSpec).to.have.been.calledWith(
                        sinon.match.same(classObject),
                        sinon.match.same(classObject),
                        'myMethod',
                        sinon.match.same(methodFunction)
                    );
                });
            });

            describe('when the method is defined with differing case', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethodWITHWRONGcase = methodFunction;
                    createClass('__construct', null);
                });

                it('should create and return a MethodSpec with the correct info', function () {
                    expect(classObject.getMethodSpec('myMethodWithWrongCase')).to.equal(methodSpec);
                    expect(functionFactory.createMethodSpec).to.have.been.calledOnce;
                    expect(functionFactory.createMethodSpec).to.have.been.calledWith(
                        sinon.match.same(classObject),
                        sinon.match.same(classObject),
                        'myMethodWithWrongCase',
                        sinon.match.same(methodFunction)
                    );
                });
            });

            describe('when an own property is defined with the same name as the method', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethod = methodFunction;
                    nativeObject.myMethod = sinon.stub(); // Should be ignored
                    createClass('__construct', null);
                });

                it('should ignore the property and create and return a MethodSpec with the correct info', function () {
                    expect(classObject.getMethodSpec('myMethod')).to.equal(methodSpec);
                    expect(functionFactory.createMethodSpec).to.have.been.calledOnce;
                    expect(functionFactory.createMethodSpec).to.have.been.calledWith(
                        sinon.match.same(classObject),
                        sinon.match.same(classObject),
                        'myMethod',
                        sinon.match.same(methodFunction)
                    );
                });
            });

            describe('when the method is not defined', function () {
                it('should return null', function () {
                    createClass('__construct', null);

                    expect(classObject.getMethodSpec('myMethod')).to.be.null;
                });
            });
        });

        describe('when the object is not an instance of the native constructor (eg. JSObject/Closure)', function () {
            var nativeObject,
                objectValue;

            beforeEach(function () {
                nativeObject = {};
                objectValue = sinon.createStubInstance(ObjectValue);
                superClass = null;
            });

            describe('when the method is defined with the same case', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethod = methodFunction;
                    createClass('__construct', null);
                });

                it('should create and return a MethodSpec with the correct info', function () {
                    expect(classObject.getMethodSpec('myMethod')).to.equal(methodSpec);
                    expect(functionFactory.createMethodSpec).to.have.been.calledOnce;
                    expect(functionFactory.createMethodSpec).to.have.been.calledWith(
                        sinon.match.same(classObject),
                        sinon.match.same(classObject),
                        'myMethod',
                        sinon.match.same(methodFunction)
                    );
                });
            });

            describe('when the method is defined with differing case', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethodWITHWRONGcase = methodFunction;
                    createClass('__construct', null);
                });

                it('should create and return a MethodSpec with the correct info', function () {
                    expect(classObject.getMethodSpec('myMethodWithWrongCase')).to.equal(methodSpec);
                    expect(functionFactory.createMethodSpec).to.have.been.calledOnce;
                    expect(functionFactory.createMethodSpec).to.have.been.calledWith(
                        sinon.match.same(classObject),
                        sinon.match.same(classObject),
                        'myMethodWithWrongCase',
                        sinon.match.same(methodFunction)
                    );
                });
            });

            describe('when an own property is defined with the same name as the method', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethod = methodFunction;
                    nativeObject.myMethod = sinon.stub(); // Should be ignored
                    createClass('__construct', null);
                });

                it('should create and return a MethodSpec with the correct info', function () {
                    expect(classObject.getMethodSpec('myMethod')).to.equal(methodSpec);
                    expect(functionFactory.createMethodSpec).to.have.been.calledOnce;
                    expect(functionFactory.createMethodSpec).to.have.been.calledWith(
                        sinon.match.same(classObject),
                        sinon.match.same(classObject),
                        'myMethod',
                        sinon.match.same(methodFunction)
                    );
                });
            });

            describe('when the method is not defined', function () {
                it('should return null', function () {
                    createClass('__construct', null);

                    expect(classObject.getMethodSpec('myMethod')).to.be.null;
                });
            });
        });
    });

    describe('getStaticPropertyByName()', function () {
        var ancestorClass,
            descendantClass,
            foreignClass;

        beforeEach(function () {
            ancestorClass = sinon.createStubInstance(Class);
            descendantClass = sinon.createStubInstance(Class);
            foreignClass = sinon.createStubInstance(Class);

            ancestorClass.getName.returns('MyAncestorClass');
            descendantClass.getName.returns('MyDescendantClass');
            foreignClass.getName.returns('MyForeignClass');

            ancestorClass.extends.withArgs(sinon.match.same(ancestorClass)).returns(false);
            ancestorClass.extends.withArgs(sinon.match.same(classObject)).returns(false);
            ancestorClass.extends.withArgs(sinon.match.same(descendantClass)).returns(false);
            ancestorClass.extends.withArgs(sinon.match.same(foreignClass)).returns(false);
            descendantClass.extends.withArgs(sinon.match.same(ancestorClass)).returns(true);
            descendantClass.extends.withArgs(sinon.match.same(classObject)).returns(true);
            descendantClass.extends.withArgs(sinon.match.same(descendantClass)).returns(false);
            descendantClass.extends.withArgs(sinon.match.same(foreignClass)).returns(false);
            foreignClass.extends.withArgs(sinon.match.same(ancestorClass)).returns(false);
            foreignClass.extends.withArgs(sinon.match.same(classObject)).returns(false);
            foreignClass.extends.withArgs(sinon.match.same(descendantClass)).returns(false);
            foreignClass.extends.withArgs(sinon.match.same(foreignClass)).returns(false);

            ancestorClass.getSuperClass.returns(null);
            descendantClass.getSuperClass.returns(classObject);
            foreignClass.getSuperClass.returns(null);

            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(true);
            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);
            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(true);
            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(false);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(true);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(true);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(true);
        });

        describe('for an undefined property', function () {
            it('should return an UndeclaredStaticPropertyReference', function () {
                var propertyReference;
                createClass('__construct', null);

                propertyReference = classObject.getStaticPropertyByName('myUndeclaredStaticProp');

                expect(propertyReference).to.be.an.instanceOf(UndeclaredStaticPropertyReference);
            });
        });

        describe('for a public property', function () {
            beforeEach(function () {
                createClass('__construct', ancestorClass);
            });

            it('should be able to fetch a static property defined by the parent class', function () {
                var staticProperty = sinon.createStubInstance(StaticPropertyReference);
                staticProperty.getValue.returns(valueFactory.createString('my inherited static prop value'));
                ancestorClass.getStaticPropertyByName
                    .withArgs('myInheritedStaticProp')
                    .returns(staticProperty);

                expect(classObject.getStaticPropertyByName('myInheritedStaticProp').getValue().getNative())
                    .to.equal('my inherited static prop value');
            });

            it('should return when not inside any class', function () {
                var staticProperty = classObject.getStaticPropertyByName('myPublicStaticProp');

                expect(staticProperty).to.be.an.instanceOf(StaticPropertyReference);
                expect(staticProperty.getName()).to.equal('myPublicStaticProp');
                expect(staticProperty.getVisibility()).to.equal('public');
                expect(staticProperty.getValue().getNative()).to.equal('my public static prop value');
            });

            it('should return when inside a class that is not the defining one', function () {
                var staticProperty;
                callStack.getCurrentClass.returns(foreignClass);

                staticProperty = classObject.getStaticPropertyByName('myPublicStaticProp');

                expect(staticProperty).to.be.an.instanceOf(StaticPropertyReference);
                expect(staticProperty.getName()).to.equal('myPublicStaticProp');
                expect(staticProperty.getVisibility()).to.equal('public');
                expect(staticProperty.getValue().getNative()).to.equal('my public static prop value');
            });
        });

        describe('for a protected property', function () {
            it('should return when inside the defining class', function () {
                var staticProperty;
                callStack.getCurrentClass.returns(classObject);

                staticProperty = classObject.getStaticPropertyByName('myProtectedStaticProp');

                expect(staticProperty).to.be.an.instanceOf(StaticPropertyReference);
                expect(staticProperty.getName()).to.equal('myProtectedStaticProp');
                expect(staticProperty.getVisibility()).to.equal('protected');
                expect(staticProperty.getValue().getNative()).to.equal('my protected static prop value');
            });

            it('should throw a fatal error when inside a class that is not in the family of the definer', function () {
                callStack.getCurrentClass.returns(foreignClass);

                expect(function () {
                    classObject.getStaticPropertyByName('myProtectedStaticProp');
                }).to.throw(
                    'Fake PHP Fatal error for #core.cannot_access_property with ' +
                    '{"className":"My\\\\Class\\\\Path\\\\Here","propertyName":"myProtectedStaticProp","visibility":"protected"}'
                );
            });

            it('should return when inside a class that is an ancestor of the definer', function () {
                var staticProperty;
                callStack.getCurrentClass.returns(ancestorClass);

                staticProperty = classObject.getStaticPropertyByName('myProtectedStaticProp');

                expect(staticProperty).to.be.an.instanceOf(StaticPropertyReference);
                expect(staticProperty.getName()).to.equal('myProtectedStaticProp');
                expect(staticProperty.getVisibility()).to.equal('protected');
                expect(staticProperty.getValue().getNative()).to.equal('my protected static prop value');
            });

            it('should return when inside a class that is a descendant of the definer', function () {
                var staticProperty;
                callStack.getCurrentClass.returns(descendantClass);

                staticProperty = classObject.getStaticPropertyByName('myProtectedStaticProp');

                expect(staticProperty).to.be.an.instanceOf(StaticPropertyReference);
                expect(staticProperty.getName()).to.equal('myProtectedStaticProp');
                expect(staticProperty.getVisibility()).to.equal('protected');
                expect(staticProperty.getValue().getNative()).to.equal('my protected static prop value');
            });
        });

        describe('for a private property', function () {
            it('should return when inside the defining class', function () {
                var staticProperty;
                callStack.getCurrentClass.returns(classObject);

                staticProperty = classObject.getStaticPropertyByName('myPrivateStaticProp');

                expect(staticProperty).to.be.an.instanceOf(StaticPropertyReference);
                expect(staticProperty.getName()).to.equal('myPrivateStaticProp');
                expect(staticProperty.getVisibility()).to.equal('private');
                expect(staticProperty.getValue().getNative()).to.equal('my private static prop value');
            });

            it('should throw a fatal error when inside a class that is not in the family of the definer', function () {
                callStack.getCurrentClass.returns(foreignClass);

                expect(function () {
                    classObject.getStaticPropertyByName('myPrivateStaticProp');
                }).to.throw(
                    'Fake PHP Fatal error for #core.cannot_access_property with ' +
                    '{"className":"My\\\\Class\\\\Path\\\\Here","propertyName":"myPrivateStaticProp","visibility":"private"}'
                );
            });

            it('should throw a fatal error when inside a class that is an ancestor of the definer', function () {
                callStack.getCurrentClass.returns(ancestorClass);

                expect(function () {
                    classObject.getStaticPropertyByName('myPrivateStaticProp');
                }).to.throw(
                    'Fake PHP Fatal error for #core.cannot_access_property with ' +
                    '{"className":"My\\\\Class\\\\Path\\\\Here","propertyName":"myPrivateStaticProp","visibility":"private"}'
                );
            });

            it('should throw a fatal error when inside a class that is a descendant of the definer', function () {
                callStack.getCurrentClass.returns(descendantClass);

                expect(function () {
                    classObject.getStaticPropertyByName('myPrivateStaticProp');
                }).to.throw(
                    'Fake PHP Fatal error for #core.cannot_access_property with ' +
                    '{"className":"My\\\\Class\\\\Path\\\\Here","propertyName":"myPrivateStaticProp","visibility":"private"}'
                );
            });
        });
    });

    describe('getSuperClass()', function () {
        it('should return the parent of this class when it has one', function () {
            createClass('__construct', superClass);

            expect(classObject.getSuperClass()).to.equal(superClass);
        });

        it('should return null when this class does not have a parent', function () {
            createClass('__construct', null);

            expect(classObject.getSuperClass()).to.be.null;
        });
    });

    describe('instantiate()', function () {
        var objectValue;

        beforeEach(function () {
            objectValue = sinon.createStubInstance(ObjectValue);
            createClass('__construct', superClass);
        });

        it('should call the internal constructor with arguments wrapped by default', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);
            sinon.stub(valueFactory, 'createObject').returns(objectValue);

            classObject.instantiate([arg1, arg2]);

            expect(InternalClass).to.have.been.calledOnce;
            expect(InternalClass).to.have.been.calledOn(sinon.match.same(objectValue));
            expect(InternalClass).to.have.been.calledWith(
                sinon.match.same(arg1),
                sinon.match.same(arg2)
            );
        });

        it('should call the internal constructor with arguments unwrapped with auto-coercion enabled', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);
            sinon.stub(valueFactory, 'createObject').returns(objectValue);
            arg1.getNative.returns(21);
            arg2.getNative.returns('second');
            classObject.enableAutoCoercion();

            classObject.instantiate([arg1, arg2]);

            expect(InternalClass).to.have.been.calledOnce;
            expect(InternalClass).to.have.been.calledOn(sinon.match.same(objectValue));
            expect(InternalClass).to.have.been.calledWith(21, 'second');
        });

        it('should call the userland constructor for the current class', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value),
                constructor = sinon.stub();
            arg1.getNative.returns(21);
            arg2.getNative.returns('second');
            InternalClass.prototype.__construct = constructor;

            classObject.instantiate([arg1, arg2]);

            expect(constructor).to.have.been.calledOnce;
        });

        it('should wrap an instance of the InternalClass in an ObjectValue', function () {
            sinon.stub(valueFactory, 'createObject').returns(objectValue);

            classObject.instantiate([]);

            expect(valueFactory.createObject).to.have.been.calledOnce;
            expect(valueFactory.createObject).to.have.been.calledWith(
                sinon.match.instanceOf(InternalClass)
            );
        });

        it('should return the created object', function () {
            sinon.stub(valueFactory, 'createObject').returns(objectValue);

            expect(classObject.instantiate([])).to.equal(objectValue);
        });
    });

    describe('instantiateBare()', function () {
        var objectValue;

        beforeEach(function () {
            objectValue = sinon.createStubInstance(ObjectValue);
            createClass('__construct', superClass);
        });

        it('should call the internal constructor with arguments wrapped by default', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);
            sinon.stub(valueFactory, 'createObject').returns(objectValue);

            classObject.instantiateBare([arg1, arg2]);

            expect(InternalClass).to.have.been.calledOnce;
            expect(InternalClass).to.have.been.calledOn(sinon.match.same(objectValue));
            expect(InternalClass).to.have.been.calledWith(
                sinon.match.same(arg1),
                sinon.match.same(arg2)
            );
        });

        it('should call the internal constructor with arguments unwrapped with auto-coercion enabled', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);
            sinon.stub(valueFactory, 'createObject').returns(objectValue);
            arg1.getNative.returns(21);
            arg2.getNative.returns('second');
            classObject.enableAutoCoercion();

            classObject.instantiateBare([arg1, arg2]);

            expect(InternalClass).to.have.been.calledOnce;
            expect(InternalClass).to.have.been.calledOn(sinon.match.same(objectValue));
            expect(InternalClass).to.have.been.calledWith(21, 'second');
        });

        it('should not call the userland constructor for the current class', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value),
                constructor = sinon.stub();
            arg1.getNative.returns(21);
            arg2.getNative.returns('second');
            InternalClass.prototype.__construct = constructor;

            classObject.instantiateBare([arg1, arg2]);

            expect(constructor).not.to.have.been.called;
        });

        it('should wrap an instance of the InternalClass in an ObjectValue', function () {
            sinon.stub(valueFactory, 'createObject').returns(objectValue);

            classObject.instantiateBare([]);

            expect(valueFactory.createObject).to.have.been.calledOnce;
            expect(valueFactory.createObject).to.have.been.calledWith(
                sinon.match.instanceOf(InternalClass)
            );
        });

        it('should return the created object', function () {
            sinon.stub(valueFactory, 'createObject').returns(objectValue);

            expect(classObject.instantiateBare([])).to.equal(objectValue);
        });
    });

    describe('is()', function () {
        beforeEach(function () {
            createClass('__construct', superClass);
        });

        it('should return true for the current class name case-insensitively', function () {
            expect(classObject.is('my\\CLASS\\path\\hEre')).to.be.true;
        });

        it('should return true when the superclass reports with true', function () {
            superClass.is.withArgs('Some\\Parent\\Class\\Path\\Here').returns(true);

            expect(classObject.is('Some\\Parent\\Class\\Path\\Here')).to.be.true;
        });

        it('should return false when not the current class or an ancestor class', function () {
            superClass.is.returns(false);

            expect(classObject.is('Some\\Class\\Or\\Other')).to.be.false;
        });

        it('should return true when this class implements the interface', function () {
            superClass.is.returns(false);

            expect(classObject.is('My\\Interface')).to.be.true;
        });

        it('should return false when this class does not implement the interface', function () {
            superClass.is.returns(false);

            expect(classObject.is('Not\\My\\Interface')).to.be.false;
        });
    });

    describe('isAutoCoercionEnabled()', function () {
        it('should return false by default', function () {
            expect(classObject.isAutoCoercionEnabled()).to.be.false;
        });

        it('should return true when enabled', function () {
            classObject.enableAutoCoercion();

            expect(classObject.isAutoCoercionEnabled()).to.be.true;
        });

        it('should return false when re-disabled', function () {
            classObject.enableAutoCoercion();
            classObject.disableAutoCoercion();

            expect(classObject.isAutoCoercionEnabled()).to.be.false;
        });
    });

    describe('isInFamilyOf()', function () {
        it('should return true when the same class is passed in', function () {
            expect(classObject.isInFamilyOf(classObject)).to.be.true;
        });

        it('should return true when this class extends the provided one', function () {
            var superClass = sinon.createStubInstance(Class);
            createClass('__construct', superClass);

            expect(classObject.isInFamilyOf(superClass)).to.be.true;
        });

        it('should return true when the provided class extends this one', function () {
            var childClass = sinon.createStubInstance(Class);
            childClass.extends.withArgs(sinon.match.same(classObject)).returns(true);

            expect(classObject.isInFamilyOf(childClass)).to.be.true;
        });

        it('should return false when the provided class has no relation to this one', function () {
            var foreignClass = sinon.createStubInstance(Class);
            foreignClass.extends.withArgs(sinon.match.same(classObject)).returns(false);

            expect(classObject.isInFamilyOf(foreignClass)).to.be.false;
        });
    });

    describe('proxyInstanceForJS()', function () {
        it('should return a PHPObject that wraps the provided instance of this class', function () {
            var instance = sinon.createStubInstance(ObjectValue),
                phpObject = sinon.createStubInstance(PHPObject);
            sinon.stub(valueFactory, 'createPHPObject').withArgs(sinon.match.same(instance)).returns(phpObject);

            expect(classObject.proxyInstanceForJS(instance)).to.equal(phpObject);
        });
    });

    describe('unwrapInstanceForJS()', function () {
        describe('when an unwrapper is defined', function () {
            it('should use the unwrapper to unwrap correctly when auto-coercion is disabled', function () {
                var instance = sinon.createStubInstance(ObjectValue),
                    nativeObject = {};
                instance.getProperty.withArgs('myProp').returns(valueFactory.createString('my first result'));
                classObject.defineUnwrapper(function () {
                    return {yourProp: this.getProperty('myProp').getNative()};
                });

                expect(classObject.unwrapInstanceForJS(instance, nativeObject)).to.deep.equal({
                    yourProp: 'my first result'
                });
            });

            it('should use the unwrapper to unwrap correctly when auto-coercion is enabled', function () {
                var instance = sinon.createStubInstance(ObjectValue),
                    nativeObject = {myProp: 'my second result'};
                classObject.defineUnwrapper(function () {
                    return {yourProp: this.myProp};
                });
                classObject.enableAutoCoercion();

                expect(classObject.unwrapInstanceForJS(instance, nativeObject)).to.deep.equal({
                    yourProp: 'my second result'
                });
            });
        });

        describe('when no unwrapper is defined', function () {
            it('should return an instance of the generated UnwrappedClass, able to call methods', function () {
                var instance = sinon.createStubInstance(ObjectValue),
                    nativeObject = {myProp: 4},
                    unwrapped;
                instance.callMethod.withArgs('doubleMyPropAndAdd', 21).returns(valueFactory.createInteger(29));
                sinon.stub(valueFactory, 'createPHPObject').callsFake(function (objectValue) {
                    var phpObject = sinon.createStubInstance(PHPObject);
                    phpObject.callMethod.callsFake(function (name, args) {
                        return objectValue.callMethod(name, args).getNative();
                    });
                    return phpObject;
                });
                InternalClass.prototype.doubleMyPropAndAdd = function () {};

                unwrapped = classObject.unwrapInstanceForJS(instance, nativeObject);

                expect(unwrapped.doubleMyPropAndAdd(21)).to.equal(29);
            });

            it('should also proxy methods inherited from the prototype chain', function () {
                var instance = sinon.createStubInstance(ObjectValue),
                    nativeObject = {myProp: 4},
                    unwrapped;
                instance.callMethod
                    .withArgs('doubleMyPropAndAdd', 21)
                    .returns(valueFactory.createInteger(29));
                sinon.stub(valueFactory, 'createPHPObject').callsFake(function (objectValue) {
                    var phpObject = sinon.createStubInstance(PHPObject);
                    phpObject.callMethod.callsFake(function (name, args) {
                        return objectValue.callMethod(name, args).getNative();
                    });
                    return phpObject;
                });
                InternalClass.prototype = Object.create({
                    // Define the method up the prototype chain
                    doubleMyPropAndAdd: function () {}
                });

                unwrapped = classObject.unwrapInstanceForJS(instance, nativeObject);

                expect(unwrapped.doubleMyPropAndAdd(21)).to.equal(29);
            });

            it('should always return the same instance of the generated UnwrappedClass for each ObjectValue', function () {
                var existingUnwrapped,
                    instance = sinon.createStubInstance(ObjectValue),
                    nativeObject = {myProp: 4};
                existingUnwrapped = classObject.unwrapInstanceForJS(instance, nativeObject);

                expect(classObject.unwrapInstanceForJS(instance, nativeObject)).to.equal(existingUnwrapped);
            });

            it('should map the unwrapped object back to the original ObjectValue', function () {
                var instance = sinon.createStubInstance(ObjectValue),
                    nativeObject = {myProp: 'my second result'};
                sinon.stub(valueFactory, 'mapUnwrappedObjectToValue');

                classObject.unwrapInstanceForJS(instance, nativeObject);

                expect(valueFactory.mapUnwrappedObjectToValue).to.have.been.calledOnce;
                expect(valueFactory.mapUnwrappedObjectToValue).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(instance)
                );
            });
        });
    });
});
