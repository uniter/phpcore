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
    FunctionSpec = require('../../src/Function/FunctionSpec'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    Scope = require('../../src/Scope').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Closure', function () {
    var closure,
        closureFactory,
        enclosingScope,
        functionSpec,
        namespaceScope,
        thisObject,
        unwrappedFunction,
        valueFactory,
        wrappedFunction;

    beforeEach(function () {
        closureFactory = sinon.createStubInstance(ClosureFactory);
        enclosingScope = sinon.createStubInstance(Scope);
        functionSpec = sinon.createStubInstance(FunctionSpec);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        thisObject = sinon.createStubInstance(ObjectValue);
        unwrappedFunction = sinon.stub();
        valueFactory = sinon.createStubInstance(ValueFactory);
        wrappedFunction = sinon.stub();

        closure = new Closure(
            closureFactory,
            valueFactory,
            namespaceScope,
            enclosingScope,
            unwrappedFunction,
            wrappedFunction,
            thisObject,
            functionSpec
        );
    });

    describe('bind()', function () {
        var boundClosure,
            callBind,
            scopeClass,
            thisObject;

        beforeEach(function () {
            boundClosure = sinon.createStubInstance(Closure);
            scopeClass = sinon.createStubInstance(Class);
            thisObject = sinon.createStubInstance(ObjectValue);

            closureFactory.create.returns(boundClosure);

            callBind = function () {
                return closure.bind(thisObject, scopeClass);
            };
        });

        it('should pass the enclosing Scope to the ClosureFactory', function () {
            callBind();

            expect(closureFactory.create).to.have.been.calledOnce;
            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.same(enclosingScope)
            );
        });

        it('should pass the unwrapped function to the ClosureFactory', function () {
            callBind();

            expect(closureFactory.create).to.have.been.calledOnce;
            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(unwrappedFunction)
            );
        });

        it('should pass the NamespaceScope to the ClosureFactory', function () {
            callBind();

            expect(closureFactory.create).to.have.been.calledOnce;
            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(namespaceScope)
            );
        });

        it('should pass the scope Class to the ClosureFactory when provided', function () {
            callBind();

            expect(closureFactory.create).to.have.been.calledOnce;
            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(scopeClass)
            );
        });

        it('should pass null as scope Class to the ClosureFactory when not provided', function () {
            closure.bind(thisObject);

            expect(closureFactory.create).to.have.been.calledOnce;
            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });

        it('should pass the thisObject to the ClosureFactory', function () {
            callBind();

            expect(closureFactory.create).to.have.been.calledOnce;
            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(thisObject)
            );
        });

        it('should pass the FunctionSpec to the ClosureFactory', function () {
            callBind();

            expect(closureFactory.create).to.have.been.calledOnce;
            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(functionSpec)
            );
        });

        it('should return the created Closure', function () {
            expect(callBind()).to.equal(boundClosure);
        });
    });

    describe('invoke()', function () {
        it('should call the wrapped function once', function () {
            closure.invoke([]);

            expect(wrappedFunction).to.have.been.calledOnce;
        });

        it('should use the provided `this` object for the wrapped function', function () {
            var thisObject = sinon.createStubInstance(ObjectValue);

            closure.invoke([], thisObject);

            expect(wrappedFunction).to.have.been.calledOn(
                sinon.match.same(thisObject)
            );
        });

        it('should use the Closure\'s `this` object for the wrapped function when not provided', function () {
            closure.invoke([]);

            expect(wrappedFunction).to.have.been.calledOn(
                sinon.match.same(thisObject)
            );
        });

        it('should call the wrapped function with the provided arguments', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);

            closure.invoke([arg1, arg2]);

            expect(wrappedFunction).to.have.been.calledWith(
                sinon.match.same(arg1),
                sinon.match.same(arg2)
            );
        });

        it('should return the coerced result from the wrapped function', function () {
            var coercedResultValue = sinon.createStubInstance(Value),
                resultValue = sinon.createStubInstance(Value);
            wrappedFunction.returns(resultValue);
            valueFactory.coerce.withArgs(sinon.match.same(resultValue)).returns(coercedResultValue);

            expect(closure.invoke([])).to.equal(coercedResultValue);
        });
    });
});
