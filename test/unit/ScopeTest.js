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
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    Closure = require('../../src/Closure').sync(),
    ClosureFactory = require('../../src/ClosureFactory').sync(),
    FunctionSpec = require('../../src/Function/FunctionSpec'),
    FunctionSpecFactory = require('../../src/Function/FunctionSpecFactory'),
    Namespace = require('../../src/Namespace').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    Reference = require('../../src/Reference/Reference'),
    ReferenceFactory = require('../../src/ReferenceFactory').sync(),
    Scope = require('../../src/Scope').sync(),
    StringValue = require('../../src/Value/String').sync(),
    SuperGlobalScope = require('../../src/SuperGlobalScope').sync(),
    Translator = phpCommon.Translator,
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync(),
    Variable = require('../../src/Variable').sync(),
    VariableFactory = require('../../src/VariableFactory').sync();

describe('Scope', function () {
    var callStack,
        closure,
        closureFactory,
        createScope,
        currentClass,
        currentFunction,
        functionSpecFactory,
        globalNamespace,
        globalScope,
        parentClass,
        referenceFactory,
        scope,
        superGlobalScope,
        translator,
        valueFactory,
        variableFactory,
        whenCurrentClass,
        whenCurrentFunction,
        whenParentClass;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        closure = sinon.createStubInstance(Closure);
        currentClass = null;
        currentFunction = null;
        closureFactory = sinon.createStubInstance(ClosureFactory);
        functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);
        globalNamespace = sinon.createStubInstance(Namespace);
        globalScope = sinon.createStubInstance(Scope);
        parentClass = null;
        referenceFactory = sinon.createStubInstance(ReferenceFactory);
        superGlobalScope = sinon.createStubInstance(SuperGlobalScope);
        translator = sinon.createStubInstance(Translator);
        valueFactory = new ValueFactory();
        variableFactory = sinon.createStubInstance(VariableFactory);

        valueFactory.setGlobalNamespace(globalNamespace);

        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error('PHP ' + level + ': [' + translationKey + '] ' + JSON.stringify(placeholderVariables || {}));
        });

        closureFactory.create.returns(closure);

        variableFactory.createVariable.callsFake(function (variableName) {
            return new Variable(callStack, valueFactory, variableName);
        });

        whenCurrentClass = function () {
            currentClass = sinon.createStubInstance(Class);
            currentClass.getSuperClass.returns(null);
        };
        whenCurrentFunction = function () {
            currentFunction = sinon.stub();
            currentFunction.functionSpec = sinon.createStubInstance(FunctionSpec);
        };
        whenParentClass = function () {
            parentClass = sinon.createStubInstance(Class);
            currentClass.getSuperClass.returns(parentClass);
        };
        createScope = function (thisObject, givenGlobalScope) {
            scope = new Scope(
                callStack,
                translator,
                givenGlobalScope !== undefined ? givenGlobalScope : globalScope,
                superGlobalScope,
                closureFactory,
                functionSpecFactory,
                valueFactory,
                variableFactory,
                referenceFactory,
                currentClass,
                currentFunction,
                thisObject || null
            );
        };
    });

    describe('createClosure()', function () {
        var func,
            namespaceScope,
            thisObject;

        beforeEach(function () {
            func = sinon.stub();
            namespaceScope = sinon.createStubInstance(NamespaceScope);
            thisObject = sinon.createStubInstance(ObjectValue);

            namespaceScope.getFilePath.returns('/path/to/my_module.php');

            whenCurrentClass();
            whenCurrentFunction();
            createScope(thisObject);
        });

        it('should return the Closure from the ClosureFactory', function () {
            expect(scope.createClosure(namespaceScope, func)).to.equal(closure);
        });

        it('should create one Closure with the ClosureFactory', function () {
            scope.createClosure(namespaceScope, func);

            expect(closureFactory.create).to.have.been.calledOnce;
        });

        it('should pass the scope to the ClosureFactory', function () {
            scope.createClosure(namespaceScope, func);

            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.same(scope)
            );
        });

        it('should pass the unwrapped function to the ClosureFactory', function () {
            scope.createClosure(namespaceScope, func);

            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(func)
            );
        });

        it('should pass the NamespaceScope to the ClosureFactory', function () {
            scope.createClosure(namespaceScope, func);

            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(namespaceScope)
            );
        });

        it('should pass the class to the ClosureFactory', function () {
            scope.createClosure(namespaceScope, func);

            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(currentClass)
            );
        });

        it('should fetch and bind the closure to the `$this` object from the current scope', function () {
            scope.createClosure(namespaceScope, func);

            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(thisObject)
            );
        });

        it('should not bind the closure to an object when it is static', function () {
            scope.createClosure(namespaceScope, func, [], true);

            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null // No `$this` object is to be bound
            );
        });

        it('should pass a correctly constructed closure FunctionSpec to the ClosureFactory', function () {
            var closureFunctionSpec = sinon.createStubInstance(FunctionSpec);
            functionSpecFactory.createClosureSpec
                .withArgs(
                    sinon.match.same(namespaceScope),
                    sinon.match.same(currentClass),
                    [],
                    '/path/to/my_module.php',
                    1234
                )
                .returns(closureFunctionSpec);

            scope.createClosure(namespaceScope, func, [], false, 1234);

            expect(closureFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(closureFunctionSpec)
            );
        });
    });

    describe('defineVariable()', function () {
        it('should define a variable with the specified name in this scope', function () {
            createScope();

            scope.defineVariable('myVar');

            expect(scope.hasVariable('myVar')).to.be.true;
        });

        it('should return the defined variable', function () {
            var variable;
            createScope();

            variable = scope.defineVariable('myVar');

            expect(variable).to.be.an.instanceOf(Variable);
            expect(variable.getName()).to.equal('myVar');
        });

        it('should throw when a variable is already defined with the given name', function () {
            createScope();
            scope.defineVariable('myVar');

            expect(function () {
                scope.defineVariable('myVar');
            }).to.throw(
                'Variable "myVar" is already defined in this scope'
            );
        });
    });

    describe('exportVariables()', function () {
        it('should export all defined variables in addition to the super globals', function () {
            var superGlobalValue = sinon.createStubInstance(Value),
                variableValue = sinon.createStubInstance(Value),
                variables;
            createScope();
            superGlobalValue.getForAssignment.returns(superGlobalValue);
            variableValue.getForAssignment.returns(variableValue);
            scope.defineVariable('firstVariable').setValue(variableValue);
            scope.defineVariable('anUndefinedVariable');
            superGlobalScope.exportVariables.returns({
                '_STUFF': superGlobalValue
            });

            variables = scope.exportVariables();

            expect(variables._STUFF).to.equal(superGlobalValue);
            expect(variables.firstVariable).to.equal(variableValue);
            expect(variables).not.to.have.property('anUndefinedVariable');
        });
    });

    describe('expose()', function () {
        beforeEach(function () {
            createScope();
        });

        it('should define a variable in the current scope with a given wrapped value', function () {
            var value;
            scope.expose(valueFactory.createInteger(321), 'myVar');

            value = scope.getVariable('myVar').getValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(321);
        });

        it('should define a variable in the current scope with a given native value', function () {
            var value;
            scope.expose(4567, 'myVar');

            value = scope.getVariable('myVar').getValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(4567);
        });
    });

    describe('getClassName()', function () {
        it('should return the name of the current class when present', function () {
            whenCurrentClass();
            whenCurrentFunction();
            currentClass.getName.returns('MyClass');
            createScope();

            expect(scope.getClassName().getNative()).to.equal('MyClass');
        });

        it('should return the empty string when there is no current class', function () {
            createScope();

            expect(scope.getClassName().getNative()).to.equal('');
        });
    });

    describe('getClassNameOrThrow()', function () {
        it('should return the name of the current class when present', function () {
            whenCurrentClass();
            whenCurrentFunction();
            currentClass.getName.returns('My\\Scope\\MyClass');
            createScope();

            expect(scope.getClassNameOrThrow().getNative()).to.equal('My\\Scope\\MyClass');
        });

        it('should throw when there is no current class', function () {
            createScope();

            expect(function () {
                scope.getClassNameOrThrow();
            }).to.throw('PHP Fatal error: [core.cannot_access_when_no_active_class] {"className":"self"}');
        });
    });

    describe('getFilePath()', function () {
        it('should just pass the given path through unaltered', function () {
            createScope();

            expect(scope.getFilePath('/my/path.php')).to.equal('/my/path.php');
        });
    });

    describe('getFunctionName()', function () {
        it('should return only the name when function is a class method', function () {
            whenCurrentClass();
            whenCurrentFunction();
            currentFunction.functionSpec.getUnprefixedFunctionName.returns('myMethod');
            createScope();

            expect(scope.getFunctionName().getNative()).to.equal('myMethod');
        });

        it('should return only the name when function is normal', function () {
            whenCurrentFunction();
            currentFunction.functionSpec.getUnprefixedFunctionName.returns('myFunc');
            createScope();

            expect(scope.getFunctionName().getNative()).to.equal('myFunc');
        });

        it('should return the empty string when there is no current function', function () {
            createScope();

            expect(scope.getFunctionName().getNative()).to.equal('');
        });
    });

    describe('getMethodName()', function () {
        it('should return the namespace, class and name when function is a class method and call is static', function () {
            whenCurrentClass();
            whenCurrentFunction();
            currentClass.getName.returns('My\\App\\Space\\MyClass');
            currentFunction.functionSpec.getFunctionName
                .withArgs(true)
                .returns('My\\App\\Space\\MyClass::myMethod');
            currentFunction.functionSpec.getFunctionName
                .withArgs(false)
                .returns('My\\App\\Space\\MyClass->myMethod');
            createScope();

            expect(scope.getMethodName(true).getNative()).to.equal('My\\App\\Space\\MyClass::myMethod');
        });

        it('should return the namespace, class and name when function is a class method and call is non-static', function () {
            whenCurrentClass();
            whenCurrentFunction();
            currentClass.getName.returns('My\\App\\Space\\MyClass');
            currentFunction.functionSpec.getFunctionName
                .withArgs(true)
                .returns('My\\App\\Space\\MyClass::myMethod');
            currentFunction.functionSpec.getFunctionName
                .withArgs(false)
                .returns('My\\App\\Space\\MyClass->myMethod');
            createScope();

            // NB: Note that the operator here is different: "->" vs. "::" above
            expect(scope.getMethodName(false).getNative()).to.equal('My\\App\\Space\\MyClass->myMethod');
        });

        it('should return the namespace and name when function is normal', function () {
            whenCurrentFunction();
            currentFunction.functionSpec.getFunctionName.returns('My\\App\\Space\\myFunc');
            createScope();

            expect(scope.getMethodName().getNative()).to.equal('My\\App\\Space\\myFunc');
        });

        it('should return the empty string when there is no current function', function () {
            createScope();

            expect(scope.getMethodName().getNative()).to.equal('');
        });
    });

    describe('getParentClassNameOrThrow()', function () {
        it('should return the name of the parent class when present', function () {
            whenCurrentClass();
            whenParentClass();
            currentClass.getName.returns('My\\Scope\\MyClass');
            parentClass.getName.returns('Your\\Scope\\YourParentClass');
            createScope();

            expect(scope.getParentClassNameOrThrow().getNative()).to.equal('Your\\Scope\\YourParentClass');
        });

        it('should throw when there is a current class but it has no parent', function () {
            whenCurrentClass();
            currentClass.getName.returns('My\\Scope\\MyClass');
            createScope();

            expect(function () {
                scope.getParentClassNameOrThrow();
            }).to.throw('PHP Fatal error: [core.no_parent_class] {}');
        });

        it('should throw when there is no current class', function () {
            createScope();

            expect(function () {
                scope.getParentClassNameOrThrow();
            }).to.throw('PHP Fatal error: [core.cannot_access_when_no_active_class] {"className":"parent"}');
        });
    });

    describe('getStaticClassNameOrThrow()', function () {
        it('should return the name of the current static class when present', function () {
            var staticClass = sinon.createStubInstance(Class);
            callStack.getStaticClass.returns(staticClass);
            staticClass.getName.returns('My\\Scope\\MyClass');
            createScope();

            expect(scope.getStaticClassNameOrThrow().getNative()).to.equal('My\\Scope\\MyClass');
        });

        it('should throw when there is no current static class', function () {
            callStack.getStaticClass.returns(null);
            createScope();

            expect(function () {
                scope.getStaticClassNameOrThrow();
            }).to.throw('PHP Fatal error: [core.cannot_access_when_no_active_class] {"className":"static"}');
        });
    });

    describe('getTraceFrameName()', function () {
        it('should return the correct name when function is a class method called statically', function () {
            whenCurrentClass();
            whenCurrentFunction();
            currentFunction.functionSpec.getFunctionTraceFrameName
                .withArgs(true)
                .returns('My\\Stuff\\MyClass::myMethod');
            currentFunction.functionSpec.getFunctionTraceFrameName
                .withArgs(false)
                .returns('My\\Stuff\\MyClass->myMethod');
            createScope();

            expect(scope.getTraceFrameName()).to.equal('My\\Stuff\\MyClass::myMethod');
        });

        it('should return the correct name when function is a class method called non-statically', function () {
            whenCurrentClass();
            whenCurrentFunction();
            currentFunction.functionSpec.getFunctionTraceFrameName
                .withArgs(true)
                .returns('My\\Stuff\\MyClass::myMethod');
            currentFunction.functionSpec.getFunctionTraceFrameName
                .withArgs(false)
                .returns('My\\Stuff\\MyClass->myMethod');
            createScope(sinon.createStubInstance(ObjectValue));

            // NB: Note that the operator here is different: "->" vs. "::" above
            expect(scope.getTraceFrameName()).to.equal('My\\Stuff\\MyClass->myMethod');
        });

        it('should return only the name when function is normal', function () {
            whenCurrentFunction();
            currentFunction.functionSpec.getFunctionTraceFrameName.returns('myFunc');
            createScope();

            expect(scope.getTraceFrameName()).to.equal('myFunc');
        });

        it('should return the empty string when there is no current function', function () {
            createScope();

            expect(scope.getTraceFrameName()).to.equal('');
        });
    });

    describe('getVariable()', function () {
        it('should fetch the existing variable if already defined', function () {
            var variable,
                fetchedVariable;
            createScope();
            variable = scope.defineVariable('myVar');

            fetchedVariable = scope.getVariable('myVar');

            expect(fetchedVariable).to.be.an.instanceOf(Variable);
            expect(fetchedVariable).to.equal(variable);
        });

        it('should implicitly define the variable if not already defined', function () {
            var fetchedVariable;
            createScope();

            fetchedVariable = scope.getVariable('myUndefinedVar');

            expect(fetchedVariable).to.be.an.instanceOf(Variable);
            expect(fetchedVariable.getName()).to.equal('myUndefinedVar');
        });

        it('should fetch a super global if defined', function () {
            var superGlobal = sinon.createStubInstance(Variable);
            superGlobalScope.getVariable.withArgs('_ENV').returns(superGlobal);
            createScope();

            expect(scope.getVariable('_ENV')).to.equal(superGlobal);
        });
    });

    describe('hasVariable()', function () {
        it('should return true when the specified variable is defined', function () {
            createScope();
            scope.defineVariable('myVar', 21);

            expect(scope.hasVariable('myVar')).to.be.true;
        });

        it('should return true when the specified variable is defined and happens to be called "hasOwnProperty"', function () {
            createScope();
            scope.defineVariable('hasOwnProperty', 101);

            expect(scope.hasVariable('hasOwnProperty')).to.be.true;
        });

        it('should return false when the specified variable is not defined', function () {
            createScope();

            expect(scope.hasVariable('myUndefinedVar')).to.be.false;
        });
    });

    describe('importGlobal()', function () {
        beforeEach(function () {
            createScope();
        });

        it('should define variable in current scope as reference to variable in global scope', function () {
            var globalVariable = sinon.createStubInstance(Variable),
                reference = sinon.createStubInstance(Reference),
                value = sinon.createStubInstance(StringValue);
            globalVariable.getReference.returns(reference);
            globalScope.getVariable.withArgs('myVar').returns(globalVariable);
            reference.getValue.returns(value);

            scope.importGlobal('myVar');

            expect(scope.getVariable('myVar').getValue()).to.equal(value);
        });

        it('should silently allow a global to be unnecessarily imported into the global scope', function () {
            createScope(null, null);
            scope.defineVariable('myVar').setValue(valueFactory.createString('my result'));

            scope.importGlobal('myVar');

            expect(scope.getVariable('myVar').getValue().getNative()).to.equal('my result');
        });
    });

    describe('importStatic()', function () {
        beforeEach(function () {
            whenCurrentFunction();
        });

        it('should define variable in current scope as reference to new static variable on first call', function () {
            var staticVariable = new Variable(callStack, valueFactory, 'myVar'),
                value = valueFactory.createString('my string');
            variableFactory.createVariable.withArgs('myVar').returns(staticVariable);
            staticVariable.setValue(value);
            createScope();

            scope.importStatic('myVar');

            expect(scope.getVariable('myVar').getValue()).to.equal(value);
        });

        it('should define variable in current scope as reference to same static variable on second call', function () {
            var existingStaticVariable = new Variable(callStack, valueFactory, 'myVar'),
                value = valueFactory.createString('my string');
            existingStaticVariable.setValue(value);
            currentFunction.staticVariables = {myVar: existingStaticVariable};
            createScope();

            scope.importStatic('myVar');

            expect(scope.getVariable('myVar').getValue()).to.equal(value);
        });
    });

    describe('isStatic()', function () {
        it('should return true when the scope is a static context', function () {
            createScope();

            expect(scope.isStatic()).to.be.true;
        });

        it('should return false when the scope is a non-static context', function () {
            createScope(sinon.createStubInstance(ObjectValue));

            expect(scope.isStatic()).to.be.false;
        });
    });

    describe('raiseScopedTranslatedError()', function () {
        beforeEach(function () {
            translator.translate
                .withArgs('core.scoped_error')
                .callsFake(function (translationKey, placeholderVariables) {
                    return placeholderVariables.function + '(): ' + placeholderVariables.message;
                });
            whenCurrentFunction();
            currentFunction.functionSpec.getUnprefixedFunctionName.returns('myCurrentFunction');
        });

        it('should throw an ObjectValue wrapping an instance of Error when the E_ERROR level is given', function () {
            var caughtError = null,
                errorClassObject = sinon.createStubInstance(Class),
                errorValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass
                .withArgs('MySubError')
                .returns(errorClassObject);
            translator.translate
                .withArgs('my_translation_key', {
                    my_placeholder: 'My value'
                })
                .returns('My translated message');
            errorClassObject.instantiate
                .withArgs([
                    sinon.match(function (arg) {
                        return arg.getNative() === 'myCurrentFunction(): My translated message';
                    }),
                    sinon.match(function (arg) {
                        return arg.getNative() === 0;
                    }),
                    sinon.match(function (arg) {
                        return arg.getNative() === null;
                    })
                ])
                .returns(errorValue);
            createScope();

            try {
                scope.raiseScopedTranslatedError(
                    PHPError.E_ERROR,
                    'my_translation_key',
                    {
                        my_placeholder: 'My value'
                    },
                    'MySubError',
                    false,
                    '/my/custom/file_path.php',
                    4321
                );
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).to.equal(errorValue);
            expect(errorValue.setProperty).to.have.been.calledTwice;
            expect(errorValue.setProperty).to.have.been.calledWith('file', sinon.match(function (arg) {
                return arg.getNative() === '/my/custom/file_path.php';
            }));
            expect(errorValue.setProperty).to.have.been.calledWith('line', sinon.match(function (arg) {
                return arg.getNative() === 4321;
            }));
        });

        it('should raise an error via CallStack when the E_WARNING level is given', function () {
            translator.translate
                .withArgs('my_translation_key', {
                    my_placeholder: 'My value'
                })
                .returns('My translated message');
            createScope();

            scope.raiseScopedTranslatedError(
                PHPError.E_WARNING,
                'my_translation_key',
                {
                    my_placeholder: 'My value'
                },
                'MySubError',
                false,
                '/path/to/my_module.php',
                1234
            );

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'myCurrentFunction(): My translated message',
                'MySubError',
                false
            );
        });
    });
});
