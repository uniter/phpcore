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
    ClosureFactory = require('../../src/ClosureFactory').sync(),
    FunctionFactory = require('../../src/FunctionFactory').sync(),
    FunctionSpec = require('../../src/Function/FunctionSpec'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    Scope = require('../../src/Scope').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('ClosureFactory', function () {
    var callStack,
        Closure,
        factory,
        functionFactory,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        Closure = sinon.stub();
        functionFactory = sinon.createStubInstance(FunctionFactory);
        valueFactory = new ValueFactory();

        factory = new ClosureFactory(functionFactory, valueFactory, callStack, Closure);
    });

    describe('create()', function () {
        var callCreate,
            enclosingScope,
            functionSpec,
            namespaceScope,
            scopeClass,
            thisObject,
            thisObjectClass,
            unwrappedFunction,
            wrappedFunction;

        beforeEach(function () {
            enclosingScope = sinon.createStubInstance(Scope);
            functionSpec = sinon.createStubInstance(FunctionSpec);
            namespaceScope = sinon.createStubInstance(NamespaceScope);
            scopeClass = sinon.createStubInstance(Class);
            thisObject = sinon.createStubInstance(ObjectValue);
            thisObjectClass = sinon.createStubInstance(Class);
            unwrappedFunction = sinon.stub();
            wrappedFunction = sinon.stub();

            functionFactory.create.returns(wrappedFunction);
            thisObject.getClass.returns(thisObjectClass);

            callCreate = function (dontUseScopeClass, dontUseThisObject) {
                return factory.create(
                    enclosingScope,
                    namespaceScope,
                    dontUseScopeClass ? null : scopeClass,
                    dontUseThisObject ? null : thisObject,
                    functionSpec
                );
            }.bind(this);
        });

        it('should pass the NamespaceScope to the FunctionFactory', function () {
            callCreate();

            expect(functionFactory.create).to.have.been.calledOnce;
            expect(functionFactory.create).to.have.been.calledWith(
                sinon.match.same(namespaceScope)
            );
        });

        it('should pass the scope Class to the FunctionFactory when provided', function () {
            callCreate();

            expect(functionFactory.create).to.have.been.calledOnce;
            expect(functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(scopeClass)
            );
        });

        it('should pass the Class of `$this` object to the FunctionFactory when not provided', function () {
            factory.create(
                enclosingScope,
                namespaceScope,
                null,
                thisObject
            );

            expect(functionFactory.create).to.have.been.calledOnce;
            expect(functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(thisObjectClass)
            );
        });

        it('should pass null as scope Class to the FunctionFactory when not provided and no `$this`', function () {
            factory.create(
                enclosingScope,
                namespaceScope,
                null,
                null
            );

            expect(functionFactory.create).to.have.been.calledOnce;
            expect(functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                null
            );
        });

        it('should pass null as scope Class to the FunctionFactory when NullValue provided and no `$this`', function () {
            factory.create(
                enclosingScope,
                namespaceScope,
                null,
                valueFactory.createNull()
            );

            expect(functionFactory.create).to.have.been.calledOnce;
            expect(functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                null
            );
        });

        it('should pass null as the $this object to FunctionFactory - will be specified on invocation', function () {
            callCreate();

            expect(functionFactory.create).to.have.been.calledOnce;
            expect(functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                null
            );
        });

        it('should pass the static class from the call stack to the FunctionFactory, if specified and not Closure', function () {
            var staticClass = sinon.createStubInstance(Class);
            staticClass.is.withArgs('Closure').returns(false);
            callStack.getStaticClass.returns(staticClass);

            callCreate();

            expect(functionFactory.create).to.have.been.calledOnce;
            expect(functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(staticClass)
            );
        });

        it('should pass the scope class from the call stack to the FunctionFactory, if static class is specified but is Closure', function () {
            var staticClass = sinon.createStubInstance(Class);
            staticClass.is.withArgs('Closure').returns(true);
            callStack.getStaticClass.returns(staticClass);

            callCreate();

            expect(functionFactory.create).to.have.been.calledOnce;
            expect(functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(scopeClass)
            );
        });

        it('should pass the scope class as the static class to the FunctionFactory, if set', function () {
            callCreate();

            expect(functionFactory.create).to.have.been.calledOnce;
            expect(functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(scopeClass)
            );
        });

        it('should pass the $this object\'s class as the scope class if none explicitly provided', function () {
            callCreate(true);

            expect(functionFactory.create).to.have.been.calledOnce;
            expect(functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(thisObjectClass)
            );
        });

        it('should pass null as the static class to the FunctionFactory if there is not one nor a $this', function () {
            callCreate(true, true);

            expect(functionFactory.create).to.have.been.calledOnce;
            expect(functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });

        it('should pass the FunctionSpec to the FunctionFactory', function () {
            callCreate(true, true);

            expect(functionFactory.create).to.have.been.calledOnce;
            expect(functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(functionSpec)
            );
        });

        it('should pass the factory to the Closure', function () {
            callCreate();

            expect(Closure).to.have.been.calledOnce;
            expect(Closure).to.have.been.calledWith(
                sinon.match.same(factory)
            );
        });

        it('should pass the ValueFactory to the Closure', function () {
            callCreate();

            expect(Closure).to.have.been.calledOnce;
            expect(Closure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(valueFactory)
            );
        });

        it('should pass the NamespaceScope to the Closure', function () {
            callCreate();

            expect(Closure).to.have.been.calledOnce;
            expect(Closure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(namespaceScope)
            );
        });

        it('should pass the enclosing Scope to the Closure', function () {
            callCreate();

            expect(Closure).to.have.been.calledOnce;
            expect(Closure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(enclosingScope)
            );
        });

        it('should pass the created wrapped function to the Closure', function () {
            callCreate();

            expect(Closure).to.have.been.calledOnce;
            expect(Closure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(wrappedFunction)
            );
        });

        it('should pass the `$this` object to the Closure', function () {
            callCreate();

            expect(Closure).to.have.been.calledOnce;
            expect(Closure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(thisObject)
            );
        });

        it('should pass the FunctionSpec to the Closure', function () {
            callCreate();

            expect(Closure).to.have.been.calledOnce;
            expect(Closure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(functionSpec)
            );
        });

        it('should return the created Closure', function () {
            var closure = sinon.createStubInstance(Closure);
            Closure.returns(closure);

            expect(callCreate()).to.equal(closure);
        });
    });
});
