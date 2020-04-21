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
    beforeEach(function () {
        this.call = sinon.createStubInstance(Call);
        this.callFactory = sinon.createStubInstance(CallFactory);
        this.callStack = sinon.createStubInstance(CallStack);
        this.currentClass = sinon.createStubInstance(Class);
        this.func = sinon.stub();
        this.MethodSpec = sinon.stub();
        this.name = 'myFunction';
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);
        this.scope = sinon.createStubInstance(Scope);
        this.scopeFactory = sinon.createStubInstance(ScopeFactory);
        this.valueFactory = new ValueFactory();

        this.callFactory.create.returns(this.call);
        this.scopeFactory.create.returns(this.scope);

        this.factory = new FunctionFactory(
            this.MethodSpec,
            this.scopeFactory,
            this.callFactory,
            this.valueFactory,
            this.callStack
        );
    });

    describe('create()', function () {
        beforeEach(function () {
            this.functionSpec = sinon.createStubInstance(FunctionSpec);

            this.callCreate = function (currentObject, staticClass) {
                this.functionSpec.coerceArguments.returnsArg(0);
                this.functionSpec.populateDefaultArguments.returnsArg(0);
                this.functionSpec.getFunctionName.returns(this.name);

                return this.factory.create(
                    this.namespaceScope,
                    this.currentClass,
                    this.func,
                    this.name,
                    currentObject || null,
                    staticClass || null,
                    this.functionSpec
                );
            }.bind(this);
        });

        it('should return a wrapper function', function () {
            expect(this.callCreate()).to.be.a('function');
        });

        describe('the wrapper function returned', function () {
            it('should return the result from the wrapped function', function () {
                this.func.returns(123);

                expect(this.callCreate()()).to.equal(123);
            });

            it('should pass the current Class to the ScopeFactory', function () {
                this.callCreate()();

                expect(this.scopeFactory.create).to.have.been.calledOnce;
                expect(this.scopeFactory.create).to.have.been.calledWith(
                    sinon.match.same(this.currentClass)
                );
            });

            it('should pass the wrapper function to the ScopeFactory', function () {
                var wrapperFunction = this.callCreate();

                wrapperFunction();

                expect(this.scopeFactory.create).to.have.been.calledOnce;
                expect(this.scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(wrapperFunction)
                );
            });

            it('should pass the `$this` object to the ScopeFactory when provided', function () {
                var currentObject = sinon.createStubInstance(Value);

                this.callCreate(currentObject)();

                expect(this.scopeFactory.create).to.have.been.calledOnce;
                expect(this.scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(currentObject)
                );
            });

            it('should pass the Scope to the CallFactory', function () {
                var currentObject = sinon.createStubInstance(Value);

                this.callCreate(currentObject)();

                expect(this.callFactory.create).to.have.been.calledOnce;
                expect(this.callFactory.create).to.have.been.calledWith(
                    sinon.match.same(this.scope)
                );
            });

            it('should pass the NamespaceScope to the CallFactory', function () {
                var currentObject = sinon.createStubInstance(Value);

                this.callCreate(currentObject)();

                expect(this.callFactory.create).to.have.been.calledOnce;
                expect(this.callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.same(this.namespaceScope)
                );
            });

            it('should pass the arguments to the CallFactory', function () {
                var currentObject = sinon.createStubInstance(Value);

                this.callCreate(currentObject)(21, 27);

                expect(this.callFactory.create).to.have.been.calledOnce;
                expect(this.callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    [21, 27]
                );
            });

            it('should pass any "next" static class set', function () {
                var newStaticClass = sinon.createStubInstance(Class),
                    func = this.callCreate();
                this.factory.setNewStaticClassIfWrapped(func, newStaticClass);

                func();

                expect(this.callFactory.create).to.have.been.calledOnce;
                expect(this.callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(newStaticClass)
                );
            });

            it('should pass any explicit static class set', function () {
                var explicitStaticClass = sinon.createStubInstance(Class);

                this.callCreate(null, explicitStaticClass)();

                expect(this.callFactory.create).to.have.been.calledOnce;
                expect(this.callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(explicitStaticClass)
                );
            });

            it('should pass null as the new static class when no explicit or "next" one is set', function () {
                this.callCreate()();

                expect(this.callFactory.create).to.have.been.calledOnce;
                expect(this.callFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    null
                );
            });

            it('should pass the (JS) `this` object as the (PHP) `$this` object when not provided', function () {
                var jsThisObjectValue = sinon.createStubInstance(Value);

                this.callCreate(null).call(jsThisObjectValue);

                expect(this.scopeFactory.create).to.have.been.calledOnce;
                expect(this.scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(jsThisObjectValue)
                );
            });

            it('should pass null as the `$this` object when not provided and a non-Value (JS) `this` object was used', function () {
                var nonValueThisObject = {};

                this.callCreate(null).call(nonValueThisObject);

                expect(this.scopeFactory.create).to.have.been.calledOnce;
                expect(this.scopeFactory.create).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    null
                );
            });

            it('should coerce parameter arguments as required', function () {
                var argValue1 = this.valueFactory.createInteger(21),
                    argValue2 = this.valueFactory.createInteger(101),
                    coercedArgValue1 = this.valueFactory.createInteger(42),
                    coercedArgValue2 = this.valueFactory.createInteger(202),
                    func = this.callCreate();
                this.functionSpec.coerceArguments
                    .withArgs([sinon.match.same(argValue1), sinon.match.same(argValue2)])
                    .returns([coercedArgValue1, coercedArgValue2]);

                func(argValue1, argValue2);

                expect(this.func).to.have.been.calledOnce;
                expect(this.func).to.have.been.calledWith(coercedArgValue1, coercedArgValue2);
            });

            it('should push the call onto the stack', function () {
                this.callCreate()();

                expect(this.callStack.push).to.have.been.calledOnce;
                expect(this.callStack.push).to.have.been.calledWith(sinon.match.same(this.call));
            });

            it('should validate parameter arguments at the right point', function () {
                var argValue1 = this.valueFactory.createInteger(21),
                    argValue2 = this.valueFactory.createInteger(101),
                    func = this.callCreate();

                func(argValue1, argValue2);

                expect(this.functionSpec.validateArguments).to.have.been.calledOnce;
                expect(this.functionSpec.validateArguments).to.have.been.calledWith([
                    sinon.match.same(argValue1),
                    sinon.match.same(argValue2)
                ]);
                expect(this.functionSpec.validateArguments)
                    .to.have.been.calledAfter(this.functionSpec.coerceArguments);
            });

            it('should populate default argument values at the right point', function () {
                var argValue1 = this.valueFactory.createInteger(21),
                    argValue2 = this.valueFactory.createInteger(101),
                    func = this.callCreate();

                func(argValue1, argValue2);

                expect(this.functionSpec.populateDefaultArguments).to.have.been.calledOnce;
                expect(this.functionSpec.populateDefaultArguments).to.have.been.calledWith([
                    sinon.match.same(argValue1),
                    sinon.match.same(argValue2)
                ]);
                expect(this.functionSpec.populateDefaultArguments)
                    .to.have.been.calledAfter(this.functionSpec.validateArguments);
                expect(this.functionSpec.populateDefaultArguments)
                    .to.have.been.calledBefore(this.callStack.pop);
            });

            it('should pop the call off the stack when the wrapped function returns', function () {
                this.callCreate()();

                expect(this.callStack.pop).to.have.been.calledOnce;
            });

            it('should pop the call off the stack even when the wrapped function throws', function () {
                var error = new Error('argh');
                this.func.throws(error);

                expect(function () {
                    this.callCreate()();
                }.bind(this)).to.throw(error);
                expect(this.callStack.pop).to.have.been.calledOnce;
            });

            it('should pass the scope as the thisObject when calling the wrapped function', function () {
                this.callCreate()();

                expect(this.func).to.have.been.calledOn(sinon.match.same(this.scope));
            });

            it('should pass arguments through to the wrapped function', function () {
                var argValue1 = this.valueFactory.createInteger(123),
                    argValue2 = this.valueFactory.createString('second'),
                    argValue3 = this.valueFactory.createString('another');

                this.callCreate()(argValue1, argValue2, argValue3);

                expect(this.func).to.have.been.calledOnce;
                expect(this.func).to.have.been.calledWith(
                    sinon.match.same(argValue1),
                    sinon.match.same(argValue2),
                    sinon.match.same(argValue3)
                );
            });

            it('should have the FunctionSpec stored against it', function () {
                expect(this.callCreate().functionSpec).to.equal(this.functionSpec);
            });

            it('should have the isPHPCoreWrapped flag set against it', function () {
                expect(this.callCreate().isPHPCoreWrapped).to.be.true;
            });

            it('should have the original function stored against it', function () {
                expect(this.callCreate().originalFunc).to.equal(this.func);
            });
        });
    });

    describe('createMethodSpec()', function () {
        it('should create the MethodSpec using the correct constructor args', function () {
            var classObject = sinon.createStubInstance(Class),
                myMethod = sinon.stub(),
                originalClass = sinon.createStubInstance(Class);

            this.factory.createMethodSpec(originalClass, classObject, 'myMethod', myMethod);

            expect(this.MethodSpec).to.have.been.calledOnce;
            expect(this.MethodSpec).to.have.been.calledWith(
                sinon.match.same(originalClass),
                sinon.match.same(classObject),
                'myMethod',
                sinon.match.same(myMethod)
            );
        });

        it('should return the created MethodSpec', function () {
            var classObject = sinon.createStubInstance(Class),
                methodSpec = sinon.createStubInstance(this.MethodSpec),
                myMethod = sinon.stub(),
                originalClass = sinon.createStubInstance(Class);
            this.MethodSpec.returns(methodSpec);

            expect(this.factory.createMethodSpec(originalClass, classObject, 'myMethod', myMethod)).to.equal(methodSpec);
        });
    });
});
