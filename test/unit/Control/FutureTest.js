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
    Future = require('../../../src/Control/Future'),
    Pause = require('../../../src/Control/Pause');

describe('Future', function () {
    var callStack,
        controlBridge,
        future,
        futureFactory,
        parent,
        pauseFactory,
        rejectFuture,
        resolveFuture,
        state,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        controlBridge = state.getControlBridge();
        futureFactory = state.getFutureFactory();
        parent = sinon.createStubInstance(Future);
        pauseFactory = state.getPauseFactory();
        valueFactory = state.getValueFactory();

        future = new Future(
            futureFactory,
            pauseFactory,
            valueFactory,
            controlBridge,
            function (resolve, reject) {
                rejectFuture = reject;
                resolveFuture = resolve;
            },
            parent
        );
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
