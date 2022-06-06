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
    Exception = phpCommon.Exception;

describe('Coroutine', function () {
    var calls,
        callStack,
        coroutine,
        state;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        calls = [sinon.createStubInstance(Call), sinon.createStubInstance(Call)];

        callStack.save.returns(calls);

        coroutine = new Coroutine(callStack);
    });

    describe('resume()', function () {
        it('should restore the CallStack when the Coroutine has been suspended', function () {
            coroutine.suspend();

            coroutine.resume();

            expect(callStack.restore).to.have.been.calledOnce;
            expect(callStack.restore).to.have.been.calledWith(sinon.match.same(calls));
        });

        it('should not restore the CallStack when the Coroutine has not been suspended', function () {
            coroutine.resume();

            expect(callStack.restore).not.to.have.been.called;
        });
    });

    describe('suspend()', function () {
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
                'Coroutine.save() :: Invalid state - coroutine already suspended'
            );
        });
    });
});
