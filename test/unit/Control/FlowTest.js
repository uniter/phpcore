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
    util = require('util'),
    Chainifier = require('../../../src/Control/Chain/Chainifier'),
    ControlScope = require('../../../src/Control/ControlScope'),
    Exception = phpCommon.Exception,
    Flow = require('../../../src/Control/Flow'),
    FutureFactory = require('../../../src/Control/FutureFactory'),
    RealFuture = require('../../../src/Control/Future');

describe('Flow', function () {
    var chainifier,
        controlScope,
        flow,
        Future,
        futureFactory,
        futuresCreated,
        hostScheduler,
        realChainifier,
        state,
        valueFactory;

    beforeEach(function () {
        controlScope = sinon.createStubInstance(ControlScope);
        futuresCreated = 0;
        state = tools.createIsolatedState('async', {
            'control_scope': controlScope,
            'future_factory': function (set, get) {
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
        futureFactory = state.getFutureFactory();
        hostScheduler = state.getHostScheduler();
        realChainifier = state.getService('chainifier');
        valueFactory = state.getValueFactory();
        chainifier = sinon.createStubInstance(Chainifier);

        chainifier.chainify.callsFake(function (value) {
            return realChainifier.chainify(value);
        });

        flow = new Flow(
            state.getControlFactory(),
            state.getControlBridge(),
            state.getControlScope(),
            futureFactory,
            chainifier,
            'async'
        );
    });

    describe('all()', function () {
        it('should wrap an array of native values in a Future', async function () {
            expect(await flow.all([21, 101, 'hello']).toPromise()).to.deep.equal([21, 101, 'hello']);
        });

        it('should settle any element that is a Future to be fulfilled', async function () {
            expect(await flow.all([21, futureFactory.createAsyncPresent(101), 'hello']).toPromise())
                .to.deep.equal([21, 101, 'hello']);
        });

        it('should settle any element that is a Future to be rejected', async function () {
            await expect(flow.all([21, futureFactory.createAsyncRejection(new Error('Bang!')), 'hello']).toPromise())
                .to.eventually.be.rejectedWith('Bang!');
        });
    });

    describe('chainify()', function () {
        it('should chainify via the Chainifier', function () {
            var chainifiedValue = {my: 'chainified value'},
                value = {my: 'value'};
            chainifier.chainify
                .withArgs(sinon.match.same(value))
                .returns(chainifiedValue);

            expect(flow.chainify(value)).to.equal(chainifiedValue);
        });
    });

    describe('chainifyCallbackFrom()', function () {
        it('should return the result when already chainable and resolved synchronously', function () {
            var value = valueFactory.createString('my value');
            futuresCreated = 0;

            expect(
                flow.chainifyCallbackFrom(
                    function (resolve) {
                        resolve(value);
                    }
                )
            ).to.equal(value);
            expect(futuresCreated).to.equal(0, 'Should use no Futures at all');
        });

        it('should return the chainified result when not already chainable but resolved synchronously', async function () {
            futuresCreated = 0;

            expect(
                await flow.chainifyCallbackFrom(
                    function (resolve) {
                        resolve('my unchainable result');
                    }
                )
                    .toPromise()
            ).to.equal('my unchainable result');
            expect(futuresCreated).to.equal(1, 'Should use a single Future');
        });

        it('should return the chainified result when not already chainable and resolved asynchronously', async function () {
            futuresCreated = 0;

            expect(
                await flow.chainifyCallbackFrom(
                    function (resolve) {
                        hostScheduler.queueMicrotask(function () {
                            resolve('my unchainable result');
                        });
                    }
                )
                    .toPromise()
            ).to.equal('my unchainable result');
            expect(futuresCreated).to.equal(1, 'Should use a single Future');
        });

        it('should return the chainified result when chainable but resolved asynchronously', async function () {
            var value = valueFactory.createString('my value');
            futuresCreated = 0;

            expect(
                await flow.chainifyCallbackFrom(
                    function (resolve) {
                        hostScheduler.queueMicrotask(function () {
                            resolve(value);
                        });
                    }
                )
                    .toPromise()
            ).to.equal(value);
            expect(futuresCreated).to.equal(1, 'Should use a single Future');
        });

        it('should raise an error when resolved synchronously twice', async function () {
            await expect(
                flow.chainifyCallbackFrom(function (resolve) {
                    resolve('first result');

                    resolve('second result');
                })
                    .toPromise()
            ).to.eventually.be.rejectedWith(
                Exception,
                'Flow.chainifyCallbackFrom() :: resolve() :: Already settled'
            );
        });

        it('should raise an error when resolved then rejected synchronously', async function () {
            await expect(
                flow.chainifyCallbackFrom(function (resolve, reject) {
                    resolve('first: result');

                    reject(new Error('second: error'));
                })
                    .toPromise()
            ).to.eventually.be.rejectedWith(
                Exception,
                'Flow.chainifyCallbackFrom() :: reject() :: Already settled'
            );
        });
    });

    describe('chainifyResultOf()', function () {
        it('should create a Future resolved with the result of the executor', async function () {
            var value = flow
                    .chainifyResultOf(function () {
                        return 'my result';
                    })
                    .next(function (intermediateValue) {
                        return intermediateValue + ' with suffix';
                    }),
                resultValue = await value.toPromise();

            expect(resultValue).to.equal('my result with suffix');
        });

        it('should create a Future rejected with any error of the executor', async function () {
            var error = new Error('Oh dear!'),
                value = flow
                    .chainifyResultOf(function () {
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

            await flow
                .chainifyResultOf(function () {
                    return future;
                })
                .toPromise();

            expect(futuresCreated).to.equal(0);
        });
    });

    describe('createPresent()', function () {
        it('should create a present Future via the FutureFactory', async function () {
            var present = flow.createPresent(21);

            expect(await present.toPromise()).to.equal(21);
        });
    });

    describe('eachAsync()', function () {
        describe('when the inputs array is empty', function () {
            var handler;

            beforeEach(function () {
                handler = sinon.stub();
            });

            it('should not call the handler', async function () {
                await flow.eachAsync([], handler).toPromise();

                expect(handler).not.to.have.been.called;
            });

            it('should resolve the future with undefined', async function () {
                expect(await flow.eachAsync([], handler).toPromise()).to.be.undefined;
            });
        });

        describe('when there are multiple inputs handled successfully', function () {
            var handler,
                inputs;

            beforeEach(function () {
                handler = sinon.stub();
                inputs = [21, 101];

                handler.onFirstCall().returns('first result');
                handler.onSecondCall().returns('second result');
            });

            it('should call the handler once per input', async function () {
                await flow.eachAsync(inputs, handler).toPromise();

                expect(handler).to.have.been.calledTwice;
                expect(handler).to.have.been.calledWith(21);
                expect(handler).to.have.been.calledWith(101);
            });

            it('should resolve the future with the result from the last handler invocation', async function () {
                expect(await flow.eachAsync(inputs, handler).toPromise()).to.equal('second result');
            });
        });

        describe('when there are multiple inputs handled successfully and one returns false synchronously to stop iteration', function () {
            var handler,
                inputs;

            beforeEach(function () {
                handler = sinon.stub();
                inputs = [21, 101, 76, 78];

                handler.onFirstCall().returns('first result');
                handler.onSecondCall().returns('second result');
                handler.onThirdCall().returns(false);
                handler.onCall(3).returns('fourth result');
            });

            it('should call the handler once per input only prior to the false', async function () {
                await flow.eachAsync(inputs, handler).toPromise();

                expect(handler).to.have.been.calledThrice;
                expect(handler).to.have.been.calledWith(21);
                expect(handler).to.have.been.calledWith(101);
                expect(handler).to.have.been.calledWith(76);
            });

            it('should resolve the future with the result from the last handler invocation before stopping', async function () {
                expect(await flow.eachAsync(inputs, handler).toPromise()).to.equal('second result');
            });
        });

        describe('when there are multiple inputs handled successfully and one returns false asynchronously to stop iteration', function () {
            var handler,
                inputs;

            beforeEach(function () {
                handler = sinon.stub();
                inputs = [21, 101, 76, 78];

                handler.onFirstCall().returns('first result');
                handler.onSecondCall().returns('second result');
                handler.onThirdCall().returns(futureFactory.createAsyncPresent(false));
                handler.onCall(3).returns('fourth result');
            });

            it('should call the handler once per input only prior to the false', async function () {
                await flow.eachAsync(inputs, handler).toPromise();

                expect(handler).to.have.been.calledThrice;
                expect(handler).to.have.been.calledWith(21);
                expect(handler).to.have.been.calledWith(101);
                expect(handler).to.have.been.calledWith(76);
            });

            it('should resolve the future with the result from the last handler invocation before stopping', async function () {
                expect(await flow.eachAsync(inputs, handler).toPromise()).to.equal('second result');
            });
        });

        describe('when an input is itself a Future', function () {
            var handler,
                inputs;

            beforeEach(function () {
                handler = sinon.stub();
                inputs = [21, futureFactory.createAsyncPresent(101)];

                handler.onFirstCall().returns('first result');
                handler.onSecondCall().returns('second result, from future');
            });

            it('should call the handler once per input after settling any Futures', async function () {
                await flow.eachAsync(inputs, handler).toPromise();

                expect(handler).to.have.been.calledTwice;
                expect(handler).to.have.been.calledWith(21);
                expect(handler).to.have.been.calledWith(101);
            });

            it('should resolve the future with the result from the last handler invocation', async function () {
                expect(await flow.eachAsync(inputs, handler).toPromise()).to.equal('second result, from future');
            });
        });

        describe('when the handler throws for a middle input', function () {
            var handler,
                inputs;

            beforeEach(function () {
                handler = sinon.stub();
                inputs = [21, 'middle', 101];

                handler.onFirstCall().returns('first result');
                handler.onSecondCall().throws(new Error('Bang!'));
                handler.onThirdCall().returns('second result');
            });

            it('should not call the handler for inputs after the error', async function () {
                try {
                    await flow.eachAsync(inputs, handler).toPromise();
                } catch (error) {
                }

                expect(handler).to.have.been.calledTwice;
                expect(handler).to.have.been.calledWith(21);
                expect(handler).to.have.been.calledWith('middle');
                // Note that the handler was not called for the third input.
            });

            it('should reject the future with the error from the failed handler invocation', function () {
                return expect(flow.eachAsync(inputs, handler).toPromise())
                    .to.eventually.be.rejectedWith('Bang!');
            });
        });
    });

    describe('forOwnAsync()', function () {
        describe('when the input object is empty', function () {
            var handler;

            beforeEach(function () {
                handler = sinon.stub();
            });

            it('should not call the handler', async function () {
                await flow.forOwnAsync({}, handler).toPromise();

                expect(handler).not.to.have.been.called;
            });

            it('should resolve the future with undefined', async function () {
                expect(await flow.forOwnAsync({}, handler).toPromise()).to.be.undefined;
            });
        });

        describe('when there are multiple properties handled successfully', function () {
            var handler,
                input;

            beforeEach(function () {
                handler = sinon.stub();
                input = {'first': 21, 'second': 101};

                handler.onFirstCall().returns('first result');
                handler.onSecondCall().returns('second result');
            });

            it('should call the handler once per property', async function () {
                await flow.forOwnAsync(input, handler).toPromise();

                expect(handler).to.have.been.calledTwice;
                expect(handler).to.have.been.calledWith(21);
                expect(handler).to.have.been.calledWith(101);
            });

            it('should resolve the future with the result from the last handler invocation', async function () {
                expect(await flow.forOwnAsync(input, handler).toPromise()).to.equal('second result');
            });
        });

        describe('when a property value is itself a Future', function () {
            var handler,
                input;

            beforeEach(function () {
                handler = sinon.stub();
                input = {'first': 21, 'second': futureFactory.createAsyncPresent(101)};

                handler.onFirstCall().returns('first result');
                handler.onSecondCall().returns('second result, from future');
            });

            it('should call the handler once per property after settling any Futures', async function () {
                await flow.forOwnAsync(input, handler).toPromise();

                expect(handler).to.have.been.calledTwice;
                expect(handler).to.have.been.calledWith(21);
                expect(handler).to.have.been.calledWith(101);
            });

            it('should resolve the future with the result from the last handler invocation', async function () {
                expect(await flow.forOwnAsync(input, handler).toPromise()).to.equal('second result, from future');
            });
        });

        describe('when the handler throws for a middle property', function () {
            var handler,
                input;

            beforeEach(function () {
                handler = sinon.stub();
                input = {'first': 21, 'second': 'middle', 'third': 101};

                handler.onFirstCall().returns('first result');
                handler.onSecondCall().throws(new Error('Bang!'));
                handler.onThirdCall().returns('second result');
            });

            it('should not call the handler for properties after the error', async function () {
                try {
                    await flow.forOwnAsync(input, handler).toPromise();
                } catch (error) {
                }

                expect(handler).to.have.been.calledTwice;
                expect(handler).to.have.been.calledWith(21);
                expect(handler).to.have.been.calledWith('middle');
                // Note that the handler was not called for the third property.
            });

            it('should reject the future with the error from the failed handler invocation', function () {
                return expect(flow.forOwnAsync(input, handler).toPromise())
                    .to.eventually.be.rejectedWith('Bang!');
            });
        });
    });

    describe('mapAsync()', function () {
        describe('when the inputs array is empty', function () {
            var handler;

            beforeEach(function () {
                handler = sinon.stub();
            });

            it('should not call the handler', async function () {
                await flow.mapAsync([], handler).toPromise();

                expect(handler).not.to.have.been.called;
            });

            it('should resolve the future with an empty array', async function () {
                expect(await flow.mapAsync([], handler).toPromise()).to.deep.equal([]);
            });
        });

        describe('when there are multiple inputs handled successfully', function () {
            var handler,
                inputs;

            beforeEach(function () {
                handler = sinon.stub();
                inputs = [21, 101];

                handler.onFirstCall().returns('first result');
                handler.onSecondCall().returns('second result');
            });

            it('should call the handler once per input', async function () {
                await flow.mapAsync(inputs, handler).toPromise();

                expect(handler).to.have.been.calledTwice;
                expect(handler).to.have.been.calledWith(21);
                expect(handler).to.have.been.calledWith(101);
            });

            it('should resolve the future with the results from all handler invocations', async function () {
                expect(await flow.mapAsync(inputs, handler).toPromise())
                    .to.deep.equal(['first result', 'second result']);
            });
        });

        describe('when an input is itself a Future', function () {
            var handler,
                inputs;

            beforeEach(function () {
                handler = sinon.stub();
                inputs = [21, futureFactory.createAsyncPresent(101)];

                handler.onFirstCall().returns('first result');
                handler.onSecondCall().returns('second result, from future');
            });

            it('should call the handler once per input after settling any Futures', async function () {
                await flow.mapAsync(inputs, handler).toPromise();

                expect(handler).to.have.been.calledTwice;
                expect(handler).to.have.been.calledWith(21);
                expect(handler).to.have.been.calledWith(101);
            });

            it('should resolve the future with the results from all handler invocations', async function () {
                expect(await flow.mapAsync(inputs, handler).toPromise())
                    .to.deep.equal(['first result', 'second result, from future']);
            });
        });

        describe('when the handler throws for a middle input', function () {
            var handler,
                inputs;

            beforeEach(function () {
                handler = sinon.stub();
                inputs = [21, 'middle', 101];

                handler.onFirstCall().returns('first result');
                handler.onSecondCall().throws(new Error('Bang!'));
                handler.onThirdCall().returns('second result');
            });

            it('should not call the handler for inputs after the error', async function () {
                try {
                    await flow.mapAsync(inputs, handler).toPromise();
                } catch (error) {
                }

                expect(handler).to.have.been.calledTwice;
                expect(handler).to.have.been.calledWith(21);
                expect(handler).to.have.been.calledWith('middle');
                // Note that the handler was not called for the third input.
            });

            it('should reject the future with the error from the failed handler invocation', function () {
                return expect(flow.mapAsync(inputs, handler).toPromise())
                    .to.eventually.be.rejectedWith('Bang!');
            });
        });
    });
});
