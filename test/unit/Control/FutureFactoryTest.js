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
    Chainifier = require('../../../src/Control/Chain/Chainifier'),
    ControlScope = require('../../../src/Control/ControlScope'),
    Coroutine = require('../../../src/Control/Coroutine'),
    FutureFactory = require('../../../src/Control/FutureFactory'),
    RealFuture = require('../../../src/Control/Future'),
    RealPresent = require('../../../src/Control/Present');

describe('FutureFactory', function () {
    var chainifier,
        controlBridge,
        controlScope,
        coroutine,
        Future,
        futureFactory,
        pauseFactory,
        Present,
        state,
        valueFactory;

    beforeEach(function () {
        controlScope = sinon.createStubInstance(ControlScope);
        state = tools.createIsolatedState('async', {
            'control_scope': controlScope
        });
        chainifier = sinon.createStubInstance(Chainifier);
        controlBridge = state.getControlBridge();
        coroutine = sinon.createStubInstance(Coroutine);
        Future = sinon.spy(RealFuture);
        pauseFactory = state.getPauseFactory();
        Present = sinon.spy(RealPresent);
        valueFactory = state.getValueFactory();

        controlScope.getCoroutine.returns(coroutine);
        Future.prototype = RealFuture.prototype;
        Present.prototype = RealPresent.prototype;

        futureFactory = new FutureFactory(
            pauseFactory,
            valueFactory,
            controlBridge,
            controlScope,
            Future,
            Present
        );
        futureFactory.setChainifier(chainifier);
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

    describe('createPresent()', function () {
        it('should return a correctly constructed Present', function () {
            var present;
            Present.resetHistory(); // As Present will have been used internally.

            present = futureFactory.createPresent('my value');

            expect(present).to.be.an.instanceOf(Present);
            expect(Present).to.have.been.calledOnce;
            expect(Present).to.have.been.calledWith(
                sinon.match.same(futureFactory),
                sinon.match.same(chainifier),
                sinon.match.same(valueFactory),
                'my value'
            );
        });
    });
});
