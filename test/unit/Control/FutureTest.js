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
    CallStack = require('../../../src/CallStack'),
    ControlScope = require('../../../src/Control/ControlScope'),
    Coroutine = require('../../../src/Control/Coroutine'),
    Future = require('../../../src/Control/Future'),
    FutureFactory = require('../../../src/Control/FutureFactory'),
    Pause = require('../../../src/Control/Pause');

describe('Future', function () {
    var callStack,
        controlBridge,
        controlScope,
        coroutine,
        future,
        futureFactory,
        futuresCreated,
        nestCoroutineForFuture,
        pauseFactory,
        rejectFuture,
        resolveFuture,
        state,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        controlScope = sinon.createStubInstance(ControlScope);
        futuresCreated = 0;
        state = tools.createIsolatedState('async', {
            'call_stack': callStack,
            'control_scope': controlScope,
            'future_factory': function (get) {
                function TrackedFuture() {
                    Future.apply(this, arguments);

                    futuresCreated++;
                }

                util.inherits(TrackedFuture, Future);

                return new FutureFactory(
                    get('pause_factory'),
                    get('value_factory'),
                    get('control_bridge'),
                    get('control_scope'),
                    TrackedFuture
                );
            }
        });
        controlBridge = state.getControlBridge();
        coroutine = sinon.createStubInstance(Coroutine);
        futureFactory = state.getFutureFactory();
        pauseFactory = state.getPauseFactory();
        valueFactory = state.getValueFactory();

        future = new Future(
            futureFactory,
            pauseFactory,
            valueFactory,
            controlBridge,
            controlScope,
            function (resolve, reject, nestCoroutine) {
                rejectFuture = reject;
                resolveFuture = resolve;
                nestCoroutineForFuture = nestCoroutine;
            },
            coroutine
        );
    });

    describe('constructor()', function () {
        it('should resume the Future\'s coroutine on resolve before calling handlers', function () {
            var onResolve = sinon.spy();
            future.nextIsolated(onResolve);
            controlScope.resumeCoroutine.resetHistory();

            resolveFuture();

            expect(controlScope.resumeCoroutine).to.have.been.calledOnce;
            expect(controlScope.resumeCoroutine).to.have.been.calledWith(sinon.match.same(coroutine));
            expect(onResolve).to.have.been.calledOnce;
            expect(controlScope.resumeCoroutine).to.have.been.calledBefore(onResolve);
        });

        it('should resume the Future\'s coroutine on rejection before calling handlers', function () {
            var onReject = sinon.spy();
            future.catchIsolated(onReject);
            controlScope.resumeCoroutine.resetHistory();

            rejectFuture(new Error('Bang!'));

            expect(controlScope.resumeCoroutine).to.have.been.calledOnce;
            expect(controlScope.resumeCoroutine).to.have.been.calledWith(sinon.match.same(coroutine));
            expect(onReject).to.have.been.calledOnce;
            expect(controlScope.resumeCoroutine).to.have.been.calledBefore(onReject);
        });

        it('should expose a callback for nesting the next Coroutine', function () {
            nestCoroutineForFuture();

            expect(controlScope.nestCoroutine).to.have.been.calledOnce;
        });

        it('should not nest the next Coroutine by default', function () {
            expect(controlScope.nestCoroutine).not.to.have.been.called;
        });
    });

    describe('asFuture()', function () {
        it('should return the Future', function () {
            expect(future.asFuture()).to.equal(future);
        });
    });

    describe('asValue()', function () {
        it('should derive a FutureValue via the ValueFactory', async function () {
            var futureValue = future.asValue(),
                presentValue;

            resolveFuture('my result');
            presentValue = await futureValue.toPromise();

            expect(presentValue.getType()).to.equal('string');
            expect(presentValue.getNative()).to.equal('my result');
        });
    });

    describe('catch()', function () {
        it('should return a new Future that catches a rejection of a pending Future', async function () {
            var derivedFuture = future.catch(function (error) {
                return 'The error was: ' + error.message;
            });

            rejectFuture(new Error('Bang!'));

            expect(await derivedFuture.toPromise()).to.equal('The error was: Bang!');
            await expect(future.toPromise()).to.have.been.rejectedWith('Bang!');
        });

        it('should return a new Future that catches a rejected Future', async function () {
            var derivedFuture;
            rejectFuture(new Error('Bang!'));

            derivedFuture = future.catch(function (error) {
                return 'The error was: ' + error.message;
            });

            expect(await derivedFuture.toPromise()).to.equal('The error was: Bang!');
            await expect(future.toPromise()).to.have.been.rejectedWith('Bang!');
        });

        // Note this differs from .finally(...) behaviour.
        it('should return a new Future that calls the handler when rejected, returning undefined if nothing returned', async function () {
            var derivedFuture = future.catch(function () {
                // Return undefined, but the error should not be re-raised.
            });

            rejectFuture(new Error('Bang!'));

            expect(await derivedFuture.toPromise()).to.be.undefined;
            await expect(future.toPromise()).to.be.rejectedWith('Bang!');
        });
    });

    describe('catchIsolated()', function () {
        it('should add a handler that calls the rejection handler when rejected', async function () {
            var error = new Error('Bang!'),
                rejectHandler = sinon.stub();

            future.catchIsolated(rejectHandler);

            rejectFuture(error);

            await expect(future.toPromise()).to.be.rejectedWith('Bang!');
            expect(rejectHandler).to.have.been.calledOnce;
            expect(rejectHandler).to.have.been.calledWith(sinon.match.same(error));
        });

        it('should swallow any further errors raised by the rejection handler when rejected', async function () {
            var error = new Error('Bang!'),
                rejectHandler = sinon.stub().throws(new Error('A further bang!'));

            future.catchIsolated(rejectHandler);

            rejectFuture(error);

            await expect(future.toPromise()).to.be.rejectedWith('Bang!');
            expect(rejectHandler).to.have.been.calledOnce;
            expect(rejectHandler).to.have.been.calledWith(sinon.match.same(error));
        });
    });

    describe('concatString()', function () {
        it('should return a new Future that appends the given text to its resolved value', async function () {
            var derivedFuture = future.concatString(' with a suffix');

            resolveFuture('my text');

            expect(await derivedFuture.toPromise()).to.equal('my text with a suffix');
            expect(await future.toPromise()).to.equal('my text', 'original should be left untouched');
        });
    });

    describe('finally()', function () {
        it('should return a new Future that calls the handler when fulfilled', async function () {
            var derivedFuture = future.finally(function (result) {
                return 'resolved with: ' + result;
            });

            resolveFuture('my result');

            expect(await derivedFuture.toPromise()).to.equal('resolved with: my result');
            expect(await future.toPromise()).to.equal('my result', 'original should be left untouched');
        });

        it('should return a new Future that calls the handler when rejected, allowing error to be replaced with result', async function () {
            var derivedFuture = future.finally(function (error) {
                return 'rejected with: ' + error.message;
            });

            rejectFuture(new Error('Bang!'));

            expect(await derivedFuture.toPromise()).to.equal('rejected with: Bang!');
            await expect(future.toPromise()).to.be.rejectedWith('Bang!');
        });

        it('should return a new Future that calls the handler when rejected, re-raising error if nothing returned', async function () {
            var derivedFuture = future.finally(function () {
                // Return undefined, so that the error is re-raised.
            });

            rejectFuture(new Error('Bang!'));

            await expect(derivedFuture.toPromise()).to.be.rejectedWith('Bang!');
            await expect(future.toPromise()).to.be.rejectedWith('Bang!');
        });
    });

    describe('isPending()', function () {
        it('should return true when the Future is pending', function () {
            expect(future.isPending()).to.be.true;
        });

        it('should return false when the Future is settled', function () {
            resolveFuture(21);

            expect(future.isPending()).to.be.false;
        });
    });

    describe('isSettled()', function () {
        it('should return true when the Future is settled', function () {
            resolveFuture(21);

            expect(future.isSettled()).to.be.true;
        });

        it('should return false when the Future is pending', function () {
            expect(future.isSettled()).to.be.false;
        });
    });

    describe('next()', function () {
        it('should return a new Future that calls the resolve handler when fulfilled', async function () {
            var derivedFuture = future.next(function (result) {
                return 'resolved with: ' + result;
            }, function (error) {
                return 'rejected with: ' + error.message;
            });

            resolveFuture('my result');

            expect(await derivedFuture.toPromise()).to.equal('resolved with: my result');
            expect(await future.toPromise()).to.equal('my result', 'original should be left untouched');
        });

        it('should return a new Future that calls the rejection handler when rejected', async function () {
            var derivedFuture = future.next(function (result) {
                return 'resolved with: ' + result;
            }, function (error) {
                return 'rejected with: ' + error.message;
            });

            rejectFuture(new Error('Bang!'));

            expect(await derivedFuture.toPromise()).to.equal('rejected with: Bang!');
            await expect(future.toPromise()).to.be.rejectedWith('Bang!');
        });

        it('should return a new Future that calls the rejection handler when rejected, allowing error to be replaced with result', async function () {
            var derivedFuture = future.next(function (result) {
                return 'resolved with: ' + result;
            }, function (error) {
                return 'rejected with: ' + error.message;
            });

            rejectFuture(new Error('Bang!'));

            expect(await derivedFuture.toPromise()).to.equal('rejected with: Bang!');
            await expect(future.toPromise()).to.be.rejectedWith('Bang!');
        });

        // Note this differs from .finally(...) behaviour.
        it('should return a new Future that calls the rejection handler when rejected, returning undefined if nothing returned', async function () {
            var derivedFuture = future.next(function (result) {
                return 'resolved with: ' + result;
            }, function () {
                // Return undefined, but the error should not be re-raised.
            });

            rejectFuture(new Error('Bang!'));

            expect(await derivedFuture.toPromise()).to.be.undefined;
            await expect(future.toPromise()).to.be.rejectedWith('Bang!');
        });
    });

    describe('nextIsolated()', function () {
        it('should add a handler that calls the resolve handler when fulfilled', async function () {
            var resolveHandler = sinon.stub();

            future.nextIsolated(resolveHandler, function (error) {
                throw new Error('rejected with: ' + error.message + ', but should have been rejected');
            });

            resolveFuture('my result');

            expect(await future.toPromise()).to.equal('my result', 'should be left untouched');
            expect(resolveHandler).to.have.been.calledOnce;
            expect(resolveHandler).to.have.been.calledWith('my result');
        });

        it('should add a handler that calls the rejection handler when rejected', async function () {
            var error = new Error('Bang!'),
                rejectHandler = sinon.stub();

            future.nextIsolated(function (result) {
                throw new Error('resolved with: ' + result + ', but should have been rejected');
            }, rejectHandler);

            rejectFuture(error);

            await expect(future.toPromise()).to.be.rejectedWith('Bang!');
            expect(rejectHandler).to.have.been.calledOnce;
            expect(rejectHandler).to.have.been.calledWith(sinon.match.same(error));
        });

        it('should cause any errors raised by the resolve handler to reject', async function () {
            var error = new Error('Bang!'),
                rejectHandler = sinon.spy(),
                resolveHandler = sinon.stub().throws(error);

            future.nextIsolated(resolveHandler, rejectHandler);

            resolveFuture('my result');

            await expect(future.toPromise()).not.to.be.rejected;
            expect(resolveHandler).to.have.been.calledOnce;
            expect(resolveHandler).to.have.been.calledWith('my result');
            expect(rejectHandler).to.have.been.calledOnce;
            expect(rejectHandler).to.have.been.calledWith(sinon.match.same(error));
        });

        it('should swallow any further errors raised by the rejection handler when rejected', async function () {
            var error = new Error('Bang!'),
                rejectHandler = sinon.stub().throws(new Error('A further bang!'));

            future.nextIsolated(function (result) {
                throw new Error('resolved with: ' + result + ', but should have been rejected');
            }, rejectHandler);

            rejectFuture(error);

            await expect(future.toPromise()).to.be.rejectedWith('Bang!');
            expect(rejectHandler).to.have.been.calledOnce;
            expect(rejectHandler).to.have.been.calledWith(sinon.match.same(error));
        });
    });

    describe('toPromise()', function () {
        it('should return a Promise to be resolved if this Future is', async function () {
            var promise = future.toPromise();

            resolveFuture('my result');

            expect(await promise).to.equal('my result');
        });

        it('should return a Promise to be rejected if this Future is', async function () {
            var promise = future.toPromise();

            rejectFuture(new Error('my error'));

            await expect(promise).to.have.been.rejectedWith('my error');
        });

        it('should create no Future instances when not required', async function () {
            var promise;
            futuresCreated = 0;

            promise = future.toPromise();
            resolveFuture('my result');
            await promise;

            expect(futuresCreated).to.equal(0);
        });
    });

    describe('yield()', function () {
        it('should return the eventual result when the Future has been resolved', function () {
            resolveFuture('my result');

            expect(future.yield()).to.equal('my result');
        });

        it('should throw the eventual error when the Future has been rejected', function () {
            rejectFuture(new Error('Bang!'));

            expect(function () {
                future.yield();
            }).to.throw('Bang!');
        });

        it('should raise a Pause when the Future is still pending', function () {
            var pause;
            try {
                future.yield();
            } catch (error) {
                pause = error;
            }

            expect(pause).to.be.an.instanceOf(Pause);
        });

        describe('the Pause raised for a pending Future', function () {
            var pause;

            beforeEach(function () {
                pause = null;

                try {
                    future.yield();
                } catch (error) {
                    pause = error;
                }
            });

            it('should call handlers in the order they were attached', function (done) {
                var log = '';
                pause.next(function (result) {
                    log += 'first(' + result + ')';

                    return 'first_result';
                });
                pause.next(function (result) {
                    log += ' second(' + result + ')';

                    return 'second_result';
                });
                pause.next(function () {
                    expect(log).to.equal('first(initial_result) second(first_result)');
                    done();
                });

                resolveFuture('initial_result');
            });

            it('should handle errors being thrown by handlers', function (done) {
                var log = '';
                pause.next(function () {
                    throw new Error('Failure in first handler');
                });
                pause.catch(function (error) {
                    log += 'catch(' + error.message + ')';

                    return 'catch_result';
                });
                pause.next(function (result) {
                    log += ' next(' + result + ')';

                    return 'next_result';
                });
                pause.next(function () {
                    expect(log).to.equal('catch(Failure in first handler) next(catch_result)');
                    done();
                });

                resolveFuture('initial_result');
            });
        });
    });

    describe('yieldSync()', function () {
        it('should return the eventual result when the Future has been resolved', function () {
           resolveFuture('my result');

           expect(future.yieldSync()).to.equal('my result');
        });

        it('should throw the eventual error when the Future has been rejected', function () {
            rejectFuture(new Error('Bang!'));

            expect(function () {
                future.yieldSync();
            }).to.throw('Bang!');
        });

        it('should throw when the Future is still pending', function () {
            expect(function () {
                future.yieldSync();
            }).to.throw('Cannot synchronously yield a pending Future - did you mean to chain with .next(...)?');
        });
    });
});
