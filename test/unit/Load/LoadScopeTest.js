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
    tools = require('../tools'),
    Class = require('../../../src/Class').sync(),
    Closure = require('../../../src/Closure').sync(),
    Coroutine = require('../../../src/Control/Coroutine'),
    LoadScope = require('../../../src/Load/LoadScope'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    PHPError = phpCommon.PHPError,
    PHPFatalError = phpCommon.PHPFatalError,
    Scope = require('../../../src/Scope').sync(),
    Trait = require('../../../src/OOP/Trait/Trait'),
    Value = require('../../../src/Value').sync(),
    Variable = require('../../../src/Variable').sync();

describe('LoadScope', function () {
    var coroutine,
        effectiveScope,
        loadScope,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        coroutine = sinon.createStubInstance(Coroutine);
        valueFactory = state.getValueFactory();
        effectiveScope = sinon.createStubInstance(Scope);

        effectiveScope.getCoroutine.returns(coroutine);

        loadScope = new LoadScope(valueFactory, effectiveScope, '/path/to/my/caller.php', 'eval');
    });

    describe('createClosure()', function () {
        it('should forward the call to the effective scope', function () {
            var namespaceScope = sinon.createStubInstance(NamespaceScope),
                func = sinon.stub(),
                parametersSpecData = ['my_param'],
                bindingsSpecData = ['my_binding'],
                referenceBindings = {my_ref: 'ref_value'},
                valueBindings = {my_val: 'val_value'},
                isStatic = true,
                returnTypeSpec = {type: 'string'},
                returnByReference = true,
                lineNumber = 21,
                closure = sinon.createStubInstance(Closure);
            effectiveScope.createClosure.returns(closure);

            expect(loadScope.createClosure(
                namespaceScope,
                func,
                parametersSpecData,
                bindingsSpecData,
                referenceBindings,
                valueBindings,
                isStatic,
                returnTypeSpec,
                returnByReference,
                lineNumber
            )).to.equal(closure);
            expect(effectiveScope.createClosure).to.have.been.calledOnce;
            expect(effectiveScope.createClosure).to.have.been.calledWith(
                sinon.match.same(namespaceScope),
                sinon.match.same(func),
                sinon.match.same(parametersSpecData),
                sinon.match.same(bindingsSpecData),
                sinon.match.same(referenceBindings),
                sinon.match.same(valueBindings),
                sinon.match.same(isStatic),
                sinon.match.same(returnTypeSpec),
                sinon.match.same(returnByReference),
                sinon.match.same(lineNumber)
            );
        });
    });

    describe('defineVariable()', function () {
        it('should forward the call to the effective scope', function () {
            var variable = sinon.createStubInstance(Variable);
            effectiveScope.defineVariable.returns(variable);

            expect(loadScope.defineVariable('my_var')).to.equal(variable);
            expect(effectiveScope.defineVariable).to.have.been.calledOnce;
            expect(effectiveScope.defineVariable).to.have.been.calledWith('my_var');
        });
    });

    describe('defineVariables()', function () {
        it('should forward the call to the effective scope', function () {
            loadScope.defineVariables(['my_var1', 'my_var2']);

            expect(effectiveScope.defineVariables).to.have.been.calledOnce;
            expect(effectiveScope.defineVariables).to.have.been.calledWith(['my_var1', 'my_var2']);
        });
    });

    describe('enterCoroutine()', function () {
        it('should enter a new Coroutine via the effective scope', function () {
            loadScope.enterCoroutine();

            expect(effectiveScope.enterCoroutine).to.have.been.calledOnce;
        });
    });

    describe('exportVariables()', function () {
        it('should forward the call to the effective scope', function () {
            var variables = {my_var: 'my_value'};
            effectiveScope.exportVariables.returns(variables);

            expect(loadScope.exportVariables()).to.equal(variables);
            expect(effectiveScope.exportVariables).to.have.been.calledOnce;
        });
    });

    describe('expose()', function () {
        it('should forward the call to the effective scope', function () {
            var value = sinon.createStubInstance(Value);

            loadScope.expose(value, 'my_var');

            expect(effectiveScope.expose).to.have.been.calledOnce;
            expect(effectiveScope.expose).to.have.been.calledWith(
                sinon.match.same(value),
                'my_var'
            );
        });
    });

    describe('getCoroutine()', function () {
        it('should fetch the current Coroutine from the effective scope', function () {
            expect(loadScope.getCoroutine()).to.equal(coroutine);
        });
    });

    describe('getCurrentClass()', function () {
        it('should fetch the current class from the effective scope', function () {
            var currentClass = sinon.createStubInstance(Class);
            effectiveScope.getCurrentClass.returns(currentClass);

            expect(loadScope.getCurrentClass()).to.equal(currentClass);
        });
    });

    describe('getCurrentTrait()', function () {
        it('should fetch the current trait from the effective scope', function () {
            var currentTrait = sinon.createStubInstance(Trait);
            effectiveScope.getCurrentTrait.returns(currentTrait);

            expect(loadScope.getCurrentTrait()).to.equal(currentTrait);
        });
    });

    describe('getFilePath()', function () {
        it('should return the caller\'s path when the given file path is null', function () {
            expect(loadScope.getFilePath(null)).to.equal('/path/to/my/caller.php');
        });

        it('should return the given file path when not null', function () {
            expect(loadScope.getFilePath('/my/given/caller_path.php')).to.equal('/my/given/caller_path.php');
        });
    });

    describe('getFunctionName()', function () {
        it('should return an empty string, as eval/include contexts do not report the calling function, if any', function () {
            expect(loadScope.getFunctionName().getNative()).to.equal('');
        });
    });

    describe('getMethodName()', function () {
        it('should return an empty string, as eval/include contexts do not report the calling method, if any', function () {
            expect(loadScope.getMethodName().getNative()).to.equal('');
        });
    });

    describe('getParentClassNameOrThrow()', function () {
        it('should forward the call to the effective scope', function () {
            var className = sinon.createStubInstance(Value);
            effectiveScope.getParentClassNameOrThrow.returns(className);

            expect(loadScope.getParentClassNameOrThrow()).to.equal(className);
            expect(effectiveScope.getParentClassNameOrThrow).to.have.been.calledOnce;
        });

        it('should throw when the effective scope throws', function () {
            var error = new PHPFatalError('No parent class');
            effectiveScope.getParentClassNameOrThrow.throws(error);

            expect(function () {
                loadScope.getParentClassNameOrThrow();
            }).to.throw(PHPFatalError, 'No parent class');
        });
    });

    describe('getStaticClassNameOrThrow()', function () {
        it('should forward the call to the effective scope', function () {
            var className = sinon.createStubInstance(Value);
            effectiveScope.getStaticClassNameOrThrow.returns(className);

            expect(loadScope.getStaticClassNameOrThrow()).to.equal(className);
            expect(effectiveScope.getStaticClassNameOrThrow).to.have.been.calledOnce;
        });

        it('should throw when the effective scope throws', function () {
            var error = new PHPFatalError('No static class');
            effectiveScope.getStaticClassNameOrThrow.throws(error);

            expect(function () {
                loadScope.getStaticClassNameOrThrow();
            }).to.throw(PHPFatalError, 'No static class');
        });
    });

    describe('getThisObject()', function () {
        it('should forward the call to the effective scope', function () {
            var thisObject = sinon.createStubInstance(Value);
            effectiveScope.getThisObject.returns(thisObject);

            expect(loadScope.getThisObject()).to.equal(thisObject);
            expect(effectiveScope.getThisObject).to.have.been.calledOnce;
        });
    });

    describe('getTraceFrameName()', function () {
        it('should return the type when "eval"', function () {
            expect(loadScope.getTraceFrameName()).to.equal('eval');
        });

        it('should return the type when "include"', function () {
            var loadScope = new LoadScope(valueFactory, effectiveScope, '/path/to/my/caller.php', 'include');

            expect(loadScope.getTraceFrameName()).to.equal('include');
        });
    });

    describe('getVariable()', function () {
        it('should forward the call to the effective scope', function () {
            var variable = sinon.createStubInstance(Variable);
            effectiveScope.getVariable.returns(variable);

            expect(loadScope.getVariable('my_var')).to.equal(variable);
            expect(effectiveScope.getVariable).to.have.been.calledOnce;
            expect(effectiveScope.getVariable).to.have.been.calledWith('my_var');
        });
    });

    describe('importGlobal()', function () {
        it('should forward the call to the effective scope', function () {
            loadScope.importGlobal('my_var');

            expect(effectiveScope.importGlobal).to.have.been.calledOnce;
            expect(effectiveScope.importGlobal).to.have.been.calledWith('my_var');
        });
    });

    describe('importStatic()', function () {
        it('should forward the call to the effective scope', function () {
            var initialValue = sinon.createStubInstance(Value);

            loadScope.importStatic('my_var', initialValue);

            expect(effectiveScope.importStatic).to.have.been.calledOnce;
            expect(effectiveScope.importStatic).to.have.been.calledWith(
                'my_var',
                sinon.match.same(initialValue)
            );
        });
    });

    describe('raiseScopedTranslatedError()', function () {
        it('should forward the call onto the effective scope', function () {
            loadScope.raiseScopedTranslatedError(
                PHPError.E_WARNING,
                'my_group.my_warning',
                {
                    firstPlaceholder: 'first',
                    secondPlaceholder: 'second'
                },
                'MyError',
                true,
                '/path/to/my_module.php',
                123
            );

            expect(effectiveScope.raiseScopedTranslatedError).to.have.been.calledOnce;
            expect(effectiveScope.raiseScopedTranslatedError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'my_group.my_warning',
                {
                    firstPlaceholder: 'first',
                    secondPlaceholder: 'second'
                },
                'MyError',
                true,
                '/path/to/my_module.php',
                123
            );
        });
    });

    describe('updateCoroutine()', function () {
        it('should update the effective scope with the new Coroutine', function () {
            var newCoroutine = sinon.createStubInstance(Coroutine);

            loadScope.updateCoroutine(newCoroutine);

            expect(effectiveScope.updateCoroutine).to.have.been.calledOnce;
            expect(effectiveScope.updateCoroutine).to.have.been.calledWith(
                sinon.match.same(newCoroutine)
            );
        });
    });
});
