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
    util = require('util'),
    ControlScope = require('../../../src/Control/ControlScope'),
    Coroutine = require('../../../src/Control/Coroutine'),
    FutureFactory = require('../../../src/Control/FutureFactory'),
    RealFuture = require('../../../src/Control/Future');

describe('FutureFactory', function () {
    var controlBridge,
        controlScope,
        coroutine,
        Future,
        futureFactory,
        futuresCreated,
        pauseFactory,
        state,
        valueFactory;

    beforeEach(function () {
        controlScope = sinon.createStubInstance(ControlScope);
        futuresCreated = 0;
        state = tools.createIsolatedState('async', {
            'control_scope': controlScope,
            'future_factory': function (get) {
                function TrackedFuture() {
                    RealFuture.apply(this, arguments);

                    futuresCreated++;
                }

                util.inherits(TrackedFuture, RealFuture);

                Future = sinon.spy(TrackedFuture);

                return new FutureFactory(
                    get('pause_factory'),
                    get('value_factory'),
                    get('control_bridge'),
                    controlScope,
                    Future
                );
            }
        });
        controlBridge = state.getControlBridge();
        coroutine = sinon.createStubInstance(Coroutine);
        pauseFactory = state.getPauseFactory();
        valueFactory = state.getValueFactory();

        controlScope.getCoroutine.returns(coroutine);

        futureFactory = state.getFutureFactory();
    });

    describe('createAsyncPresent()', function () {
        it('should return a pending Future', function () {
            var future = futureFactory.createAsyncPresent('my value');

            expect(future).to.be.an.instanceOf(Future);
            expect(future.isPending()).to.be.true;
        });

        it('should return a Future that eventually resolves with the given value', async function () {
            var future = futureFactory.createAsyncPresent('my value');

            expect(await future.toPromise()).to.equal('my value');
        });
    });

    describe('createAsyncRejection()', function () {
        it('should return a pending Future', function () {
            var future = futureFactory.createAsyncRejection(new Error('my error'));

            expect(future).to.be.an.instanceOf(Future);
            expect(future.isPending()).to.be.true;
        });

        it('should return a Future that eventually rejects with the given error', function () {
            var error = new Error('my error'),
                future = futureFactory.createAsyncRejection(error);

            return expect(future.toPromise()).to.eventually.be.rejectedWith(error);
        });
    });

    describe('createFuture()', function () {
        it('should return a correctly constructed Future', function () {
            var executor = sinon.stub(),
                future;
            Future.resetHistory(); // As Future will have been used internally.

            future = futureFactory.createFuture(executor);

            expect(future).to.be.an.instanceOf(Future);
            expect(Future).to.have.been.calledOnce;
            expect(Future).to.have.been.calledWith(
                sinon.match.same(futureFactory),
                sinon.match.same(pauseFactory),
                sinon.match.same(valueFactory),
                sinon.match.same(controlBridge),
                sinon.match.same(controlScope),
                sinon.match.same(executor),
                sinon.match.same(coroutine)
            );
        });
    });

    describe('createFutureChain()', function () {
        it('should create a Future resolved with the result of the executor', async function () {
            var value = futureFactory
                    .createFutureChain(function () {
                        return 'my result';
                    })
                    .next(function (intermediateValue) {
                        return intermediateValue + ' with suffix';
                    }),
                resultValue = await value.toPromise();

            expect(resultValue).to.equal('my result with suffix');
        });

        it('should create a FutureValue rejected with any error of the executor', async function () {
            var error = new Error('Oh dear!'),
                value = futureFactory
                    .createFutureChain(function () {
                        throw error;
                    })
                    .next(function (intermediateValue) {
                        return intermediateValue + ' with suffix';
                    });

            await expect(value.toPromise()).to.eventually.be.rejectedWith(error);
        });

        it('should create no Future instances when not required', async function () {
            var future = futureFactory.createAsyncPresent('my result');
            futuresCreated = 0;

            await futureFactory
                .createFutureChain(function () {
                    return future;
                })
                .toPromise();

            expect(futuresCreated).to.equal(0);
        });
    });
});
