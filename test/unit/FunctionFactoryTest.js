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
    tools = require('./tools'),
    Call = require('../../src/Call'),
    CallFactory = require('../../src/CallFactory'),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    ControlBridge = require('../../src/Control/ControlBridge'),
    ControlScope = require('../../src/Control/ControlScope'),
    Flow = require('../../src/Control/Flow'),
    FunctionFactory = require('../../src/FunctionFactory').sync(),
    FunctionSpec = require('../../src/Function/FunctionSpec'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    Scope = require('../../src/Scope').sync(),
    ScopeFactory = require('../../src/ScopeFactory'),
    Value = require('../../src/Value').sync();

describe('FunctionFactory', function () {
    var call,
        callFactory,
        callStack,
        controlBridge,
        controlScope,
        currentClass,
        factory,
        flow,
        futureFactory,
        MethodSpec,
        name,
        namespaceScope,
        originalFunc,
        scope,
        scopeFactory,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        call = sinon.createStubInstance(Call);
        callFactory = sinon.createStubInstance(CallFactory);
        callStack = sinon.createStubInstance(CallStack);
        controlBridge = sinon.createStubInstance(ControlBridge);
        controlScope = sinon.createStubInstance(ControlScope);
        currentClass = sinon.createStubInstance(Class);
        flow = sinon.createStubInstance(Flow);
        futureFactory = state.getFutureFactory();
        originalFunc = sinon.stub();
        MethodSpec = sinon.stub();
        name = 'myFunction';
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        scope = sinon.createStubInstance(Scope);
        scopeFactory = sinon.createStubInstance(ScopeFactory);
        valueFactory = state.getValueFactory();

        callFactory.create.returns(call);
        scopeFactory.create.returns(scope);

        factory = new FunctionFactory(
            MethodSpec,
            scopeFactory,
            callFactory,
            valueFactory,
            callStack,
            flow,
            controlBridge,
            controlScope
        );
    });

    describe('create()', function () {
        var callCreate,
            functionSpec;

        beforeEach(function () {
            functionSpec = sinon.createStubInstance(FunctionSpec);

            functionSpec.validateArguments
                .callsFake(function () {
                    return futureFactory.createPresent();
                });

            callCreate = function (currentObject, staticClass) {
                functionSpec.coerceArguments.returnsArg(0);
                functionSpec.populateDefaultArguments.returnsArg(0);
                functionSpec.getFunctionName.returns(name);

                return factory.create(
                    namespaceScope,
                    currentClass,
                    originalFunc,
                    name,
                    currentObject || null,
                    staticClass || null,
                    functionSpec
                );
            };
        });

        it('should return a wrapper function', function () {
            expect(callCreate()).to.be.a('function');
        });

        describe('the wrapper function returned', function () {
            it('should return the result from the wrapped function coerced to a Value', async function () {
                var resultValue;
                originalFunc.returns(123);

                resultValue = await callCreate()().toPromise();

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(123);
            });

            it('should pass the current Class to the ScopeFactory', async function () {
                await callCreate()().toPromise();

                expect(scopeFactory.create).to.have.been.calledOnce;
                expect(scopeFactory.create).to.have.been.calledWith(
                    sinon.match.same(currentClass)
                );
            });

            it('should pass the wrapper function to the ScopeFactory', async function () {
                var wrapperFunction = callCreate();

                await wrapperFunction().toPromise();

                expect(scopeFactory.create).to.have.been.calledOnce;
                expect(scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(wrapperFunction)
                );
            });

            it('should pass the `$this` object to the ScopeFactory when provided', async function () {
                var currentObject = sinon.createStubInstance(Value);

                await callCreate(currentObject)().toPromise();

                expect(scopeFactory.create).to.have.been.calledOnce;
                expect(scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(currentObject)
                );
            });

            it('should pass the Scope to the CallFactory', async function () {
                var currentObject = sinon.createStubInstance(Value);

                await callCreate(currentObject)().toPromise();

                expect(callFactory.create).to.have.been.calledOnce;
                expect(callFactory.create).to.have.been.calledWith(
                    sinon.match.same(scope)
                );
            });

            it('should pass the NamespaceScope to the CallFactory', async function () {
                var currentObject = sinon.createStubInstance(Value);

                await callCreate(currentObject)().toPromise();

                expect(callFactory.create).to.have.been.calledOnce;
                expect(callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(namespaceScope)
                );
            });

            it('should pass the arguments to the CallFactory', async function () {
                var currentObject = sinon.createStubInstance(Value);

                await callCreate(currentObject)(21, 27).toPromise();

                expect(callFactory.create).to.have.been.calledOnce;
                expect(callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    [21, 27]
                );
            });

            it('should pass any "next" static class set', async function () {
                var newStaticClass = sinon.createStubInstance(Class),
                    wrappedFunc = callCreate();
                factory.setNewStaticClassIfWrapped(wrappedFunc, newStaticClass);

                await wrappedFunc().toPromise();

                expect(callFactory.create).to.have.been.calledOnce;
                expect(callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(newStaticClass)
                );
            });

            it('should pass any explicit static class set', async function () {
                var explicitStaticClass = sinon.createStubInstance(Class);

                await callCreate(null, explicitStaticClass)().toPromise();

                expect(callFactory.create).to.have.been.calledOnce;
                expect(callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(explicitStaticClass)
                );
            });

            it('should pass null as the new static class when no explicit or "next" one is set', async function () {
                await callCreate()().toPromise();

                expect(callFactory.create).to.have.been.calledOnce;
                expect(callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    null
                );
            });

            it('should pass the (JS) `this` object as the (PHP) `$this` object when not provided', async function () {
                var jsThisObjectValue = sinon.createStubInstance(Value);

                await callCreate(null).call(jsThisObjectValue).toPromise();

                expect(scopeFactory.create).to.have.been.calledOnce;
                expect(scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(jsThisObjectValue)
                );
            });

            it('should pass null as the `$this` object when not provided and a non-Value (JS) `this` object was used', async function () {
                var nonValueThisObject = {};

                await callCreate(null).call(nonValueThisObject).toPromise();

                expect(scopeFactory.create).to.have.been.calledOnce;
                expect(scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    null
                );
            });

            it('should coerce parameter arguments as required', async function () {
                var argValue1 = valueFactory.createInteger(21),
                    argValue2 = valueFactory.createInteger(101),
                    coercedArgValue1 = valueFactory.createInteger(42),
                    coercedArgValue2 = valueFactory.createInteger(202),
                    wrappedFunc = callCreate();
                functionSpec.coerceArguments
                    .withArgs([sinon.match.same(argValue1), sinon.match.same(argValue2)])
                    .returns([coercedArgValue1, coercedArgValue2]);

                await wrappedFunc(argValue1, argValue2).toPromise();

                expect(originalFunc).to.have.been.calledOnce;
                expect(originalFunc).to.have.been.calledWith(coercedArgValue1, coercedArgValue2);
            });

            it('should push the call onto the stack', async function () {
                await callCreate()().toPromise();

                expect(callStack.push).to.have.been.calledOnce;
                expect(callStack.push).to.have.been.calledWith(sinon.match.same(call));
            });

            it('should validate parameter arguments at the right point', async function () {
                var argValue1 = valueFactory.createInteger(21),
                    argValue2 = valueFactory.createInteger(101),
                    wrappedFunc = callCreate();

                await wrappedFunc(argValue1, argValue2).toPromise();

                expect(functionSpec.validateArguments).to.have.been.calledOnce;
                expect(functionSpec.validateArguments).to.have.been.calledWith([
                    sinon.match.same(argValue1),
                    sinon.match.same(argValue2)
                ]);
                expect(functionSpec.validateArguments)
                    .to.have.been.calledAfter(functionSpec.coerceArguments);
            });

            it('should pop the call off the stack even when the argument validation throws', function () {
                var error = new Error('argh');
                functionSpec.validateArguments.returns(futureFactory.createRejection(error));

                return expect(callCreate()().toPromise())
                    .to.eventually.be.rejectedWith(error)
                    .then(function () {
                        expect(callStack.pop).to.have.been.calledOnce;
                    });
            });

            it('should populate default argument values at the right point', async function () {
                var argValue1 = valueFactory.createInteger(21),
                    argValue2 = valueFactory.createInteger(101),
                    wrappedFunc = callCreate();

                await wrappedFunc(argValue1, argValue2).toPromise();

                expect(functionSpec.populateDefaultArguments).to.have.been.calledOnce;
                expect(functionSpec.populateDefaultArguments).to.have.been.calledWith([
                    sinon.match.same(argValue1),
                    sinon.match.same(argValue2)
                ]);
                expect(functionSpec.populateDefaultArguments)
                    .to.have.been.calledAfter(functionSpec.validateArguments);
                expect(functionSpec.populateDefaultArguments)
                    .to.have.been.calledBefore(callStack.pop);
            });

            it('should pop the call off the stack when the wrapped function returns', async function () {
                await callCreate()().toPromise();

                expect(callStack.pop).to.have.been.calledOnce;
            });

            it('should pop the call off the stack even when the wrapped function throws', function () {
                var error = new Error('argh');
                originalFunc.throws(error);

                return expect(callCreate()().toPromise())
                    .to.eventually.be.rejectedWith(error)
                    .then(function () {
                        expect(callStack.pop).to.have.been.calledOnce;
                    });
            });

            it('should pass the scope as the thisObject when calling the wrapped function', async function () {
                await callCreate()().toPromise();

                expect(originalFunc).to.have.been.calledOn(sinon.match.same(scope));
            });

            it('should pass arguments through to the wrapped function', async function () {
                var argValue1 = valueFactory.createInteger(123),
                    argValue2 = valueFactory.createString('second'),
                    argValue3 = valueFactory.createString('another');

                await callCreate()(argValue1, argValue2, argValue3).toPromise();

                expect(originalFunc).to.have.been.calledOnce;
                expect(originalFunc).to.have.been.calledWith(
                    sinon.match.same(argValue1),
                    sinon.match.same(argValue2),
                    sinon.match.same(argValue3)
                );
            });

            it('should have the FunctionSpec stored against it', function () {
                expect(callCreate().functionSpec).to.equal(functionSpec);
            });

            it('should have the isPHPCoreWrapped flag set against it', function () {
                expect(callCreate().isPHPCoreWrapped).to.be.true;
            });

            it('should have the original function stored against it', function () {
                expect(callCreate().originalFunc).to.equal(originalFunc);
            });
        });
    });

    describe('createMethodSpec()', function () {
        it('should create the MethodSpec using the correct constructor args', function () {
            var classObject = sinon.createStubInstance(Class),
                myMethod = sinon.stub(),
                originalClass = sinon.createStubInstance(Class);

            factory.createMethodSpec(originalClass, classObject, 'myMethod', myMethod);

            expect(MethodSpec).to.have.been.calledOnce;
            expect(MethodSpec).to.have.been.calledWith(
                sinon.match.same(originalClass),
                sinon.match.same(classObject),
                'myMethod',
                sinon.match.same(myMethod)
            );
        });

        it('should return the created MethodSpec', function () {
            var classObject = sinon.createStubInstance(Class),
                methodSpec = sinon.createStubInstance(MethodSpec),
                myMethod = sinon.stub(),
                originalClass = sinon.createStubInstance(Class);
            MethodSpec.returns(methodSpec);

            expect(factory.createMethodSpec(originalClass, classObject, 'myMethod', myMethod)).to.equal(methodSpec);
        });
    });
});
