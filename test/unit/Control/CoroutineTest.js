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
    CallStack = require('../../../src/CallStack'),
    Coroutine = require('../../../src/Control/Coroutine'),
    Exception = phpCommon.Exception,
    NamespaceContext = require('../../../src/Namespace/NamespaceContext'),
    NamespaceScope = require('../../../src/NamespaceScope').sync();

describe('Coroutine', function () {
    var calls,
        callStack,
        coroutine,
        namespaceContext,
        namespaceContextState,
        state;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        namespaceContext = sinon.createStubInstance(NamespaceContext);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack,
            'namespace_context': namespaceContext
        });
        calls = [sinon.createStubInstance(Call), sinon.createStubInstance(Call)];
        namespaceContextState = {
            enteredNamespaceScope: sinon.createStubInstance(NamespaceScope),
            effectiveNamespaceScope: sinon.createStubInstance(NamespaceScope),
            namespaceScopeStack: []
        };

        callStack.save.returns(calls);
        namespaceContext.save.returns(namespaceContextState);

        coroutine = new Coroutine(callStack, namespaceContext);
    });

    describe('resume()', function () {
        describe('when the Coroutine has been suspended', function () {
            it('should restore the CallStack', function () {
                coroutine.suspend();

                coroutine.resume();

                expect(callStack.restore).to.have.been.calledOnce;
                expect(callStack.restore).to.have.been.calledWith(sinon.match.same(calls));
            });

            it('should restore the NamespaceContext', function () {
                coroutine.suspend();

                coroutine.resume();

                expect(namespaceContext.restore).to.have.been.calledOnce;
                expect(namespaceContext.restore).to.have.been.calledWith(sinon.match.same(namespaceContextState));
            });
        });

        describe('when the Coroutine has not been suspended', function () {
            it('should not restore the CallStack', function () {
                coroutine.resume();

                expect(callStack.restore).not.to.have.been.called;
            });

            it('should not restore the NamespaceContext', function () {
                coroutine.resume();

                expect(namespaceContext.restore).not.to.have.been.called;
            });
        });
    });

    describe('suspend()', function () {
        it('should save the NamespaceContext', function () {
            coroutine.suspend();

            expect(namespaceContext.save).to.have.been.calledOnce;
        });

        it('should save the CallStack', function () {
            coroutine.suspend();

            expect(callStack.save).to.have.been.calledOnce;
        });

        it('should clear the CallStack', function () {
            coroutine.suspend();

            expect(callStack.clear).to.have.been.calledOnce;
        });

        it('should clear the CallStack after saving', function () {
            coroutine.suspend();

            expect(callStack.clear).to.have.been.calledAfter(callStack.save);
        });

        it('should throw when the Coroutine has already been suspended', function () {
            coroutine.suspend();

            expect(function () {
                coroutine.suspend();
            }).to.throw(
                Exception,
                'Coroutine.suspend() :: Invalid state - coroutine already suspended'
            );
        });
    });
});
