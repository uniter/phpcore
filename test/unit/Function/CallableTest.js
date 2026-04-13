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
    Call = require('../../../src/Call'),
    Callable = require('../../../src/Function/Callable'),
    CallFactory = require('../../../src/CallFactory'),
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    ControlScope = require('../../../src/Control/ControlScope'),
    Exception = phpCommon.Exception,
    FunctionSpec = require('../../../src/Function/FunctionSpec'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    Scope = require('../../../src/Scope').sync(),
    ScopeFactory = require('../../../src/ScopeFactory'),
    Value = require('../../../src/Value').sync(),
    Variable = require('../../../src/Variable').sync();

describe('Callable', function () {
    var call,
        callable,
        callFactory,
        callStack,
        controlScope,
        currentClass,
        currentObject,
        flow,
        functionSpec,
        futureFactory,
        namespaceScope,
        originalFunc,
        pauseFactory,
        scope,
        scopeFactory,
        state,
        staticClass,
        valueFactory;

    beforeEach(function () {
        callFactory = sinon.createStubInstance(CallFactory);
        callStack = sinon.createStubInstance(CallStack);
        controlScope = sinon.createStubInstance(ControlScope);
        state = tools.createIsolatedState('async', {
            'call_factory': callFactory,
            'call_stack': callStack,
            'control_scope': controlScope
        });
        call = sinon.createStubInstance(Call);
        currentClass = sinon.createStubInstance(Class);
        currentObject = null;
        flow = state.getFlow();
        functionSpec = sinon.createStubInstance(FunctionSpec);
        futureFactory = state.getFutureFactory();
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        originalFunc = sinon.stub();
        pauseFactory = state.getPauseFactory();
        scope = sinon.createStubInstance(Scope);
        scopeFactory = sinon.createStubInstance(ScopeFactory);
        staticClass = null;
        valueFactory = state.getValueFactory();

        callFactory.create.returns(call);
        scopeFactory.create.returns(scope);

        functionSpec.coercePositionalArguments
            .callsFake(function (argumentReferences) {
                return futureFactory.createAsyncPresent(
                    argumentReferences.map(function (argumentReference) {
                        return valueFactory.coerce(argumentReference);
                    })
                );
            });
        functionSpec.coerceNamedArguments
            .callsFake(function (namedArguments, positionalArguments, argValues) {
                return futureFactory.createPresent(argValues);
            });
        functionSpec.coerceReturnReference.callsFake(function (returnReference) {
            return futureFactory.createPresent(returnReference);
        });
        functionSpec.populateDefaultArguments.returnsArg(0);
        functionSpec.resolveFunctionSpec.returns(functionSpec);
        functionSpec.getFunction.returns(originalFunc);
        functionSpec.isReturnByReference.returns(false);
        functionSpec.isUserland.returns(false);
        functionSpec.validateArguments
            .callsFake(function () {
                return futureFactory.createPresent();
            });
        functionSpec.validateReturnReference
            .callsFake(function (returnReference, returnValue) {
                return futureFactory.createPresent(returnValue);
            });

        callable = new Callable(
            scopeFactory,
            callFactory,
            valueFactory,
            callStack,
            flow,
            namespaceScope,
            currentClass,
            currentObject,
            staticClass,
            functionSpec
        );
    });

    describe('call()', function () {
        it('should return the eventual result from the wrapped function coerced to a Value when return-by-value', async function () {
            var result,
                resultValue;
            originalFunc.returns(123);

            result = callable.call([], null, null, null);
            resultValue = await result.toPromise();

            expect(resultValue).to.be.an.instanceOf(Value);
            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(123);
        });

        it('should throw an Exception if a built-in function enacts a Pause directly rather than returning a Future', async function () {
            originalFunc.callsFake(function () {
                var pause = pauseFactory.createPause(function () {});

                pause.now();
            });

            await expect(callable.call([], null, null, null).toPromise()).to.eventually.be.rejectedWith(
                Exception,
                'Callable :: A built-in function enacted a Pause, did you mean to return a Future instead?'
            );
        });

        describe('when return-by-reference', function () {
            var resultVariable;

            beforeEach(function () {
                resultVariable = sinon.createStubInstance(Variable);
                resultVariable.next.callsArgWith(0, resultVariable);
                functionSpec.isReturnByReference.returns(true);
                originalFunc.returns(resultVariable);
            });

            it('should return the eventual result from the wrapped function', async function () {
                expect(await callable.call([], null, null, null).toPromise()).to.equal(resultVariable);
            });

            it('should validate the eventual result Variable/reference via .validateReturnReference()', async function () {
                await callable.call([], null, null, null).toPromise();

                expect(functionSpec.validateReturnReference).to.have.been.calledOnce;
                expect(functionSpec.validateReturnReference).to.have.been.calledWith(
                    sinon.match.same(resultVariable)
                );
            });
        });

        it('should pass the current Class to the ScopeFactory', async function () {
            await callable.call([], null, null, null).toPromise();

            expect(scopeFactory.create).to.have.been.calledOnce;
            expect(scopeFactory.create).to.have.been.calledWith(
                sinon.match.same(currentClass)
            );
        });

        it('should pass the callable to the ScopeFactory', async function () {
            await callable.call([], null, null, null).toPromise();

            expect(scopeFactory.create).to.have.been.calledOnce;
            expect(scopeFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(callable)
            );
        });

        it('should pass the thisObject to the ScopeFactory', async function () {
            var thisObject = valueFactory.createObject({}, currentClass);

            await callable.call([], null, thisObject, null).toPromise();

            expect(scopeFactory.create).to.have.been.calledOnce;
            expect(scopeFactory.create).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(thisObject)
            );
        });

        describe('named arguments support', function () {
            it('should handle named arguments when provided', async function () {
                var namedArguments = {
                    'param1': valueFactory.createString('value1'),
                    'param2': valueFactory.createInteger(42)
                };

                await callable.call([], namedArguments, null, null).toPromise();

                expect(functionSpec.coerceNamedArguments).to.have.been.calledOnce;
                expect(functionSpec.coerceNamedArguments).to.have.been.calledWith(
                    sinon.match.same(namedArguments),
                    sinon.match.array,
                    sinon.match.array
                );
            });

            it('should skip named argument processing when namedArguments is null', async function () {
                await callable.call([], null, null, null).toPromise();

                expect(functionSpec.coerceNamedArguments).not.to.have.been.called;
            });

            it('should handle mixed positional and named arguments', async function () {
                var positionalArguments = [valueFactory.createString('pos1')],
                    namedArguments = {
                        'param2': valueFactory.createInteger(42)
                    };

                await callable.call(positionalArguments, namedArguments, null, null).toPromise();

                expect(functionSpec.coercePositionalArguments).to.have.been.calledOnce;
                expect(functionSpec.coercePositionalArguments).to.have.been.calledWith(
                    sinon.match.same(positionalArguments)
                );
                expect(functionSpec.coerceNamedArguments).to.have.been.calledOnce;
            });
        });

        it('should push and pop the call on the call stack', async function () {
            await callable.call([], null, null, null).toPromise();

            expect(callStack.push).to.have.been.calledOnce;
            expect(callStack.push).to.have.been.calledWith(sinon.match.same(call));
            expect(callStack.pop).to.have.been.calledOnce;
        });

        it('should pop the call from the stack even if an error occurs', async function () {
            functionSpec.validateArguments.returns(futureFactory.createRejection(new Error('Test error')));

            try {
                await callable.call([], null, null, null).toPromise();
            } catch (error) {
                // Expected to throw
            }

            expect(callStack.push).to.have.been.calledOnce;
            expect(callStack.pop).to.have.been.calledOnce;
        });
    });
});
