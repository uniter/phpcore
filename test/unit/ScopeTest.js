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
    Closure = require('../../src/Closure').sync(),
    ClosureFactory = require('../../src/ClosureFactory').sync(),
    Namespace = require('../../src/Namespace').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    PHPFatalError = require('phpcommon').PHPFatalError,
    ReferenceFactory = require('../../src/ReferenceFactory').sync(),
    Scope = require('../../src/Scope').sync(),
    StringValue = require('../../src/Value/String').sync(),
    SuperGlobalScope = require('../../src/SuperGlobalScope').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync(),
    Variable = require('../../src/Variable').sync(),
    VariableReference = require('../../src/Reference/Variable');

describe('Scope', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.closure = sinon.createStubInstance(Closure);
        this.currentClass = null;
        this.currentFunction = null;
        this.closureFactory = sinon.createStubInstance(ClosureFactory);
        this.globalScope = sinon.createStubInstance(Scope);
        this.namespace = sinon.createStubInstance(Namespace);
        this.referenceFactory = sinon.createStubInstance(ReferenceFactory);
        this.superGlobalScope = sinon.createStubInstance(SuperGlobalScope);
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.closureFactory.create.returns(this.closure);
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
        this.createScope = function (thisObject) {
            this.scope = new Scope(
                this.callStack,
                this.globalScope,
                this.superGlobalScope,
                this.closureFactory,
                this.valueFactory,
                this.referenceFactory,
                this.namespace,
                this.currentClass,
                this.currentFunction,
                thisObject || null
            );
        }.bind(this);
    });

    describe('createClosure()', function () {
        beforeEach(function () {
            this.thisObject = sinon.createStubInstance(ObjectValue);

            this.whenCurrentClass();
            this.whenCurrentFunction();
            this.createScope(this.thisObject);
        });

        it('should return the Closure from the ClosureFactory', function () {
            expect(this.scope.createClosure(this.func)).to.equal(this.closure);
        });

        it('should create one Closure with the ClosureFactory', function () {
            this.scope.createClosure(this.func);

            expect(this.closureFactory.create).to.have.been.calledOnce;
        });

        it('should pass the scope to the ClosureFactory', function () {
            this.scope.createClosure(this.func);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.same(this.scope)
            );
        });

        it('should pass the unwrapped function to the ClosureFactory', function () {
            this.scope.createClosure(this.func);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.func)
            );
        });

        it('should pass the namespace to the ClosureFactory', function () {
            this.scope.createClosure(this.func);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.namespace)
            );
        });

        it('should pass the class to the ClosureFactory', function () {
            this.scope.createClosure(this.func);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.currentClass)
            );
        });

        it('should fetch and bind the closure to the `$this` object from the current scope', function () {
            this.scope.createClosure(this.func);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.thisObject)
            );
        });

        it('should not bind the closure to an object when it is static', function () {
            this.scope.createClosure(this.func, true);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null // No `$this` object is to be bound
            );
        });
    });

    describe('exportVariables()', function () {
        it('should export all defined variables in addition to the super globals', function () {
            var superGlobalValue = sinon.createStubInstance(Value),
                variableValue = sinon.createStubInstance(Value),
                variables;
            this.createScope();
            superGlobalValue.getForAssignment.returns(superGlobalValue);
            variableValue.getForAssignment.returns(variableValue);
            this.scope.defineVariable('firstVariable').setValue(variableValue);
            this.scope.defineVariable('anUndefinedVariable');
            this.superGlobalScope.exportVariables.returns({
                '_STUFF': superGlobalValue
            });

            variables = this.scope.exportVariables();

            expect(variables._STUFF).to.equal(superGlobalValue);
            expect(variables.firstVariable).to.equal(variableValue);
            expect(variables).not.to.have.property('anUndefinedVariable');
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

    describe('getClassNameOrThrow()', function () {
        it('should return the name of the current class when present', function () {
            this.whenCurrentClass();
            this.whenCurrentFunction();
            this.currentClass.getName.returns('My\\Scope\\MyClass');
            this.createScope();

            expect(this.scope.getClassNameOrThrow().getNative()).to.equal('My\\Scope\\MyClass');
        });

        it('should throw when there is no current class', function () {
            this.createScope();

            expect(function () {
                this.scope.getClassNameOrThrow();
            }.bind(this)).to.throw(PHPFatalError, 'Cannot access self:: when no class scope is active');
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

    describe('getMethodName()', function () {
        it('should return the namespace, class and name when function is a class method', function () {
            this.whenCurrentClass();
            this.whenCurrentFunction();
            this.namespace.getPrefix.returns('My\\App\\Space\\');
            this.currentClass.getName.returns('My\\App\\Space\\MyClass');
            this.currentFunction.funcName = 'myMethod';
            this.createScope();

            expect(this.scope.getMethodName().getNative()).to.equal('My\\App\\Space\\MyClass::myMethod');
        });

        it('should prefix with the namespace when function is normal', function () {
            this.whenCurrentFunction();
            this.namespace.getPrefix.returns('My\\App\\Space\\');
            this.currentFunction.funcName = 'myFunc';
            this.createScope();

            expect(this.scope.getMethodName().getNative()).to.equal('My\\App\\Space\\myFunc');
        });

        it('should return the empty string when there is no current function', function () {
            this.createScope();

            expect(this.scope.getMethodName().getNative()).to.equal('');
        });
    });

    describe('getVariable()', function () {
        it('should fetch the existing variable if already defined', function () {
            var variable,
                fetchedVariable;
            this.createScope();
            variable = this.scope.defineVariable('myVar');

            fetchedVariable = this.scope.getVariable('myVar');

            expect(fetchedVariable).to.be.an.instanceOf(Variable);
            expect(fetchedVariable).to.equal(variable);
        });

        it('should implicitly define the variable if not already defined', function () {
            var fetchedVariable;
            this.createScope();

            fetchedVariable = this.scope.getVariable('myUndefinedVar');

            expect(fetchedVariable).to.be.an.instanceOf(Variable);
            expect(fetchedVariable.getName()).to.equal('myUndefinedVar');
        });

        it('should fetch a super global if defined', function () {
            var superGlobal = sinon.createStubInstance(Variable);
            this.superGlobalScope.getVariable.withArgs('_ENV').returns(superGlobal);
            this.createScope();

            expect(this.scope.getVariable('_ENV')).to.equal(superGlobal);
        });
    });

    describe('importGlobal()', function () {
        beforeEach(function () {
            this.createScope();
        });

        it('should define variable in current scope as reference to variable in global scope', function () {
            var globalVariable = sinon.createStubInstance(Variable),
                reference = sinon.createStubInstance(VariableReference),
                value = sinon.createStubInstance(StringValue);
            this.referenceFactory.createVariable.withArgs(sinon.match.same(globalVariable)).returns(reference);
            this.globalScope.getVariable.withArgs('myVar').returns(globalVariable);
            reference.getValue.returns(value);

            this.scope.importGlobal('myVar');

            expect(this.scope.getVariable('myVar').getValue()).to.equal(value);
        });
    });
});
