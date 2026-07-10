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
    RealCoroutine = require('../../../src/Control/Coroutine');

describe('CoroutineFactory', function () {
    var callStack,
        Coroutine,
        factory,
        state;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        Coroutine = sinon.stub();

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
    });
});
