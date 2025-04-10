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
    tools = require('../../../tools'),
    Class = require('../../../../../src/Class').sync(),
    ClassDefinition = require('../../../../../src/OOP/Class/Definition/ClassDefinition'),
    FFIFactory = require('../../../../../src/FFI/FFIFactory'),
    Namespace = require('../../../../../src/Namespace').sync(),
    NamespaceScope = require('../../../../../src/NamespaceScope').sync(),
    NativeDefinitionBuilder = require('../../../../../src/OOP/Class/Definition/NativeDefinitionBuilder'),
    NativeMethodDefinitionBuilder = require('../../../../../src/OOP/NativeMethodDefinitionBuilder'),
    ObjectValue = require('../../../../../src/Value/Object').sync(),
    Trait = require('../../../../../src/OOP/Trait/Trait'),
    ValueCoercer = require('../../../../../src/FFI/Value/ValueCoercer');

describe('NativeDefinitionBuilder', function () {
    var builder,
        ffiFactory,
        flow,
        futureFactory,
        hostScheduler,
        nativeMethodDefinitionBuilder,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        ffiFactory = sinon.createStubInstance(FFIFactory);
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        hostScheduler = state.getHostScheduler();
        nativeMethodDefinitionBuilder = sinon.createStubInstance(NativeMethodDefinitionBuilder);
        valueFactory = state.getValueFactory();

        ffiFactory.createValueCoercer.callsFake(function (autoCoercionEnabled) {
            return new ValueCoercer(flow, autoCoercionEnabled);
        });

        nativeMethodDefinitionBuilder.buildMethod
            .returnsArg(0);

        builder = new NativeDefinitionBuilder(valueFactory, ffiFactory, nativeMethodDefinitionBuilder);
    });

    describe('buildDefinition()', function () {
        var callBuildDefinition,
            definition,
            definitionFunction,
            firstInterface,
            firstTrait,
            interfaces,
            methodCaller,
            myConstantFactoryFunction,
            namespace,
            namespaceScope,
            secondInterface,
            secondTrait,
            superClass,
            traits;

        beforeEach(function () {
            myConstantFactoryFunction = function () {};
            definitionFunction = sinon.stub();
            definitionFunction.constants = {
                MY_CONST: myConstantFactoryFunction
            };
            definitionFunction.prototype.myMethod = sinon.stub();
            firstInterface = sinon.createStubInstance(Class);
            firstTrait = sinon.createStubInstance(Trait);
            methodCaller = sinon.stub();
            namespace = sinon.createStubInstance(Namespace);
            namespaceScope = sinon.createStubInstance(NamespaceScope);
            secondInterface = sinon.createStubInstance(Class);
            secondTrait = sinon.createStubInstance(Trait);
            superClass = sinon.createStubInstance(Class);
            interfaces = [firstInterface, secondInterface];
            traits = [firstTrait, secondTrait];

            namespace.getPrefix.returns('My\\Stuff\\');

            superClass.getInternalClass.returns(function () {});

            callBuildDefinition = function (name, autoCoercionEnabled) {
                definition = builder.buildDefinition(
                    name || 'MyClass',
                    definitionFunction,
                    superClass,
                    namespace,
                    namespaceScope,
                    interfaces,
                    traits,
                    Boolean(autoCoercionEnabled),
                    methodCaller
                );
            };
        });

        it('should throw when the definition is not a function (ensure a userland definition was not given in error)', function () {
            definitionFunction = {my: 'object'}; // Not a valid native definition.

            expect(function () {
                callBuildDefinition('MyInvalidThrowable');
            }).to.throw(
                'NativeDefinitionBuilder :: Expected a function'
            );
        });

        it('should return a ClassDefinition', function () {
            callBuildDefinition();

            expect(definition).to.be.an.instanceOf(ClassDefinition);
        });

        describe('the ClassDefinition returned', function () {
            it('should have the fully-qualified name of the class (including namespace)', function () {
                callBuildDefinition();

                expect(definition.getName()).to.equal('My\\Stuff\\MyClass');
            });

            it('should have the correct Namespace reference', function () {
                callBuildDefinition();

                expect(definition.getNamespace()).to.equal(namespace);
            });

            it('should have the correct NamespaceScope reference', function () {
                callBuildDefinition();

                expect(definition.getNamespaceScope()).to.equal(namespaceScope);
            });

            it('should have the correct superclass reference', function () {
                callBuildDefinition();

                expect(definition.getSuperClass()).to.equal(superClass);
            });

            it('should have the correct interfaces', function () {
                callBuildDefinition();

                expect(definition.getInterfaces()).to.have.length(2);
                expect(definition.getInterfaces()[0]).to.equal(firstInterface);
                expect(definition.getInterfaces()[1]).to.equal(secondInterface);
            });

            it('should have the correct traits', function () {
                callBuildDefinition();

                expect(definition.getTraits()).to.have.length(2);
                expect(definition.getTraits()[0]).to.equal(firstTrait);
                expect(definition.getTraits()[1]).to.equal(secondTrait);
            });

            it('should have the constants of the class definition', function () {
                callBuildDefinition();

                expect(definition.getConstants().MY_CONST.value).to.equal(myConstantFactoryFunction);
            });

            it('should have __construct for class constructor name', function () {
                callBuildDefinition();

                expect(definition.getConstructorName()).to.equal('__construct');
            });

            describe('InternalClass', function () {
                var callInternalConstructor,
                    nativeObject,
                    objectValue;

                beforeEach(function () {
                    objectValue = sinon.createStubInstance(ObjectValue);
                    nativeObject = {my: 'native object'};
                    objectValue.callMethod.callsFake(function (name, argReferences) {
                        return definition.getMethods()[name].apply(null, argReferences);
                    });
                    objectValue.getObject.returns(nativeObject);

                    callInternalConstructor = function (name, autoCoercionEnabled, args) {
                        callBuildDefinition(name, autoCoercionEnabled);

                        definition.getInternalClass().apply(objectValue, args || []);
                    };
                });

                it('should call the shadow constructor if defined', function () {
                    var shadowConstructor = sinon.stub();
                    definitionFunction.shadowConstructor = shadowConstructor;

                    callInternalConstructor();

                    expect(shadowConstructor).to.have.been.calledOnce;
                });

                it('should call the shadow constructor with the native object when auto-coercing', function () {
                    var shadowConstructor = sinon.stub();
                    definitionFunction.shadowConstructor = shadowConstructor;

                    callInternalConstructor('MyClass', true);

                    expect(shadowConstructor).to.have.been.calledOn(sinon.match.same(nativeObject));
                });

                it('should call the shadow constructor with the ObjectValue when non-coercing', function () {
                    var shadowConstructor = sinon.stub();
                    definitionFunction.shadowConstructor = shadowConstructor;

                    callInternalConstructor('MyClass', false);

                    expect(shadowConstructor).to.have.been.calledOn(sinon.match.same(objectValue));
                });

                it('should pass the internal constructor\'s arguments through to the shadow constructor', function () {
                    var shadowConstructor = sinon.stub();
                    definitionFunction.shadowConstructor = shadowConstructor;

                    callInternalConstructor('MyClass', false, ['first arg', 'second arg']);

                    expect(shadowConstructor).to.have.been.calledWith('first arg', 'second arg');
                });

                describe('the proxy constructor installed', function () {
                    var arg1,
                        arg2,
                        callProxyConstructor;

                    beforeEach(function () {
                        callProxyConstructor = function (name, autoCoercionEnabled) {
                            callInternalConstructor(name, autoCoercionEnabled);

                            arg1 = valueFactory.createString('arg 1');
                            arg2 = valueFactory.createString('arg 2');

                            return definition.getInternalClass().prototype.__construct.apply(objectValue, [arg1, arg2]);
                        };
                    });

                    it('should call the original native constructor correctly when auto-coercing', function () {
                        callProxyConstructor('MyClass', true);

                        expect(definitionFunction).to.have.been.calledOnce;
                        expect(definitionFunction).to.have.been.calledOn(sinon.match.same(nativeObject));
                        expect(definitionFunction).to.have.been.calledWith('arg 1', 'arg 2');
                    });

                    it('should await any Future returned from the original native constructor when auto-coercing', async function () {
                        var completed = false;
                        definitionFunction.callsFake(function () {
                            return futureFactory.createFuture(function (resolve) {
                                // Defer in a macrotask to ensure we are correctly awaiting returned Futures.
                                hostScheduler.queueMacrotask(function () {
                                    completed = true;
                                    resolve();
                                });
                            });
                        });

                        await callProxyConstructor('MyClass', true).toPromise();

                        expect(definitionFunction).to.have.been.calledOnce;
                        expect(definitionFunction).to.have.been.calledOn(sinon.match.same(nativeObject));
                        expect(definitionFunction).to.have.been.calledWith('arg 1', 'arg 2');
                        expect(completed).to.be.true;
                    });

                    it('should call a __construct() method on the definition function correctly when auto-coercing', function () {
                        var originalConstructor = sinon.stub();
                        definitionFunction.prototype.__construct = originalConstructor;

                        callProxyConstructor('MyClass', true);

                        expect(originalConstructor).to.have.been.calledOnce;
                        expect(originalConstructor.args[0][0]).to.equal(arg1);
                        expect(originalConstructor.args[0][1]).to.equal(arg2);
                    });

                    it('should call the original native constructor correctly when non-coercing', function () {
                        callProxyConstructor('MyClass', false);

                        expect(definitionFunction).to.have.been.calledOnce;
                        expect(definitionFunction).to.have.been.calledOn(sinon.match.same(objectValue));
                        expect(definitionFunction).to.have.been.calledWith(sinon.match.same(arg1), sinon.match.same(arg2));
                    });

                    it('should await any Future returned from the original native constructor when non-coercing', async function () {
                        var completed = false;
                        definitionFunction.callsFake(function () {
                            return futureFactory.createFuture(function (resolve) {
                                hostScheduler.queueMacrotask(function () {
                                    completed = true;
                                    resolve();
                                });
                            });
                        });

                        await callProxyConstructor('MyClass', false).toPromise();

                        expect(completed).to.be.true;
                    });

                    it('should call a __construct() method on the definition function correctly when non-coercing', function () {
                        var originalConstructor = sinon.stub();
                        definitionFunction.prototype.__construct = originalConstructor;

                        callProxyConstructor('MyClass', false);

                        expect(originalConstructor).to.have.been.calledOnce;
                        expect(originalConstructor.args[0][0]).to.equal(arg1);
                        expect(originalConstructor.args[0][1]).to.equal(arg2);
                    });
                });
            });

            it('should have the definition function\'s prototype as the root internal prototype', function () {
                callBuildDefinition();

                expect(definition.getRootInternalPrototype()).to.equal(definitionFunction.prototype);
            });

            it('should have an empty instance properties set', function () {
                callBuildDefinition();

                expect(definition.getInstanceProperties()).to.deep.equal({});
            });

            it('should have an empty static properties set', function () {
                callBuildDefinition();

                expect(definition.getStaticProperties()).to.deep.equal({});
            });

            it('should have an auto-coercing ValueCoercer when auto-coercion is enabled', function () {
                callBuildDefinition('MyClass', true);

                expect(definition.getValueCoercer().isAutoCoercionEnabled()).to.be.true;
            });

            it('should have a non-coercing ValueCoercer when auto-coercion is disabled', function () {
                callBuildDefinition('MyClass', false);

                expect(definition.getValueCoercer().isAutoCoercionEnabled()).to.be.false;
            });

            it('should have the given method caller when one is specified', function () {
                callBuildDefinition('MyClass');

                expect(definition.getMethodCaller()).to.equal(methodCaller);
            });

            it('should specify no instrumentation', function () {
                callBuildDefinition('MyClass');

                expect(definition.getInstrumentation()).to.be.null;
            });
        });
    });
});
