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
    FunctionSpec = require('../../src/Function/FunctionSpec'),
    FunctionSpecFactory = require('../../src/Function/FunctionSpecFactory'),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    ReferenceFactory = require('../../src/ReferenceFactory').sync(),
    Scope = require('../../src/Scope').sync(),
    StringValue = require('../../src/Value/String').sync(),
    SuperGlobalScope = require('../../src/SuperGlobalScope').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync(),
    Variable = require('../../src/Variable').sync(),
    VariableFactory = require('../../src/VariableFactory').sync(),
    VariableReference = require('../../src/Reference/Variable');

describe('Scope', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.closure = sinon.createStubInstance(Closure);
        this.currentClass = null;
        this.currentFunction = null;
        this.closureFactory = sinon.createStubInstance(ClosureFactory);
        this.functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);
        this.globalScope = sinon.createStubInstance(Scope);
        this.parentClass = null;
        this.referenceFactory = sinon.createStubInstance(ReferenceFactory);
        this.superGlobalScope = sinon.createStubInstance(SuperGlobalScope);
        this.valueFactory = new ValueFactory();
        this.variableFactory = sinon.createStubInstance(VariableFactory);

        this.callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error('PHP ' + level + ': [' + translationKey + '] ' + JSON.stringify(placeholderVariables || {}));
        });

        this.closureFactory.create.returns(this.closure);

        this.variableFactory.createVariable.callsFake(function (variableName) {
            return new Variable(this.callStack, this.valueFactory, variableName);
        }.bind(this));

        this.whenCurrentClass = function () {
            this.currentClass = sinon.createStubInstance(Class);
            this.currentClass.getSuperClass.returns(null);
        }.bind(this);
        this.whenCurrentFunction = function () {
            this.currentFunction = sinon.stub();
            this.currentFunction.functionSpec = sinon.createStubInstance(FunctionSpec);
        }.bind(this);
        this.whenParentClass = function () {
            this.parentClass = sinon.createStubInstance(Class);
            this.currentClass.getSuperClass.returns(this.parentClass);
        }.bind(this);
        this.createScope = function (thisObject, globalScope) {
            this.scope = new Scope(
                this.callStack,
                globalScope !== undefined ? globalScope : this.globalScope,
                this.superGlobalScope,
                this.closureFactory,
                this.functionSpecFactory,
                this.valueFactory,
                this.variableFactory,
                this.referenceFactory,
                this.currentClass,
                this.currentFunction,
                thisObject || null
            );
        }.bind(this);
    });

    describe('createClosure()', function () {
        beforeEach(function () {
            this.namespaceScope = sinon.createStubInstance(NamespaceScope);
            this.thisObject = sinon.createStubInstance(ObjectValue);

            this.namespaceScope.getFilePath.returns('/path/to/my_module.php');

            this.whenCurrentClass();
            this.whenCurrentFunction();
            this.createScope(this.thisObject);
        });

        it('should return the Closure from the ClosureFactory', function () {
            expect(this.scope.createClosure(this.namespaceScope, this.func)).to.equal(this.closure);
        });

        it('should create one Closure with the ClosureFactory', function () {
            this.scope.createClosure(this.namespaceScope, this.func);

            expect(this.closureFactory.create).to.have.been.calledOnce;
        });

        it('should pass the scope to the ClosureFactory', function () {
            this.scope.createClosure(this.namespaceScope, this.func);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.same(this.scope)
            );
        });

        it('should pass the unwrapped function to the ClosureFactory', function () {
            this.scope.createClosure(this.namespaceScope, this.func);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.func)
            );
        });

        it('should pass the NamespaceScope to the ClosureFactory', function () {
            this.scope.createClosure(this.namespaceScope, this.func);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.namespaceScope)
            );
        });

        it('should pass the class to the ClosureFactory', function () {
            this.scope.createClosure(this.namespaceScope, this.func);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.currentClass)
            );
        });

        it('should fetch and bind the closure to the `$this` object from the current scope', function () {
            this.scope.createClosure(this.namespaceScope, this.func);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.thisObject)
            );
        });

        it('should not bind the closure to an object when it is static', function () {
            this.scope.createClosure(this.namespaceScope, this.func, [], true);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null // No `$this` object is to be bound
            );
        });

        it('should pass a correctly constructed closure FunctionSpec to the ClosureFactory', function () {
            var closureFunctionSpec = sinon.createStubInstance(FunctionSpec);
            this.functionSpecFactory.createClosureSpec
                .withArgs(
                    sinon.match.same(this.namespaceScope),
                    sinon.match.same(this.currentClass),
                    [],
                    '/path/to/my_module.php',
                    1234
                )
                .returns(closureFunctionSpec);

            this.scope.createClosure(this.namespaceScope, this.func, [], false, 1234);

            expect(this.closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(closureFunctionSpec)
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

    describe('expose()', function () {
        beforeEach(function () {
            this.createScope();
        });

        it('should define a variable in the current scope with a given wrapped value', function () {
            var value;
            this.scope.expose(this.valueFactory.createInteger(321), 'myVar');

            value = this.scope.getVariable('myVar').getValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(321);
        });

        it('should define a variable in the current scope with a given native value', function () {
            var value;
            this.scope.expose(4567, 'myVar');

            value = this.scope.getVariable('myVar').getValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(4567);
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
            }.bind(this)).to.throw('PHP Fatal error: [core.cannot_access_when_no_active_class] {"className":"self"}');
        });
    });

    describe('getFilePath()', function () {
        it('should just pass the given path through unaltered', function () {
            this.createScope();

            expect(this.scope.getFilePath('/my/path.php')).to.equal('/my/path.php');
        });
    });

    describe('getFunctionName()', function () {
        it('should return only the name when function is a class method', function () {
            this.whenCurrentClass();
            this.whenCurrentFunction();
            this.currentFunction.functionSpec.getUnprefixedFunctionName.returns('myMethod');
            this.createScope();

            expect(this.scope.getFunctionName().getNative()).to.equal('myMethod');
        });

        it('should return only the name when function is normal', function () {
            this.whenCurrentFunction();
            this.currentFunction.functionSpec.getUnprefixedFunctionName.returns('myFunc');
            this.createScope();

            expect(this.scope.getFunctionName().getNative()).to.equal('myFunc');
        });

        it('should return the empty string when there is no current function', function () {
            this.createScope();

            expect(this.scope.getFunctionName().getNative()).to.equal('');
        });
    });

    describe('getMethodName()', function () {
        it('should return the namespace, class and name when function is a class method and call is static', function () {
            this.whenCurrentClass();
            this.whenCurrentFunction();
            this.currentClass.getName.returns('My\\App\\Space\\MyClass');
            this.currentFunction.functionSpec.getFunctionName
                .withArgs(true)
                .returns('My\\App\\Space\\MyClass::myMethod');
            this.currentFunction.functionSpec.getFunctionName
                .withArgs(false)
                .returns('My\\App\\Space\\MyClass->myMethod');
            this.createScope();

            expect(this.scope.getMethodName(true).getNative()).to.equal('My\\App\\Space\\MyClass::myMethod');
        });

        it('should return the namespace, class and name when function is a class method and call is non-static', function () {
            this.whenCurrentClass();
            this.whenCurrentFunction();
            this.currentClass.getName.returns('My\\App\\Space\\MyClass');
            this.currentFunction.functionSpec.getFunctionName
                .withArgs(true)
                .returns('My\\App\\Space\\MyClass::myMethod');
            this.currentFunction.functionSpec.getFunctionName
                .withArgs(false)
                .returns('My\\App\\Space\\MyClass->myMethod');
            this.createScope();

            // NB: Note that the operator here is different: "->" vs. "::" above
            expect(this.scope.getMethodName(false).getNative()).to.equal('My\\App\\Space\\MyClass->myMethod');
        });

        it('should return the namespace and name when function is normal', function () {
            this.whenCurrentFunction();
            this.currentFunction.functionSpec.getFunctionName.returns('My\\App\\Space\\myFunc');
            this.createScope();

            expect(this.scope.getMethodName().getNative()).to.equal('My\\App\\Space\\myFunc');
        });

        it('should return the empty string when there is no current function', function () {
            this.createScope();

            expect(this.scope.getMethodName().getNative()).to.equal('');
        });
    });

    describe('getParentClassNameOrThrow()', function () {
        it('should return the name of the parent class when present', function () {
            this.whenCurrentClass();
            this.whenParentClass();
            this.currentClass.getName.returns('My\\Scope\\MyClass');
            this.parentClass.getName.returns('Your\\Scope\\YourParentClass');
            this.createScope();

            expect(this.scope.getParentClassNameOrThrow().getNative()).to.equal('Your\\Scope\\YourParentClass');
        });

        it('should throw when there is a current class but it has no parent', function () {
            this.whenCurrentClass();
            this.currentClass.getName.returns('My\\Scope\\MyClass');
            this.createScope();

            expect(function () {
                this.scope.getParentClassNameOrThrow();
            }.bind(this)).to.throw('PHP Fatal error: [core.no_parent_class] {}');
        });

        it('should throw when there is no current class', function () {
            this.createScope();

            expect(function () {
                this.scope.getParentClassNameOrThrow();
            }.bind(this)).to.throw('PHP Fatal error: [core.cannot_access_when_no_active_class] {"className":"parent"}');
        });
    });

    describe('getStaticClassNameOrThrow()', function () {
        it('should return the name of the current static class when present', function () {
            var staticClass = sinon.createStubInstance(Class);
            this.callStack.getStaticClass.returns(staticClass);
            staticClass.getName.returns('My\\Scope\\MyClass');
            this.createScope();

            expect(this.scope.getStaticClassNameOrThrow().getNative()).to.equal('My\\Scope\\MyClass');
        });

        it('should throw when there is no current static class', function () {
            this.callStack.getStaticClass.returns(null);
            this.createScope();

            expect(function () {
                this.scope.getStaticClassNameOrThrow();
            }.bind(this)).to.throw('PHP Fatal error: [core.cannot_access_when_no_active_class] {"className":"static"}');
        });
    });

    describe('getTraceFrameName()', function () {
        it('should return the correct name when function is a class method called statically', function () {
            this.whenCurrentClass();
            this.whenCurrentFunction();
            this.currentFunction.functionSpec.getFunctionTraceFrameName
                .withArgs(true)
                .returns('My\\Stuff\\MyClass::myMethod');
            this.currentFunction.functionSpec.getFunctionTraceFrameName
                .withArgs(false)
                .returns('My\\Stuff\\MyClass->myMethod');
            this.createScope();

            expect(this.scope.getTraceFrameName()).to.equal('My\\Stuff\\MyClass::myMethod');
        });

        it('should return the correct name when function is a class method called non-statically', function () {
            this.whenCurrentClass();
            this.whenCurrentFunction();
            this.currentFunction.functionSpec.getFunctionTraceFrameName
                .withArgs(true)
                .returns('My\\Stuff\\MyClass::myMethod');
            this.currentFunction.functionSpec.getFunctionTraceFrameName
                .withArgs(false)
                .returns('My\\Stuff\\MyClass->myMethod');
            this.createScope(sinon.createStubInstance(ObjectValue));

            // NB: Note that the operator here is different: "->" vs. "::" above
            expect(this.scope.getTraceFrameName()).to.equal('My\\Stuff\\MyClass->myMethod');
        });

        it('should return only the name when function is normal', function () {
            this.whenCurrentFunction();
            this.currentFunction.functionSpec.getFunctionTraceFrameName.returns('myFunc');
            this.createScope();

            expect(this.scope.getTraceFrameName()).to.equal('myFunc');
        });

        it('should return the empty string when there is no current function', function () {
            this.createScope();

            expect(this.scope.getTraceFrameName()).to.equal('');
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

        it('should silently allow a global to be unnecessarily imported into the global scope', function () {
            this.referenceFactory.createVariable.callsFake(function (variable) {
                return new VariableReference(variable);
            });
            this.createScope(null, null);
            this.scope.defineVariable('myVar').setValue(this.valueFactory.createString('my result'));

            this.scope.importGlobal('myVar');

            expect(this.scope.getVariable('myVar').getValue().getNative()).to.equal('my result');
        });
    });

    describe('importStatic()', function () {
        beforeEach(function () {
            this.whenCurrentFunction();
        });

        it('should define variable in current scope as reference to new static variable on first call', function () {
            var staticVariable = new Variable(this.callStack, this.valueFactory, 'myVar'),
                reference = sinon.createStubInstance(VariableReference),
                value = sinon.createStubInstance(StringValue);
            this.variableFactory.createVariable.withArgs('myVar').returns(staticVariable);
            this.referenceFactory.createVariable.withArgs(sinon.match.same(staticVariable)).returns(reference);
            reference.getValue.returns(value);
            this.createScope();

            this.scope.importStatic('myVar');

            expect(this.scope.getVariable('myVar').getValue()).to.equal(value);
        });

        it('should define variable in current scope as reference to same static variable on second call', function () {
            var existingStaticVariable = new Variable(this.callStack, this.valueFactory, 'myVar'),
                reference = sinon.createStubInstance(VariableReference),
                value = sinon.createStubInstance(StringValue);
            this.referenceFactory.createVariable.withArgs(sinon.match.same(existingStaticVariable)).returns(reference);
            reference.getValue.returns(value);
            this.currentFunction.staticVariables = {myVar: existingStaticVariable};
            this.createScope();

            this.scope.importStatic('myVar');

            expect(this.scope.getVariable('myVar').getValue()).to.equal(value);
        });
    });

    describe('isStatic()', function () {
        it('should return true when the scope is a static context', function () {
            this.createScope();

            expect(this.scope.isStatic()).to.be.true;
        });

        it('should return false when the scope is a non-static context', function () {
            this.createScope(sinon.createStubInstance(ObjectValue));

            expect(this.scope.isStatic()).to.be.false;
        });
    });
});
