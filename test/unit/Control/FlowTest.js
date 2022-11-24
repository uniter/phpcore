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
    Flow = require('../../../src/Control/Flow');

describe('Flow', function () {
    var chainifier,
        flow,
        futureFactory,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();
        chainifier = sinon.createStubInstance(Chainifier);

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
