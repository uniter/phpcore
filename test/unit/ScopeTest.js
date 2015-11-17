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
    FunctionFactory = require('../../src/FunctionFactory'),
    Namespace = require('../../src/Namespace').sync(),
    Scope = require('../../src/Scope').sync(),
    StringValue = require('../../src/Value/String').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Scope', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.closure = sinon.stub();
        this.currentClass = null;
        this.currentFunction = null;
        this.functionFactory = sinon.createStubInstance(FunctionFactory);
        this.namespace = sinon.createStubInstance(Namespace);
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.functionFactory.create.returns(this.closure);
        this.valueFactory.createString.restore();
        sinon.stub(this.valueFactory, 'createString', function (string) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.getNative.returns(string);
            return stringValue;
        });

        this.whenCurrentClass = function () {
            this.currentClass = sinon.createStubInstance(Class);
        }.bind(this);
        this.whenCurrentFunction = function () {
            this.currentFunction = sinon.stub();
        }.bind(this);
        this.createScope = function () {
            this.scope = new Scope(
                this.callStack,
                this.functionFactory,
                this.valueFactory,
                this.namespace,
                this.currentClass,
                this.currentFunction,
                this.thisObject
            );
        }.bind(this);
    });

    describe('createClosure()', function () {
        beforeEach(function () {
            this.whenCurrentClass();
            this.whenCurrentFunction();
            this.createScope();
        });

        it('should return the function from the FunctionFactory', function () {
            expect(this.scope.createClosure(this.func)).to.equal(this.closure);
        });

        it('should create one function with the FunctionFactory', function () {
            this.scope.createClosure(this.func);

            expect(this.functionFactory.create).to.have.been.calledOnce;
        });

        it('should pass the namespace to the FunctionFactory', function () {
            this.scope.createClosure(this.func);

            expect(this.functionFactory.create).to.have.been.calledWith(
                sinon.match.same(this.namespace)
            );
        });

        it('should pass the class to the FunctionFactory', function () {
            this.scope.createClosure(this.func);

            expect(this.functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.currentClass)
            );
        });

        it('should pass the scope to the FunctionFactory', function () {
            this.scope.createClosure(this.func);

            expect(this.functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.scope)
            );
        });

        it('should pass the wrapped function to the FunctionFactory', function () {
            this.scope.createClosure(this.func);

            expect(this.functionFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.func)
            );
        });
    });

    describe('getClassName()', function () {
        it('should return the name of the current class when present', function () {
            this.whenCurrentClass();
            this.whenCurrentFunction();
            this.currentClass.getName.returns('MyClass');
            this.createScope();

            expect(this.scope.getClassName().getNative()).to.equal('MyClass');
        });

        it('should return the empty string when there is no current class', function () {
            this.createScope();

            expect(this.scope.getClassName().getNative()).to.equal('');
        });
    });

    describe('getFunctionName()', function () {
        it('should return only the name when function is a class method', function () {
            this.whenCurrentClass();
            this.whenCurrentFunction();
            this.namespace.getPrefix.returns('My\\App\\Space\\');
            this.currentFunction.funcName = 'myMethod';
            this.createScope();

            expect(this.scope.getFunctionName().getNative()).to.equal('myMethod');
        });

        it('should prefix with the namespace when function is normal', function () {
            this.whenCurrentFunction();
            this.namespace.getPrefix.returns('My\\App\\Space\\');
            this.currentFunction.funcName = 'myFunc';
            this.createScope();

            expect(this.scope.getFunctionName().getNative()).to.equal('My\\App\\Space\\myFunc');
        });

        it('should return the empty string when there is no current function', function () {
            this.createScope();

            expect(this.scope.getFunctionName().getNative()).to.equal('');
        });
    });
});
