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
    CallStack = require('../../../src/CallStack'),
    CoroutineFactory = require('../../../src/Control/CoroutineFactory'),
    RealCoroutine = require('../../../src/Control/Coroutine'),
    Scope = require('../../../src/Scope').sync();

describe('CoroutineFactory', function () {
    var callStack,
        Coroutine,
        factory,
        scope,
        state;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        Coroutine = sinon.stub();
        scope = sinon.createStubInstance(Scope);

        callStack.getCurrentScope.returns(scope);

        factory = new CoroutineFactory(Coroutine, callStack);
    });

    describe('createCoroutine()', function () {
        var createdCoroutine;

        beforeEach(function () {
            createdCoroutine = sinon.createStubInstance(RealCoroutine);
            Coroutine.returns(createdCoroutine);
        });

        it('should create the Coroutine correctly', function () {
            factory.createCoroutine();

            expect(Coroutine).to.have.been.calledOnce;
            expect(Coroutine).to.have.been.calledWith(
                sinon.match.same(callStack)
            );
        });

        it('should return the created Coroutine', function () {
            expect(factory.createCoroutine()).to.equal(createdCoroutine);
        });

        it('should update the Scope with the created Coroutine when there is a current one', function () {
            factory.createCoroutine();

            expect(scope.updateCoroutine).to.have.been.calledOnce;
            expect(scope.updateCoroutine).to.have.been.calledWith(sinon.match.same(createdCoroutine));
        });

        it('should not throw when there is no current Scope', function () {
            callStack.getCurrentScope.returns(null);

            expect(function () {
                factory.createCoroutine();
            }).not.to.throw();
        });
    });
});
