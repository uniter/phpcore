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
    ClosureFactory = require('../../src/ClosureFactory').sync(),
    FunctionSpecFactory = require('../../src/Function/FunctionSpecFactory'),
    Module = require('../../src/Module'),
    Namespace = require('../../src/Namespace').sync(),
    ReferenceFactory = require('../../src/ReferenceFactory').sync(),
    ScopeFactory = require('../../src/ScopeFactory'),
    SuperGlobalScope = require('../../src/SuperGlobalScope').sync(),
    Translator = phpCommon.Translator,
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync(),
    VariableFactory = require('../../src/VariableFactory').sync();

describe('ScopeFactory', function () {
    var callStack,
        closureFactory,
        factory,
        functionSpecFactory,
        globalScope,
        LoadScope,
        NamespaceScope,
        referenceFactory,
        Scope,
        superGlobalScope,
        translator,
        valueFactory,
        variableFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        closureFactory = sinon.createStubInstance(ClosureFactory);
        functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);
        LoadScope = sinon.stub();
        NamespaceScope = sinon.stub();
        Scope = sinon.stub();
        globalScope = sinon.createStubInstance(Scope);
        referenceFactory = sinon.createStubInstance(ReferenceFactory);
        superGlobalScope = sinon.createStubInstance(SuperGlobalScope);
        translator = sinon.createStubInstance(Translator);
        valueFactory = sinon.createStubInstance(ValueFactory);
        variableFactory = sinon.createStubInstance(VariableFactory);

        factory = new ScopeFactory(
            LoadScope,
            Scope,
            NamespaceScope,
            callStack,
            translator,
            superGlobalScope,
            functionSpecFactory,
            valueFactory,
            variableFactory,
            referenceFactory
        );
        factory.setClosureFactory(closureFactory);
        factory.setGlobalScope(globalScope);
    });

    describe('create()', function () {
        var callCreate,
            currentClass,
            currentFunction,
            name,
            thisObject;

        beforeEach(function () {
            name = 'MyNamespace';
            currentClass = sinon.createStubInstance(Class);
            currentFunction = sinon.stub();
            thisObject = sinon.createStubInstance(Value);
            callCreate = function () {
                return factory.create(
                    currentClass,
                    currentFunction,
                    thisObject
                );
            };
        });

        it('should return an instance of Scope', function () {
            expect(callCreate()).to.be.an.instanceOf(Scope);
        });

        it('should create one scope', function () {
            callCreate();

            expect(Scope).to.have.been.calledOnce;
        });

        it('should pass the CallStack to the scope', function () {
            callCreate();

            expect(Scope).to.have.been.calledWith(sinon.match.same(callStack));
        });

        it('should pass the Translator to the scope', function () {
            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(translator)
            );
        });

        it('should pass the global scope to the scope', function () {
            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(globalScope)
            );
        });

        it('should pass the SuperGlobalScope to the scope', function () {
            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(superGlobalScope)
            );
        });

        it('should pass the ClosureFactory to the scope', function () {
            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(closureFactory)
            );
        });

        it('should pass the FunctionSpecFactory to the scope', function () {
            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(functionSpecFactory)
            );
        });

        it('should pass the ValueFactory to the scope', function () {
            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(valueFactory)
            );
        });

        it('should pass the VariableFactory to the scope', function () {
            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(variableFactory)
            );
        });

        it('should pass the ReferenceFactory to the scope', function () {
            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(referenceFactory)
            );
        });

        it('should pass the current class to the scope when specified', function () {
            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(currentClass)
            );
        });

        it('should pass null as the current class to the scope when not specified', function () {
            currentClass = null;

            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });

        it('should pass the current function to the scope when specified', function () {
            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(currentFunction)
            );
        });

        it('should pass null as the current function to the scope when not specified', function () {
            currentFunction = false;

            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });

        it('should pass the thisObject to the scope when specified', function () {
            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(thisObject)
            );
        });

        it('should pass null as the thisObject to the scope when not specified', function () {
            thisObject = false;

            callCreate();

            expect(Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });
    });

    describe('createLoadScope()', function () {
        var callCreateLoadScope,
            effectiveScope;

        beforeEach(function () {
            effectiveScope = sinon.createStubInstance(Scope);

            callCreateLoadScope = function () {
                return factory.createLoadScope(effectiveScope, '/path/to/my/caller.php', 'eval');
            };
        });

        it('should return an instance of LoadScope', function () {
            expect(callCreateLoadScope()).to.be.an.instanceOf(LoadScope);
        });

        it('should pass the ValueFactory to the scope', function () {
            callCreateLoadScope();

            expect(LoadScope).to.have.been.calledOnce;
            expect(LoadScope).to.have.been.calledWith(
                sinon.match.same(valueFactory)
            );
        });

        it('should pass the effective scope to the scope', function () {
            callCreateLoadScope();

            expect(LoadScope).to.have.been.calledOnce;
            expect(LoadScope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(effectiveScope)
            );
        });

        it('should pass the caller file path to the scope', function () {
            callCreateLoadScope();

            expect(LoadScope).to.have.been.calledOnce;
            expect(LoadScope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                '/path/to/my/caller.php'
            );
        });

        it('should pass the type to the scope', function () {
            callCreateLoadScope();

            expect(LoadScope).to.have.been.calledOnce;
            expect(LoadScope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                'eval'
            );
        });
    });

    describe('createNamespaceScope()', function () {
        var callCreateNamespaceScope,
            globalNamespace,
            module,
            namespace;

        beforeEach(function () {
            globalNamespace = sinon.createStubInstance(Namespace);
            module = sinon.createStubInstance(Module);
            namespace = sinon.createStubInstance(Namespace);

            callCreateNamespaceScope = function () {
                return factory.createNamespaceScope(namespace, globalNamespace, module);
            };
        });

        it('should return an instance of NamespaceScope', function () {
            expect(callCreateNamespaceScope()).to.be.an.instanceOf(NamespaceScope);
        });

        it('should pass the global namespace to the scope', function () {
            callCreateNamespaceScope();

            expect(NamespaceScope).to.have.been.calledOnce;
            expect(NamespaceScope).to.have.been.calledWith(
                sinon.match.same(globalNamespace)
            );
        });

        it('should pass the ValueFactory to the scope', function () {
            callCreateNamespaceScope();

            expect(NamespaceScope).to.have.been.calledOnce;
            expect(NamespaceScope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(valueFactory)
            );
        });

        it('should pass the CallStack to the scope', function () {
            callCreateNamespaceScope();

            expect(NamespaceScope).to.have.been.calledOnce;
            expect(NamespaceScope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(callStack)
            );
        });

        it('should pass the module to the scope', function () {
            callCreateNamespaceScope();

            expect(NamespaceScope).to.have.been.calledOnce;
            expect(NamespaceScope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(module)
            );
        });

        it('should pass the namespace to the scope', function () {
            callCreateNamespaceScope();

            expect(NamespaceScope).to.have.been.calledOnce;
            expect(NamespaceScope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(namespace)
            );
        });
    });
});
