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
    Call = require('../../src/Call'),
    CallFactory = require('../../src/CallFactory'),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    FunctionFactory = require('../../src/FunctionFactory').sync(),
    FunctionSpec = require('../../src/Function/FunctionSpec'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    Scope = require('../../src/Scope').sync(),
    ScopeFactory = require('../../src/ScopeFactory'),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('FunctionFactory', function () {
    var call,
        callFactory,
        callStack,
        currentClass,
        factory,
        MethodSpec,
        name,
        namespaceScope,
        originalFunc,
        scope,
        scopeFactory,
        valueFactory;

    beforeEach(function () {
        call = sinon.createStubInstance(Call);
        callFactory = sinon.createStubInstance(CallFactory);
        callStack = sinon.createStubInstance(CallStack);
        currentClass = sinon.createStubInstance(Class);
        originalFunc = sinon.stub();
        MethodSpec = sinon.stub();
        name = 'myFunction';
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        scope = sinon.createStubInstance(Scope);
        scopeFactory = sinon.createStubInstance(ScopeFactory);
        valueFactory = new ValueFactory();

        callFactory.create.returns(call);
        scopeFactory.create.returns(scope);

        factory = new FunctionFactory(
            MethodSpec,
            scopeFactory,
            callFactory,
            valueFactory,
            callStack
        );
    });

    describe('create()', function () {
        var callCreate,
            functionSpec;

        beforeEach(function () {
            functionSpec = sinon.createStubInstance(FunctionSpec);

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
            it('should return the result from the wrapped function', function () {
                originalFunc.returns(123);

                expect(callCreate()()).to.equal(123);
            });

            it('should pass the current Class to the ScopeFactory', function () {
                callCreate()();

                expect(scopeFactory.create).to.have.been.calledOnce;
                expect(scopeFactory.create).to.have.been.calledWith(
                    sinon.match.same(currentClass)
                );
            });

            it('should pass the wrapper function to the ScopeFactory', function () {
                var wrapperFunction = callCreate();

                wrapperFunction();

                expect(scopeFactory.create).to.have.been.calledOnce;
                expect(scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(wrapperFunction)
                );
            });

            it('should pass the `$this` object to the ScopeFactory when provided', function () {
                var currentObject = sinon.createStubInstance(Value);

                callCreate(currentObject)();

                expect(scopeFactory.create).to.have.been.calledOnce;
                expect(scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(currentObject)
                );
            });

            it('should pass the Scope to the CallFactory', function () {
                var currentObject = sinon.createStubInstance(Value);

                callCreate(currentObject)();

                expect(callFactory.create).to.have.been.calledOnce;
                expect(callFactory.create).to.have.been.calledWith(
                    sinon.match.same(scope)
                );
            });

            it('should pass the NamespaceScope to the CallFactory', function () {
                var currentObject = sinon.createStubInstance(Value);

                callCreate(currentObject)();

                expect(callFactory.create).to.have.been.calledOnce;
                expect(callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(namespaceScope)
                );
            });

            it('should pass the arguments to the CallFactory', function () {
                var currentObject = sinon.createStubInstance(Value);

                callCreate(currentObject)(21, 27);

                expect(callFactory.create).to.have.been.calledOnce;
                expect(callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    [21, 27]
                );
            });

            it('should pass any "next" static class set', function () {
                var newStaticClass = sinon.createStubInstance(Class),
                    wrappedFunc = callCreate();
                factory.setNewStaticClassIfWrapped(wrappedFunc, newStaticClass);

                wrappedFunc();

                expect(callFactory.create).to.have.been.calledOnce;
                expect(callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(newStaticClass)
                );
            });

            it('should pass any explicit static class set', function () {
                var explicitStaticClass = sinon.createStubInstance(Class);

                callCreate(null, explicitStaticClass)();

                expect(callFactory.create).to.have.been.calledOnce;
                expect(callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(explicitStaticClass)
                );
            });

            it('should pass null as the new static class when no explicit or "next" one is set', function () {
                callCreate()();

                expect(callFactory.create).to.have.been.calledOnce;
                expect(callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    null
                );
            });

            it('should pass the (JS) `this` object as the (PHP) `$this` object when not provided', function () {
                var jsThisObjectValue = sinon.createStubInstance(Value);

                callCreate(null).call(jsThisObjectValue);

                expect(scopeFactory.create).to.have.been.calledOnce;
                expect(scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(jsThisObjectValue)
                );
            });

            it('should pass null as the `$this` object when not provided and a non-Value (JS) `this` object was used', function () {
                var nonValueThisObject = {};

                callCreate(null).call(nonValueThisObject);

                expect(scopeFactory.create).to.have.been.calledOnce;
                expect(scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    null
                );
            });

            it('should coerce parameter arguments as required', function () {
                var argValue1 = valueFactory.createInteger(21),
                    argValue2 = valueFactory.createInteger(101),
                    coercedArgValue1 = valueFactory.createInteger(42),
                    coercedArgValue2 = valueFactory.createInteger(202),
                    wrappedFunc = callCreate();
                functionSpec.coerceArguments
                    .withArgs([sinon.match.same(argValue1), sinon.match.same(argValue2)])
                    .returns([coercedArgValue1, coercedArgValue2]);

                wrappedFunc(argValue1, argValue2);

                expect(originalFunc).to.have.been.calledOnce;
                expect(originalFunc).to.have.been.calledWith(coercedArgValue1, coercedArgValue2);
            });

            it('should push the call onto the stack', function () {
                callCreate()();

                expect(callStack.push).to.have.been.calledOnce;
                expect(callStack.push).to.have.been.calledWith(sinon.match.same(call));
            });

            it('should validate parameter arguments at the right point', function () {
                var argValue1 = valueFactory.createInteger(21),
                    argValue2 = valueFactory.createInteger(101),
                    wrappedFunc = callCreate();

                wrappedFunc(argValue1, argValue2);

                expect(functionSpec.validateArguments).to.have.been.calledOnce;
                expect(functionSpec.validateArguments).to.have.been.calledWith([
                    sinon.match.same(argValue1),
                    sinon.match.same(argValue2)
                ]);
                expect(functionSpec.validateArguments)
                    .to.have.been.calledAfter(functionSpec.coerceArguments);
            });

            it('should populate default argument values at the right point', function () {
                var argValue1 = valueFactory.createInteger(21),
                    argValue2 = valueFactory.createInteger(101),
                    wrappedFunc = callCreate();

                wrappedFunc(argValue1, argValue2);

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

            it('should pop the call off the stack when the wrapped function returns', function () {
                callCreate()();

                expect(callStack.pop).to.have.been.calledOnce;
            });

            it('should pop the call off the stack even when the wrapped function throws', function () {
                var error = new Error('argh');
                originalFunc.throws(error);

                expect(function () {
                    callCreate()();
                }).to.throw(error);
                expect(callStack.pop).to.have.been.calledOnce;
            });

            it('should pass the scope as the thisObject when calling the wrapped function', function () {
                callCreate()();

                expect(originalFunc).to.have.been.calledOn(sinon.match.same(scope));
            });

            it('should pass arguments through to the wrapped function', function () {
                var argValue1 = valueFactory.createInteger(123),
                    argValue2 = valueFactory.createString('second'),
                    argValue3 = valueFactory.createString('another');

                callCreate()(argValue1, argValue2, argValue3);

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
