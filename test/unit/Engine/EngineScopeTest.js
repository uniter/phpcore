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
    tools = require('../tools'),
    Closure = require('../../../src/Closure').sync(),
    ControlScope = require('../../../src/Control/ControlScope'),
    Coroutine = require('../../../src/Control/Coroutine'),
    EngineScope = require('../../../src/Engine/EngineScope'),
    Scope = require('../../../src/Scope').sync(),
    Variable = require('../../../src/Variable').sync();

describe('EngineScope', function () {
    var controlScope,
        coroutine,
        effectiveScope,
        scope,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        valueFactory = state.getValueFactory();
        controlScope = sinon.createStubInstance(ControlScope);
        coroutine = sinon.createStubInstance(Coroutine);
        effectiveScope = sinon.createStubInstance(Scope);

        scope = new EngineScope(effectiveScope, controlScope, coroutine);
    });

    describe('createClosure()', function () {
        it('should delegate to the effective scope', function () {
            const namespaceScope = sinon.createStubInstance(Scope),
                func = sinon.stub(),
                parametersSpecData = ['param1', 'param2'],
                bindingsSpecData = ['binding1', 'binding2'],
                referenceBindings = {ref1: 'value1'},
                valueBindings = {val1: 'value1'},
                isStatic = true,
                returnTypeSpec = {type: 'string'},
                returnByReference = true,
                lineNumber = 123,
                expectedClosure = sinon.createStubInstance(Closure);
            effectiveScope.createClosure.returns(expectedClosure);

            const result = scope.createClosure(
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
            );

            expect(effectiveScope.createClosure).to.have.been.calledOnce;
            expect(effectiveScope.createClosure).to.have.been.calledWith(
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
            );
            expect(result).to.equal(expectedClosure);
        });
    });

    describe('defineVariable()', function () {
        it('should delegate to the effective scope', function () {
            const name = 'myVar',
                expectedVariable = sinon.createStubInstance(Variable);
            effectiveScope.defineVariable.returns(expectedVariable);

            const result = scope.defineVariable(name);

            expect(effectiveScope.defineVariable).to.have.been.calledOnce;
            expect(effectiveScope.defineVariable).to.have.been.calledWith(name);
            expect(result).to.equal(expectedVariable);
        });
    });

    describe('defineVariables()', function () {
        it('should delegate to the effective scope', function () {
            const names = ['var1', 'var2'];

            scope.defineVariables(names);

            expect(effectiveScope.defineVariables).to.have.been.calledOnce;
            expect(effectiveScope.defineVariables).to.have.been.calledWith(names);
        });
    });

    describe('enterCoroutine()', function () {
        it('should resume the current Coroutine for the Scope when it has one', function () {
            scope.enterCoroutine();

            expect(controlScope.resumeCoroutine).to.have.been.calledOnce;
            expect(controlScope.resumeCoroutine).to.have.been.calledWith(
                sinon.match.same(coroutine)
            );
        });

        describe('when the Scope has no current Coroutine', function () {
            var newCoroutine;

            beforeEach(function () {
                newCoroutine = sinon.createStubInstance(Coroutine);

                controlScope.enterCoroutine.returns(newCoroutine);

                scope = new EngineScope(effectiveScope, controlScope, null);
            });

            it('should enter a new current Coroutine for the Scope', function () {
                scope.enterCoroutine();

                expect(controlScope.enterCoroutine).to.have.been.calledOnce;
            });

            it('should update the Scope with the new Coroutine', function () {
                scope.enterCoroutine();

                expect(scope.getCoroutine()).to.equal(newCoroutine);
            });
        });
    });

    describe('exportVariables()', function () {
        it('should delegate to the effective scope', function () {
            const expectedVariables = {
                var1: valueFactory.createString('value1'),
                var2: valueFactory.createString('value2')
            };
            effectiveScope.exportVariables.returns(expectedVariables);

            const result = scope.exportVariables();

            expect(effectiveScope.exportVariables).to.have.been.calledOnce;
            expect(result).to.equal(expectedVariables);
        });
    });

    describe('expose()', function () {
        it('should delegate to the effective scope', function () {
            const value = valueFactory.createString('my value'),
                name = 'myVar';

            scope.expose(value, name);

            expect(effectiveScope.expose).to.have.been.calledOnce;
            expect(effectiveScope.expose).to.have.been.calledWith(value, name);
        });
    });

    describe('getCoroutine()', function () {
        it('should return the current Coroutine for the Scope', function () {
            expect(scope.getCoroutine()).to.equal(coroutine);
        });
    });

    describe('getCurrentClass()', function () {
        it('should delegate to the effective scope', function () {
            const expectedClass = {type: 'class'};
            effectiveScope.getCurrentClass.returns(expectedClass);

            const result = scope.getCurrentClass();

            expect(effectiveScope.getCurrentClass).to.have.been.calledOnce;
            expect(result).to.equal(expectedClass);
        });
    });

    describe('getCurrentTrait()', function () {
        it('should return null', function () {
            expect(scope.getCurrentTrait()).to.be.null;
        });
    });

    describe('getFilePath()', function () {
        it('should delegate to the effective scope', function () {
            const filePath = '/path/to/file.php',
                expectedPath = '/resolved/path/to/file.php';
            effectiveScope.getFilePath.returns(expectedPath);

            const result = scope.getFilePath(filePath);

            expect(effectiveScope.getFilePath).to.have.been.calledOnce;
            expect(effectiveScope.getFilePath).to.have.been.calledWith(filePath);
            expect(result).to.equal(expectedPath);
        });
    });

    describe('getFunctionName()', function () {
        it('should delegate to the effective scope', function () {
            const expectedName = valueFactory.createString('myFunction');
            effectiveScope.getFunctionName.returns(expectedName);

            const result = scope.getFunctionName();

            expect(effectiveScope.getFunctionName).to.have.been.calledOnce;
            expect(result).to.equal(expectedName);
        });
    });

    describe('getMethodName()', function () {
        it('should delegate to the effective scope', function () {
            const isStaticCall = true,
                expectedName = valueFactory.createString('myMethod');
            effectiveScope.getMethodName.returns(expectedName);

            const result = scope.getMethodName(isStaticCall);

            expect(effectiveScope.getMethodName).to.have.been.calledOnce;
            expect(effectiveScope.getMethodName).to.have.been.calledWith(isStaticCall);
            expect(result).to.equal(expectedName);
        });
    });

    describe('getParentClassNameOrThrow()', function () {
        it('should delegate to the effective scope', function () {
            const expectedName = valueFactory.createString('ParentClass');
            effectiveScope.getParentClassNameOrThrow.returns(expectedName);

            const result = scope.getParentClassNameOrThrow();

            expect(effectiveScope.getParentClassNameOrThrow).to.have.been.calledOnce;
            expect(result).to.equal(expectedName);
        });
    });

    describe('getStaticClassNameOrThrow()', function () {
        it('should delegate to the effective scope', function () {
            const expectedName = valueFactory.createString('StaticClass');
            effectiveScope.getStaticClassNameOrThrow.returns(expectedName);

            const result = scope.getStaticClassNameOrThrow();

            expect(effectiveScope.getStaticClassNameOrThrow).to.have.been.calledOnce;
            expect(result).to.equal(expectedName);
        });
    });

    describe('getThisObject()', function () {
        it('should delegate to the effective scope', function () {
            const expectedObject = {type: 'object'};
            effectiveScope.getThisObject.returns(expectedObject);

            const result = scope.getThisObject();

            expect(effectiveScope.getThisObject).to.have.been.calledOnce;
            expect(result).to.equal(expectedObject);
        });
    });

    describe('getTraceFrameName()', function () {
        it('should delegate to the effective scope', function () {
            const expectedName = 'MyClass::myMethod';
            effectiveScope.getTraceFrameName.returns(expectedName);

            const result = scope.getTraceFrameName();

            expect(effectiveScope.getTraceFrameName).to.have.been.calledOnce;
            expect(result).to.equal(expectedName);
        });
    });

    describe('getVariable()', function () {
        it('should delegate to the effective scope', function () {
            const name = 'myVar',
                expectedVariable = sinon.createStubInstance(Variable);
            effectiveScope.getVariable.returns(expectedVariable);

            const result = scope.getVariable(name);

            expect(effectiveScope.getVariable).to.have.been.calledOnce;
            expect(effectiveScope.getVariable).to.have.been.calledWith(name);
            expect(result).to.equal(expectedVariable);
        });
    });

    describe('importGlobal()', function () {
        it('should delegate to the effective scope', function () {
            const variableName = 'globalVar';

            scope.importGlobal(variableName);

            expect(effectiveScope.importGlobal).to.have.been.calledOnce;
            expect(effectiveScope.importGlobal).to.have.been.calledWith(variableName);
        });
    });

    describe('updateCoroutine()', function () {
        it('should update the current Coroutine for the Scope', function () {
            const newCoroutine = sinon.createStubInstance(Coroutine);

            scope.updateCoroutine(newCoroutine);

            expect(scope.getCoroutine()).to.equal(newCoroutine);
        });
    });
});
