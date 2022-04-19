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
    Call = require('../../../src/Call'),
    Pause = require('../../../src/Control/Pause');

describe('Async control integration', function () {
    var call,
        callStack,
        controlFactory,
        environment,
        futureFactory,
        state;

    beforeEach(function () {
        environment = tools.createAsyncEnvironment();
        state = environment.getState();
        callStack = state.getCallStack();
        controlFactory = state.getControlFactory();
        futureFactory = state.getFutureFactory();

        call = sinon.createStubInstance(Call);
        callStack.push(call);
    });

    it('should support running a sequence synchronously with multiple resolve handlers', function () {
        var doResolve,
            future = futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            });

        future = future.next(function (previous) {
            return previous + ' second';
        });
        future = future.next(function (previous) {
            return previous + ' third';
        });
        doResolve('first');

        expect(future.yieldSync()).to.equal('first second third');
    });

    it('should support running a sequence synchronously with a resume handler that returns another Future to chain', function () {
        var doResolve,
            future = futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            });

        future = future.next(function (previous) {
            var doSubResolve,
                subFuture = futureFactory.createFuture(function (resolve) {
                    doSubResolve = resolve;
                });

            subFuture = subFuture.next(function (subPrevious) {
                return 'inner(' + previous + ', ' + subPrevious + ')';
            });
            doSubResolve('sub');

            return subFuture;
        });
        future = future.next(function (previous) {
            return 'outer(' + previous + ')';
        });
        doResolve('initial');

        expect(future.yieldSync()).to.equal('outer(inner(initial, sub))');
    });

    it('should support running a sequence synchronously with multiple handlers and a throw that is rethrown', function (done) {
        var doResolve,
            future = futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            }),
            log = [];

        future = future.next(function (previous) {
            log.push('[first resume]: ' + previous);

            return previous + ' resume1';
        });
        future = future.next(function (previous) {
            log.push('[second resume]: ' + previous);

            throw new Error('resume2: My error with: ' + previous);
        });
        future = future.next(function (previous) {
            log.push('[third resume - I should not be reached!]');

            return previous + ' resume3';
        }, function (error) {
            log.push('[third throw]: ' + error);

            throw error;
        });
        doResolve('first');

        future.next(function (result) {
            done('Unexpected success: ' + result);
        }, function (error) {
            expect(error.message).to.equal('resume2: My error with: first resume1');
            expect(log).to.deep.equal([
                '[first resume]: first',
                '[second resume]: first resume1',
                '[third throw]: Error: resume2: My error with: first resume1'
            ]);
            done();
        }).catch(done);
    });

    it('should support running a sequence asynchronously with multiple resolve handlers returning Futures that resolve', function (done) {
        var doResolve,
            future = futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            });

        future = future.next(function (previous) {
            return futureFactory.createFuture(function (resolve) {
                setImmediate(function () {
                    resolve(previous + ' second');
                });
            });
        });
        future = future.next(function (previous) {
            return futureFactory.createFuture(function (resolve) {
                setImmediate(function () {
                    resolve(previous + ' third');
                });
            });
        });
        doResolve('first');

        future.next(function (result) {
            expect(result).to.equal('first second third');
            done();
        }).catch(done);
    });

    it('should support running a sequence asynchronously with multiple resolve handlers returning Futures that resolve and reject', function (done) {
        var doResolve,
            future = futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            });

        future = future.next(function (previous) {
            return futureFactory.createFuture(function (resolve) {
                setImmediate(function () {
                    resolve(previous + ' second');
                });
            });
        });
        future = future.next(function (previous) {
            return futureFactory.createFuture(function (resolve, reject) {
                setImmediate(function () {
                    reject(new Error('Bang! ' + previous + ' third'));
                });
            });
        });
        doResolve('first');

        future.next(function (result) {
            done('Unexpected success: ' + result);
        }, function (error) {
            expect(error.message).to.equal('Bang! first second third');
            done();
        }).catch(done);
    });

    it('should support running a sequence asynchronously with a resume handler that returns another Future resolved asynchronously to chain', function (done) {
        var doResolve,
            future = futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            });

        future = future.next(function (previous) {
            var doSubResolve,
                subFuture = futureFactory.createFuture(function (resolve) {
                    doSubResolve = resolve;
                });

            subFuture = subFuture.next(function (subPrevious) {
                return 'inner(' + previous + ', ' + subPrevious + ')';
            });
            // Delay before resuming the inner future.
            setImmediate(function () {
                doSubResolve('sub');
            });

            return subFuture;
        });
        future = future.next(function (previous) {
            return 'outer(' + previous + ')';
        });
        doResolve('initial');

        future.next(function (result) {
            expect(result).to.equal('outer(inner(initial, sub))');
            done();
        }).catch(done);
    });

    it('should reject a Future with the eventual error when rejected with another Future', function () {
        var future = futureFactory.createFuture(function (resolve, reject) {
            reject(futureFactory.createRejection(new Error('My error from future')));
        });

        return expect(future.toPromise()).to.eventually.be.rejectedWith('My error from future');
    });

    it('should reject a Future with the eventual error when rejected with a Future that rejects', function () {
        var future = futureFactory.createFuture(function (resolve, reject) {
            var doSubReject,
                subFuture = futureFactory.createFuture(function (resolve, reject) {
                    doSubReject = reject;
                });

            setImmediate(function () {
                doSubReject(new Error('My error from inner future'));
            });

            reject(subFuture);
        });

        return expect(future.toPromise()).to.eventually.be.rejectedWith('My error from inner future');
    });

    it('should return the eventual result from .yieldSync() when synchronously resolved with a result', function () {
        var doResolve,
            future = futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            });

        future = future.next(function (previous) {
            return previous + ' is my result';
        });
        doResolve('this');

        expect(future.yieldSync()).to.equal('this is my result');
    });

    it('should throw the eventual error from .yieldSync() when synchronously completed with an error', function () {
        var doResolve,
            future = futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            });

        future = future.next(function (previous) {
            throw new Error('My error is: ' + previous);
        });

        expect(function () {
            doResolve('from here');
            future.yieldSync();
        }).to.throw('My error is: from here');
    });

    it('should synchronously execute further synchronous handlers attached after .yieldSync()', function () {
        var doResolve,
            future = futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            });

        future = future.next(function (previous) {
            return previous + ' first';
        });
        doResolve('this');
        future.yieldSync();
        future = future.next(function (previous) {
            return previous + ' second';
        });

        expect(future.yieldSync()).to.equal('this first second');
    });

    it('should throw when attempting to add an async handler (returning Future) after .yieldSync()', function () {
        var doResolve,
            future = futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            });

        future = future.next(function (previous) {
            return previous + ' first';
        });
        doResolve('this');
        future.yieldSync();
        future = future.next(function (previous) {
            return futureFactory.createFuture(function (resolve) {
                setImmediate(function () {
                    resolve(previous + ', async');
                });
            });
        });

        expect(function () {
            future.yieldSync();
        }).to.throw(
            'Cannot synchronously yield a pending Future - did you mean to chain with .next(...)?'
        );
    });

    it('should support resuming a completed sequence when another Future is returned', function (done) {
        var doResolve,
            doResolveInnerFuture,
            future = futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            });

        future = future.next(function (result) {
            return result + ', completed';
        });
        doResolve('start');
        future = future.next(function (outerResult) {
            var innerFuture = futureFactory.createFuture(function (resolve) {
                doResolveInnerFuture = resolve;
            });

            innerFuture = innerFuture.next(function (innerResult) {
                return outerResult + innerResult + ', reopened';
            });

            return innerFuture;
        });
        // Defer the resume of the inner Future to check that the entire sequence is delayed asynchronously.
        setImmediate(function () {
            doResolveInnerFuture(', resumed');
        });
        future = future.next(function (result) {
            return result + ', last';
        });

        future.next(function (result) {
            expect(result).to.equal('start, completed, resumed, reopened, last');
            done();
        }).catch(done);
    });

    describe('when timers are hooked', function () {
        var clock;

        beforeEach(function () {
            // Note that we deliberately don't call clock.tick() here,
            // as all we're after is to hook the timer functions.
            clock = sinon.useFakeTimers();
        });

        afterEach(function () {
            clock.restore();
        });

        // Ensure that Pause's use of setImmediate() cannot be hooked
        // after load, to avoid hangs during integration tests.
        it('should not affect resumption', function (done) {
            var doResolve,
                future = futureFactory.createFuture(function (resolve) {
                    doResolve = resolve;
                });
            try {
                future.yield();
            } catch (error) {
                if (!(error instanceof Pause)) {
                    throw new Error('Unexpected error: ' + error);
                }

                error.next(function () {
                    done();
                });
            }

            doResolve(21);
        });
    });
});
