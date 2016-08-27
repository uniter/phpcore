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
    Class = require('../../src/Class').sync(),
    Closure = require('../../src/Closure').sync(),
    ClosureFactory = require('../../src/ClosureFactory').sync(),
    FunctionFactory = require('../../src/FunctionFactory'),
    Namespace = require('../../src/Namespace').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    Scope = require('../../src/Scope').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('ClosureFactory', function () {
    beforeEach(function () {
        this.Closure = sinon.stub();
        this.functionFactory = sinon.createStubInstance(FunctionFactory);
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.factory = new ClosureFactory(this.functionFactory, this.valueFactory, this.Closure);
    });

    describe('create()', function () {
        beforeEach(function () {
            this.enclosingScope = sinon.createStubInstance(Scope);
            this.namespace = sinon.createStubInstance(Namespace);
            this.scopeClass = sinon.createStubInstance(Class);
            this.thisObject = sinon.createStubInstance(ObjectValue);
            this.thisObjectClass = sinon.createStubInstance(Class);
            this.unwrappedFunction = sinon.stub();
            this.wrappedFunction = sinon.stub();

            this.functionFactory.create.returns(this.wrappedFunction);
            this.thisObject.getClass.returns(this.thisObjectClass);

            this.callCreate = function () {
                return this.factory.create(
                    this.enclosingScope,
                    this.unwrappedFunction,
                    this.namespace,
                    this.scopeClass,
                    this.thisObject
                );
            }.bind(this);
        });

        it('should pass the Namespace to the FunctionFactory', function () {
            this.callCreate();

            expect(this.functionFactory.create).to.have.been.calledOnce;
            expect(this.functionFactory.create).to.have.been.calledWith(
                sinon.match.same(this.namespace)
            );
        });

        it('should pass the scope Class to the FunctionFactory when provided', function () {
            this.callCreate();

            expect(this.functionFactory.create).to.have.been.calledOnce;
            expect(this.functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.scopeClass)
            );
        });

        it('should pass the Class of `$this` object to the FunctionFactory when not provided', function () {
            this.factory.create(
                this.enclosingScope,
                this.unwrappedFunction,
                this.namespace,
                null,
                this.thisObject
            );

            expect(this.functionFactory.create).to.have.been.calledOnce;
            expect(this.functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.thisObjectClass)
            );
        });

        it('should pass null as scope Class to the FunctionFactory when not provided and no `$this`', function () {
            this.factory.create(
                this.enclosingScope,
                this.unwrappedFunction,
                this.namespace,
                null,
                null
            );

            expect(this.functionFactory.create).to.have.been.calledOnce;
            expect(this.functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                null
            );
        });

        it('should pass the unwrapped function to the FunctionFactory', function () {
            this.callCreate();

            expect(this.functionFactory.create).to.have.been.calledOnce;
            expect(this.functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.unwrappedFunction)
            );
        });

        it('should pass the factory to the Closure', function () {
            this.callCreate();

            expect(this.Closure).to.have.been.calledOnce;
            expect(this.Closure).to.have.been.calledWith(
                sinon.match.same(this.factory)
            );
        });

        it('should pass the ValueFactory to the Closure', function () {
            this.callCreate();

            expect(this.Closure).to.have.been.calledOnce;
            expect(this.Closure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.valueFactory)
            );
        });

        it('should pass the Namespace to the Closure', function () {
            this.callCreate();

            expect(this.Closure).to.have.been.calledOnce;
            expect(this.Closure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.namespace)
            );
        });

        it('should pass the enclosing Scope to the Closure', function () {
            this.callCreate();

            expect(this.Closure).to.have.been.calledOnce;
            expect(this.Closure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.enclosingScope)
            );
        });

        it('should pass the unwrapped function to the Closure', function () {
            this.callCreate();

            expect(this.Closure).to.have.been.calledOnce;
            expect(this.Closure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.unwrappedFunction)
            );
        });

        it('should pass the created wrapped function to the Closure', function () {
            this.callCreate();

            expect(this.Closure).to.have.been.calledOnce;
            expect(this.Closure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.wrappedFunction)
            );
        });

        it('should pass the `$this` object to the Closure', function () {
            this.callCreate();

            expect(this.Closure).to.have.been.calledOnce;
            expect(this.Closure).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.thisObject)
            );
        });

        it('should return the created Closure', function () {
            var closure = sinon.createStubInstance(Closure);
            this.Closure.returns(closure);

            expect(this.callCreate()).to.equal(closure);
        });
    });
});
