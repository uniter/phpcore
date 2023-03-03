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
    expect = require('chai').expect,
    sinon = require('sinon'),
    tools = require('./tools'),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    ExportRepository = require('../../src/FFI/Export/ExportRepository'),
    FFIFactory = require('../../src/FFI/FFIFactory'),
    FunctionFactory = require('../../src/FunctionFactory').sync(),
    MethodSpec = require('../../src/MethodSpec'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    PHPObject = require('../../src/FFI/Value/PHPObject').sync(),
    PropertyReference = require('../../src/Reference/Property'),
    Reference = require('../../src/Reference/Reference'),
    ReferenceFactory = require('../../src/ReferenceFactory').sync(),
    StaticPropertyReference = require('../../src/Reference/StaticProperty'),
    UndeclaredStaticPropertyReference = require('../../src/Reference/UndeclaredStaticProperty'),
    Value = require('../../src/Value').sync(),
    Userland = require('../../src/Control/Userland'),
    ValueCoercer = require('../../src/FFI/Value/ValueCoercer');

describe('Class', function () {
    var callStack,
        classObject,
        constructorMethod,
        createClass,
        exportRepository,
        ffiFactory,
        flow,
        functionFactory,
        futureFactory,
        interfaceObject,
        methodCaller,
        namespaceScope,
        referenceFactory,
        state,
        superClass,
        userland,
        valueCoercer,
        valueFactory,
        valueProvider,
        InternalClass;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        callStack = sinon.createStubInstance(CallStack);
        exportRepository = sinon.createStubInstance(ExportRepository);
        ffiFactory = sinon.createStubInstance(FFIFactory);
        flow = state.getFlow();
        functionFactory = sinon.createStubInstance(FunctionFactory);
        futureFactory = state.getFutureFactory();
        methodCaller = null;
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        referenceFactory = sinon.createStubInstance(ReferenceFactory);
        superClass = sinon.createStubInstance(Class);
        userland = sinon.createStubInstance(Userland);
        valueCoercer = sinon.createStubInstance(ValueCoercer);
        valueFactory = state.getValueFactory();
        valueProvider = state.getValueProvider();
        InternalClass = sinon.stub();
        constructorMethod = sinon.stub().returns(valueFactory.createNull());
        InternalClass.prototype.__construct = constructorMethod;
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

        referenceFactory.createStaticProperty.callsFake(function (name, classObject, visibility, value) {
            var reference = sinon.createStubInstance(StaticPropertyReference);

            reference.getName.returns(name);
            reference.getValue.returns(value);
            reference.getVisibility.returns(visibility);

            reference.setValue.callsFake(function (newValue) {
                // Ensure the setter's resulting Future-ish is awaited.
                return valueFactory.createAsyncMacrotaskFuture(function (resolve) {
                    reference.getValue.returns(newValue);
                    resolve(newValue);
                });
            });

            return reference;
        });
        referenceFactory.createUndeclaredStaticProperty.callsFake(function (name) {
            var reference = sinon.createStubInstance(UndeclaredStaticPropertyReference);

            reference.getName.returns(name);

            return reference;
        });

        superClass.construct.returns(valueFactory.createNull());

        userland.enterIsolated.callsFake(function (executor) {
            return valueFactory.maybeFuturise(executor);
        });

        valueCoercer.coerceArguments.callsFake(function (argumentValues) {
            if (valueCoercer.isAutoCoercionEnabled()) {
                argumentValues = _.map(argumentValues, function (argumentValue) {
                    return argumentValue.getNative();
                });
            }

            return argumentValues;
        });
        valueCoercer.isAutoCoercionEnabled.returns(false);

        createClass = function (constructorName, superClass, constants) {
            classObject = new Class(
                valueFactory,
                valueProvider,
                referenceFactory,
                functionFactory,
                callStack,
                flow,
                futureFactory,
                userland,
                'My\\Class\\Path\\Here',
                constructorName,
                InternalClass,
                InternalClass.prototype,
                {
                    myPrivateInstanceProp: {
                        visibility: 'private',
                        value: function () {
                            return valueFactory.createString('my private instance prop value');
                        }
                    }
                },
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
                [interfaceObject],
                namespaceScope,
                exportRepository,
                valueCoercer,
                ffiFactory,
                methodCaller
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

                it('should be called and the result returned when auto coercion is disabled', async function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = valueFactory.createString('my result');
                    methodFunction.returns(resultValue);
                    valueCoercer.isAutoCoercionEnabled.returns(false);

                    expect(await callMethod('myMethod', [argValue]).toPromise()).to.equal(resultValue);
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', async function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    methodFunction.returns(valueFactory.createString('the result'));
                    valueCoercer.isAutoCoercionEnabled.returns(true);

                    resultValue = await callMethod('myMethod', [argValue]).toPromise();

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction.args[0][0].getNative()).to.equal('the arg');
                });

                describe('for a forwarding static call', function () {
                    it('should not pass along the static class', async function () {
                        var resultValue = valueFactory.createString('my result');
                        methodFunction.returns(resultValue);
                        valueCoercer.isAutoCoercionEnabled.returns(false);

                        await callMethod('myMethod', [], true).toPromise();

                        expect(functionFactory.setNewStaticClassIfWrapped).not.to.have.been.called;
                    });
                });

                describe('for a non-forwarding static call', function () {
                    it('should pass along the static class', async function () {
                        var resultValue = valueFactory.createString('my result');
                        methodFunction.returns(resultValue);
                        valueCoercer.isAutoCoercionEnabled.returns(false);

                        await callMethod('myMethod', [], false).toPromise();

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

                it('should be called and the result returned when auto coercion is disabled', async function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = valueFactory.createString('my result');
                    methodFunction.returns(resultValue);
                    valueCoercer.isAutoCoercionEnabled.returns(false);

                    expect(await callMethod('myMethodWithWrongCase', [argValue]).toPromise()).to.equal(resultValue);
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', async function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    methodFunction.returns(valueFactory.createString('the result'));
                    valueCoercer.isAutoCoercionEnabled.returns(true);

                    resultValue = await callMethod('myMethodWithWrongCase', [argValue]).toPromise();

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction.args[0][0].getNative()).to.equal('the arg');
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

                it('should ignore the property and call the method when auto coercion is disabled', async function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = valueFactory.createString('my result');
                    methodFunction.returns(resultValue);
                    valueCoercer.isAutoCoercionEnabled.returns(false);

                    expect(await callMethod('myMethod', [argValue]).toPromise()).to.equal(resultValue);
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should ignore the property and call the method when auto coercion is enabled', async function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    methodFunction.returns(valueFactory.createString('the result'));
                    valueCoercer.isAutoCoercionEnabled.returns(true);

                    resultValue = await callMethod('myMethod', [argValue]).toPromise();

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction.args[0][0].getNative()).equal('the arg');
                });
            });

            describe('when the method is not defined', function () {
                it('should throw a PHPFatalError', async function () {
                    createClass('__construct', null);

                    await expect(callMethod('myMissingMethod', []).toPromise()).to.eventually.be.rejectedWith(
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

                it('should be called and the result returned when auto coercion is disabled', async function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = valueFactory.createString('my result');
                    methodFunction.returns(resultValue);
                    valueCoercer.isAutoCoercionEnabled.returns(false);

                    expect(await callMethod('myMethod', [argValue]).toPromise()).to.equal(resultValue);
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', async function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    methodFunction.returns(valueFactory.createString('the result'));
                    valueCoercer.isAutoCoercionEnabled.returns(true);

                    resultValue = await callMethod('myMethod', [argValue]).toPromise();

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction.args[0][0].getNative()).equal('the arg');
                });
            });

            describe('when the method is defined with differing case', function () {
                var methodFunction;

                beforeEach(function () {
                    methodFunction = sinon.stub();
                    InternalClass.prototype.myMethodWITHWRONGcase = methodFunction;
                    createClass('__construct', null);
                });

                it('should be called and the result returned when auto coercion is disabled', async function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = valueFactory.createString('my result');
                    methodFunction.returns(resultValue);
                    valueCoercer.isAutoCoercionEnabled.returns(false);

                    expect(await callMethod('myMethodWithWrongCase', [argValue]).toPromise()).to.equal(resultValue);
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should be called and the result returned when auto coercion is enabled', async function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    methodFunction.returns(valueFactory.createString('the result'));
                    valueCoercer.isAutoCoercionEnabled.returns(true);

                    resultValue = await callMethod('myMethodWithWrongCase', [argValue]).toPromise();

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction.args[0][0].getNative()).to.equal('the arg');
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

                it('should ignore the property and call the method when auto coercion is disabled', async function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue = valueFactory.createString('my result');
                    methodFunction.returns(resultValue);
                    valueCoercer.isAutoCoercionEnabled.returns(false);

                    expect(await callMethod('myMethod', [argValue]).toPromise()).to.equal(resultValue);
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction).to.have.been.calledWith(sinon.match.same(argValue));
                });

                it('should ignore the property and call the method when auto coercion is enabled', async function () {
                    var argValue = sinon.createStubInstance(Value),
                        resultValue;
                    argValue.getNative.returns('the arg');
                    methodFunction.returns(valueFactory.createString('the result'));
                    valueCoercer.isAutoCoercionEnabled.returns(true);

                    resultValue = await callMethod('myMethod', [argValue]).toPromise();

                    expect(resultValue).to.be.an.instanceOf(Value);
                    expect(resultValue.getNative()).to.equal('the result');
                    expect(methodFunction).to.have.been.calledOnce;
                    expect(methodFunction.args[0][0].getNative()).to.equal('the arg');
                });
            });

            describe('when the method is not defined', function () {
                it('should throw a PHPFatalError', async function () {
                    createClass('__construct', null);

                    await expect(callMethod('myMissingMethod', []).toPromise()).to.eventually.be.rejectedWith(
                        'Fake PHP Fatal error for #core.undefined_method with {"className":"My\\\\Class\\\\Path\\\\Here","methodName":"myMissingMethod"}'
                    );
                });
            });
        });

        describe('when a custom method caller is given', function () {
            var argReference1,
                argFutureValue2,
                objectValue;

            beforeEach(function () {
                methodCaller = sinon.stub();
                createClass('__construct', null);

                objectValue = sinon.createStubInstance(ObjectValue);
                argReference1 = sinon.createStubInstance(Reference);
                argReference1.getValue.returns(valueFactory.createAsyncPresent('my first future arg'));
                argFutureValue2 = valueFactory.createAsyncPresent('my second future arg');
            });

            it('should invoke the method caller with arguments resolved to present values', async function () {
                await classObject.callMethod('myMethod', [argReference1, argFutureValue2], objectValue).toPromise();

                expect(methodCaller).to.have.been.calledOnce;
                expect(methodCaller).to.have.been.calledOn(objectValue);
                expect(methodCaller).to.have.been.calledWith('myMethod');
                expect(methodCaller.args[0][1]).to.have.length(2);
                expect(methodCaller.args[0][1][0].getType()).to.equal('string');
                expect(methodCaller.args[0][1][0].getNative()).to.equal('my first future arg');
                expect(methodCaller.args[0][1][1].getType()).to.equal('string');
                expect(methodCaller.args[0][1][1].getNative()).to.equal('my second future arg');
            });
        });
    });

    describe('construct()', function () {
        var nativeObject,
            objectValue;

        beforeEach(function () {
            objectValue = sinon.createStubInstance(ObjectValue);
            nativeObject = new InternalClass();
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

    describe('exportInstanceForJS()', function () {
        it('should return the instance exported via the ExportRepository', function () {
            var instance = {my: 'export'},
                objectValue = sinon.createStubInstance(ObjectValue);
            exportRepository.export
                .withArgs(sinon.match.same(objectValue))
                .returns(instance);

            expect(classObject.exportInstanceForJS(objectValue)).to.equal(instance);
        });
    });

    describe('getConstantByName()', function () {
        beforeEach(function () {
            interfaceObject.getConstantByName.returns(valueFactory.createRejection(new Error('Constant not defined')));
            superClass.getConstantByName.returns(valueFactory.createRejection(new Error('Constant not defined')));
        });

        it('should return the FQCN for the magic `::class` constant case-insensitively', function () {
            createClass('__construct', superClass);

            return classObject.getConstantByName('clAss').toPromise().then(function (value) {
                expect(value.getNative()).to.equal('My\\Class\\Path\\Here');
            });
        });

        it('should be able to fetch a constant defined by the current class', function () {
            createClass('__construct', superClass, {
                'MY_CONST': function () {
                    return valueFactory.createString('my value');
                }
            });

            return classObject.getConstantByName('MY_CONST').toPromise().then(function (value) {
                expect(value.getNative()).to.equal('my value');
            });
        });

        it('should evaluate a constant defined by the current class within an isolated opcode', function () {
            createClass('__construct', superClass, {
                'MY_CONST': function () {
                    return valueFactory.createString('my value');
                }
            });

            return classObject.getConstantByName('MY_CONST').toPromise().then(function () {
                expect(userland.enterIsolated).to.have.been.calledOnce;
                expect(userland.enterIsolated).to.have.been.calledWith(
                    sinon.match.func,
                    sinon.match.same(namespaceScope)
                );
            });
        });

        it('should be able to fetch a constant defined by an interface implemented directly by the current class', function () {
            interfaceObject.getConstantByName
                .withArgs('MY_INTERFACE_CONST')
                .returns(valueFactory.createString('my value from interface'));
            createClass('__construct', superClass);

            return classObject.getConstantByName('MY_INTERFACE_CONST').toPromise().then(function (value) {
                expect(value.getNative()).to.equal('my value from interface');
            });
        });

        it('should be able to fetch a constant defined by the superclass (or other ancestor)', function () {
            superClass.getConstantByName
                .withArgs('MY_SUPER_CONST')
                .returns(valueFactory.createString('my value from superclass'));
            createClass('__construct', superClass);

            return classObject.getConstantByName('MY_SUPER_CONST').toPromise().then(function (value) {
                expect(value.getNative()).to.equal('my value from superclass');
            });
        });

        it('should cache the constant\'s value', async function () {
            var value;
            createClass('__construct', superClass, {
                'MY_CONST': function () {
                    return valueFactory.createString('my value');
                }
            });

            value = await classObject.getConstantByName('MY_CONST').toPromise();

            expect(await classObject.getConstantByName('MY_CONST').toPromise()).to.equal(value);
        });

        it('should raise the correct error when the constant is not defined in the class hierarchy', function () {
            createClass('__construct', null);

            return expect(classObject.getConstantByName('MY_CONST').toPromise()).to.eventually.be.rejectedWith(
                'Fake PHP Fatal error for #core.undefined_class_constant with {"name":"MY_CONST"}'
            );
        });
    });

    describe('getInterfaces()', function () {
        it('should return all interfaces implemented by this class', function () {
            var result = classObject.getInterfaces();

            expect(result).to.have.length(1);
            expect(result[0]).to.equal(interfaceObject);
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

    describe('getName()', function () {
        it('should return the Fully-Qualified Class Name (FQCN)', function () {
            expect(classObject.getName()).to.equal('My\\Class\\Path\\Here');
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
            it('should return an UndeclaredStaticPropertyReference', async function () {
                var propertyReference;
                createClass('__construct', null);

                propertyReference = await classObject.getStaticPropertyByName('myUndeclaredStaticProp').toPromise();

                expect(propertyReference).to.be.an.instanceOf(UndeclaredStaticPropertyReference);
                expect(propertyReference.getName()).to.equal('myUndeclaredStaticProp');
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

            it('should return when not inside any class', async function () {
                var staticProperty = await classObject.getStaticPropertyByName('myPublicStaticProp').toPromise();

                expect(staticProperty).to.be.an.instanceOf(StaticPropertyReference);
                expect(staticProperty.getName()).to.equal('myPublicStaticProp');
                expect(staticProperty.getVisibility()).to.equal('public');
                expect(staticProperty.getValue().getNative()).to.equal('my public static prop value');
            });

            it('should return when inside a class that is not the defining one', async function () {
                var staticProperty;
                callStack.getCurrentClass.returns(foreignClass);

                staticProperty = await classObject.getStaticPropertyByName('myPublicStaticProp').toPromise();

                expect(staticProperty).to.be.an.instanceOf(StaticPropertyReference);
                expect(staticProperty.getName()).to.equal('myPublicStaticProp');
                expect(staticProperty.getVisibility()).to.equal('public');
                expect(staticProperty.getValue().getNative()).to.equal('my public static prop value');
            });
        });

        describe('for a protected property', function () {
            it('should return when inside the defining class', async function () {
                var staticProperty;
                callStack.getCurrentClass.returns(classObject);

                staticProperty = await classObject.getStaticPropertyByName('myProtectedStaticProp').toPromise();

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

            it('should return when inside a class that is an ancestor of the definer', async function () {
                var staticProperty;
                callStack.getCurrentClass.returns(ancestorClass);

                staticProperty = await classObject.getStaticPropertyByName('myProtectedStaticProp').toPromise();

                expect(staticProperty).to.be.an.instanceOf(StaticPropertyReference);
                expect(staticProperty.getName()).to.equal('myProtectedStaticProp');
                expect(staticProperty.getVisibility()).to.equal('protected');
                expect(staticProperty.getValue().getNative()).to.equal('my protected static prop value');
            });

            it('should return when inside a class that is a descendant of the definer', async function () {
                var staticProperty;
                callStack.getCurrentClass.returns(descendantClass);

                staticProperty = await classObject.getStaticPropertyByName('myProtectedStaticProp').toPromise();

                expect(staticProperty).to.be.an.instanceOf(StaticPropertyReference);
                expect(staticProperty.getName()).to.equal('myProtectedStaticProp');
                expect(staticProperty.getVisibility()).to.equal('protected');
                expect(staticProperty.getValue().getNative()).to.equal('my protected static prop value');
            });
        });

        describe('for a private property', function () {
            it('should return when inside the defining class', async function () {
                var staticProperty;
                callStack.getCurrentClass.returns(classObject);

                staticProperty = await classObject.getStaticPropertyByName('myPrivateStaticProp').toPromise();

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

    describe('getThisObjectForInstance()', function () {
        it('should return the ObjectValue when non-coercing', function () {
            var objectValue = sinon.createStubInstance(ObjectValue);
            valueCoercer.isAutoCoercionEnabled.returns(false);

            expect(classObject.getThisObjectForInstance(objectValue)).to.equal(objectValue);
        });

        it('should return the native object when coercing', function () {
            var nativeObject = {my: 'object'},
                objectValue = sinon.createStubInstance(ObjectValue);
            objectValue.getObject.returns(nativeObject);
            valueCoercer.isAutoCoercionEnabled.returns(true);

            expect(classObject.getThisObjectForInstance(objectValue)).to.equal(nativeObject);
        });
    });

    describe('getUnprefixedName()', function () {
        it('should return the class name without namespace prefix', function () {
            expect(classObject.getUnprefixedName()).to.equal('Here');
        });
    });

    describe('instantiate()', function () {
        var objectValue;

        beforeEach(function () {
            objectValue = sinon.createStubInstance(ObjectValue);
            sinon.stub(valueFactory, 'createObject').returns(objectValue);

            createClass('__construct', superClass);

            objectValue.declareProperty
                .withArgs(sinon.match.any, sinon.match(function (givenClass) {
                    return givenClass === classObject;
                }))
                .callsFake(function (name, classObject, visibility) {
                    var property = sinon.createStubInstance(PropertyReference);

                    property.getName.returns(name);
                    property.getVisibility.returns(visibility);

                    return property;
                });
        });

        it('should call the internal constructor for the current class with any given shadow constructor arguments', async function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);
            arg1.getNative.returns(21);
            arg2.getNative.returns('second');

            await classObject.instantiate([arg1, arg2], ['first', 'second']).toPromise();

            expect(InternalClass).to.have.been.calledOnce;
            expect(InternalClass).to.have.been.calledWith('first', 'second');
        });

        it('should call the userland constructor for the current class', async function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value),
                constructor = sinon.stub().returns(valueFactory.createNull());
            arg1.getNative.returns(21);
            arg2.getNative.returns('second');
            InternalClass.prototype.__construct = constructor;

            await classObject.instantiate([arg1, arg2]).toPromise();

            expect(constructor).to.have.been.calledOnce;
        });

        it('should wrap an instance of the InternalClass in an ObjectValue', async function () {
            await classObject.instantiate([]).toPromise();

            expect(valueFactory.createObject).to.have.been.calledOnce;
            expect(valueFactory.createObject).to.have.been.calledWith(
                sinon.match.instanceOf(InternalClass)
            );
        });

        it('should declare the instance properties on the ObjectValue', async function () {
            await classObject.instantiate([]).toPromise();

            expect(objectValue.declareProperty).to.have.been.calledOnce;
            expect(objectValue.declareProperty).to.have.been.calledWith(
                'myPrivateInstanceProp',
                sinon.match.same(classObject),
                'private'
            );
        });

        it('should initialise the instance properties on the ObjectValue', async function () {
            var instanceProperty = sinon.createStubInstance(PropertyReference);
            objectValue.declareProperty
                .withArgs('myPrivateInstanceProp', sinon.match.same(classObject), 'private')
                .returns(instanceProperty);

            await classObject.instantiate([]).toPromise();

            expect(instanceProperty.initialise).to.have.been.calledOnce;
            expect(instanceProperty.initialise.args[0][0].getType()).equal('string');
            expect(instanceProperty.initialise.args[0][0].getNative()).equal('my private instance prop value');
        });

        it('should return the created object', async function () {
            expect(await classObject.instantiate([]).toPromise()).to.equal(objectValue);
        });
    });

    describe('instantiateBare()', function () {
        var objectValue;

        beforeEach(async function () {
            objectValue = sinon.createStubInstance(ObjectValue);
            sinon.stub(valueFactory, 'createObject').returns(objectValue);

            createClass('__construct', superClass);

            objectValue.declareProperty
                .withArgs(sinon.match.any, sinon.match(function (givenClass) {
                    return givenClass === classObject;
                }))
                .callsFake(function (name, classObject, visibility) {
                    var property = sinon.createStubInstance(PropertyReference);

                    property.getName.returns(name);
                    property.getVisibility.returns(visibility);

                    return property;
                });

            await classObject.initialiseInstancePropertyDefaults();
        });

        it('should call the internal constructor for the current class with any given shadow constructor arguments', function () {
            classObject.instantiateBare(['first', 'second']);

            expect(InternalClass).to.have.been.calledOnce;
            expect(InternalClass).to.have.been.calledWith('first', 'second');
        });

        it('should not call the userland constructor for the current class', function () {
            var constructor = sinon.stub();
            InternalClass.prototype.__construct = constructor;

            classObject.instantiateBare();

            expect(constructor).not.to.have.been.called;
        });

        it('should wrap an instance of the InternalClass in an ObjectValue', function () {
            classObject.instantiateBare();

            expect(valueFactory.createObject).to.have.been.calledOnce;
            expect(valueFactory.createObject).to.have.been.calledWith(
                sinon.match.instanceOf(InternalClass)
            );
        });

        it('should declare the instance properties on the ObjectValue', async function () {
            await classObject.instantiateBare().toPromise();

            expect(objectValue.declareProperty).to.have.been.calledOnce;
            expect(objectValue.declareProperty).to.have.been.calledWith(
                'myPrivateInstanceProp',
                sinon.match.same(classObject),
                'private'
            );
        });

        it('should initialise the instance properties on the ObjectValue', async function () {
            var instanceProperty = sinon.createStubInstance(PropertyReference);
            objectValue.declareProperty
                .withArgs('myPrivateInstanceProp', sinon.match.same(classObject), 'private')
                .returns(instanceProperty);

            await classObject.instantiateBare().toPromise();

            expect(instanceProperty.initialise).to.have.been.calledOnce;
            expect(instanceProperty.initialise.args[0][0].getType()).equal('string');
            expect(instanceProperty.initialise.args[0][0].getNative()).equal('my private instance prop value');
        });

        it('should return the created object', function () {
            expect(classObject.instantiateBare()).to.equal(objectValue);
        });
    });

    describe('instantiateWithInternals()', function () {
        var doCall,
            objectValue;

        beforeEach(function () {
            objectValue = sinon.createStubInstance(ObjectValue);
            sinon.stub(valueFactory, 'createObject').returns(objectValue);
            createClass('__construct', superClass);

            objectValue.declareProperty
                .withArgs(sinon.match.any, sinon.match(function (givenClass) {
                    return givenClass === classObject;
                }))
                .callsFake(function (name, classObject, visibility) {
                    var property = sinon.createStubInstance(PropertyReference);

                    property.getName.returns(name);
                    property.getVisibility.returns(visibility);

                    return property;
                });

            doCall = function () {
                return classObject.instantiateWithInternals([], {
                    myInternal: 'my value'
                }).toPromise();
            };
        });

        it('should set the given internal properties on the object', async function () {
            await doCall();

            expect(objectValue.setInternalProperty).to.have.been.calledOnce;
            expect(objectValue.setInternalProperty).to.have.been.calledWith('myInternal', 'my value');
        });

        it('should declare the instance properties on the ObjectValue', async function () {
            await doCall();

            expect(objectValue.declareProperty).to.have.been.calledOnce;
            expect(objectValue.declareProperty).to.have.been.calledWith(
                'myPrivateInstanceProp',
                sinon.match.same(classObject),
                'private'
            );
        });

        it('should initialise the instance properties on the ObjectValue', async function () {
            var instanceProperty = sinon.createStubInstance(PropertyReference);
            objectValue.declareProperty
                .withArgs('myPrivateInstanceProp', sinon.match.same(classObject), 'private')
                .returns(instanceProperty);

            await doCall();

            expect(instanceProperty.initialise).to.have.been.calledOnce;
            expect(instanceProperty.initialise.args[0][0].getType()).equal('string');
            expect(instanceProperty.initialise.args[0][0].getNative()).equal('my private instance prop value');
        });

        it('should return the created object', async function () {
            expect(await doCall()).to.equal(objectValue);
        });
    });

    describe('internalConstruct()', function () {
        var objectValue;

        beforeEach(async function () {
            objectValue = sinon.createStubInstance(ObjectValue);

            objectValue.declareProperty
                .withArgs(sinon.match.any, sinon.match(function (givenClass) {
                    return givenClass === classObject;
                }))
                .callsFake(function (name, classObject, visibility) {
                    var property = sinon.createStubInstance(PropertyReference);

                    property.getName.returns(name);
                    property.getVisibility.returns(visibility);

                    return property;
                });
        });

        it('should throw if called before instance property defaults\' initialisation', function () {
            expect(function () {
                classObject.internalConstruct(objectValue);
            }).to.throw('Instance property defaults have not been initialised');
        });

        it('should call the internal constructor with any given shadow constructor arguments', async function () {
            await classObject.initialiseInstancePropertyDefaults();

            await classObject.internalConstruct(objectValue, ['first', 'second']);

            expect(InternalClass).to.have.been.calledOnce;
            expect(InternalClass).to.have.been.calledOn(sinon.match.same(objectValue));
            expect(InternalClass).to.have.been.calledWith('first', 'second');
        });

        it('should call .internalConstruct() on the superclass when there is one, with any given shadow constructor arguments', async function () {
            createClass('__construct', superClass);
            await classObject.initialiseInstancePropertyDefaults();

            await classObject.internalConstruct(objectValue, ['first', 'second']);

            expect(superClass.internalConstruct).to.have.been.calledOnce;
            expect(superClass.internalConstruct).to.have.been.calledWith(
                sinon.match.same(objectValue),
                ['first', 'second']
            );
        });

        it('should declare the instance properties on the ObjectValue', async function () {
            await classObject.initialiseInstancePropertyDefaults();

            await classObject.internalConstruct(objectValue);

            expect(objectValue.declareProperty).to.have.been.calledOnce;
            expect(objectValue.declareProperty).to.have.been.calledWith(
                'myPrivateInstanceProp',
                sinon.match.same(classObject),
                'private'
            );
        });

        it('should initialise the instance properties on the ObjectValue', async function () {
            var instanceProperty = sinon.createStubInstance(PropertyReference);
            objectValue.declareProperty
                .withArgs('myPrivateInstanceProp', sinon.match.same(classObject), 'private')
                .returns(instanceProperty);
            await classObject.initialiseInstancePropertyDefaults();

            await classObject.internalConstruct(objectValue);

            expect(instanceProperty.initialise).to.have.been.calledOnce;
            expect(instanceProperty.initialise.args[0][0].getType()).equal('string');
            expect(instanceProperty.initialise.args[0][0].getNative()).equal('my private instance prop value');
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
        it('should return false when disabled', function () {
            valueCoercer.isAutoCoercionEnabled.returns(false);

            expect(classObject.isAutoCoercionEnabled()).to.be.false;
        });

        it('should return true when enabled', function () {
            valueCoercer.isAutoCoercionEnabled.returns(true);

            expect(classObject.isAutoCoercionEnabled()).to.be.true;
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
            ffiFactory.createPHPObject
                .withArgs(sinon.match.same(instance))
                .returns(phpObject);

            expect(classObject.proxyInstanceForJS(instance)).to.equal(phpObject);
        });
    });
});
