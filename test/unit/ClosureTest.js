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
    FunctionFactory = require('../../src/FunctionFactory').sync(),
    FunctionSpec = require('../../src/Function/FunctionSpec'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    Scope = require('../../src/Scope').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Closure', function () {
    beforeEach(function () {
        this.closureFactory = sinon.createStubInstance(ClosureFactory);
        this.enclosingScope = sinon.createStubInstance(Scope);
        this.functionFactory = sinon.createStubInstance(FunctionFactory);
        this.functionSpec = sinon.createStubInstance(FunctionSpec);
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);
        this.thisObject = sinon.createStubInstance(ObjectValue);
        this.unwrappedFunction = sinon.stub();
        this.valueFactory = sinon.createStubInstance(ValueFactory);
        this.wrappedFunction = sinon.stub();

        this.closure = new Closure(
            this.closureFactory,
            this.valueFactory,
            this.namespaceScope,
            this.enclosingScope,
            this.unwrappedFunction,
            this.wrappedFunction,
            this.thisObject,
            this.functionSpec
        );
    });

    describe('bind()', function () {
        beforeEach(function () {
            this.boundClosure = sinon.createStubInstance(Closure);
            this.scopeClass = sinon.createStubInstance(Class);
            this.thisObject = sinon.createStubInstance(ObjectValue);

            this.closureFactory.create.returns(this.boundClosure);

            this.callBind = function () {
                return this.closure.bind(this.thisObject, this.scopeClass);
            }.bind(this);
        });

        it('should pass the enclosing Scope to the ClosureFactory', function () {
            this.callBind();

            expect(this.closureFactory.create).to.have.been.calledOnce;
            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.same(this.enclosingScope)
            );
        });

        it('should pass the unwrapped function to the ClosureFactory', function () {
            this.callBind();

            expect(this.closureFactory.create).to.have.been.calledOnce;
            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.unwrappedFunction)
            );
        });

        it('should pass the NamespaceScope to the ClosureFactory', function () {
            this.callBind();

            expect(this.closureFactory.create).to.have.been.calledOnce;
            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.namespaceScope)
            );
        });

        it('should pass the scope Class to the ClosureFactory when provided', function () {
            this.callBind();

            expect(this.closureFactory.create).to.have.been.calledOnce;
            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.scopeClass)
            );
        });

        it('should pass null as scope Class to the ClosureFactory when not provided', function () {
            this.closure.bind(this.thisObject);

            expect(this.closureFactory.create).to.have.been.calledOnce;
            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });

        it('should pass the thisObject to the ClosureFactory', function () {
            this.callBind();

            expect(this.closureFactory.create).to.have.been.calledOnce;
            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.thisObject)
            );
        });

        it('should pass the FunctionSpec to the ClosureFactory', function () {
            this.callBind();

            expect(this.closureFactory.create).to.have.been.calledOnce;
            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.functionSpec)
            );
        });

        it('should return the created Closure', function () {
            expect(this.callBind()).to.equal(this.boundClosure);
        });
    });

    describe('invoke()', function () {
        it('should call the wrapped function once', function () {
            this.closure.invoke([]);

            expect(this.wrappedFunction).to.have.been.calledOnce;
        });

        it('should use the provided `this` object for the wrapped function', function () {
            var thisObject = sinon.createStubInstance(ObjectValue);

            this.closure.invoke([], thisObject);

            expect(this.wrappedFunction).to.have.been.calledOn(
                sinon.match.same(thisObject)
            );
        });

        it('should use the Closure\'s `this` object for the wrapped function when not provided', function () {
            this.closure.invoke([]);

            expect(this.wrappedFunction).to.have.been.calledOn(
                sinon.match.same(this.thisObject)
            );
        });

        it('should call the wrapped function with the provided arguments', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);

            this.closure.invoke([arg1, arg2]);

            expect(this.wrappedFunction).to.have.been.calledWith(
                sinon.match.same(arg1),
                sinon.match.same(arg2)
            );
        });

        it('should return the coerced result from the wrapped function', function () {
            var coercedResultValue = sinon.createStubInstance(Value),
                resultValue = sinon.createStubInstance(Value);
            this.wrappedFunction.returns(resultValue);
            this.valueFactory.coerce.withArgs(sinon.match.same(resultValue)).returns(coercedResultValue);

            expect(this.closure.invoke([])).to.equal(coercedResultValue);
        });
    });
});
