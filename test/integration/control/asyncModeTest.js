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
    Call = require('../../../src/Call');

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

    it('should support running a Sequence synchronously with multiple resume handlers', function () {
        var sequence = controlFactory.createSequence();

        sequence.next(function (previous) {
            return previous + ' second';
        });
        sequence.next(function (previous) {
            return previous + ' third';
        });

        expect(sequence.resume('first').yieldSync()).to.equal('first second third');
    });

    it('should support running a Sequence synchronously with a resume handler that returns another Sequence to chain', function () {
        var sequence = controlFactory.createSequence();

        sequence.next(function (previous) {
            var subSequence = controlFactory.createSequence();

            subSequence.next(function (subPrevious) {
                return 'inner(' + previous + ', ' + subPrevious + ')';
            });
            subSequence.resume('sub');

            return subSequence;
        });
        sequence.next(function (previous) {
            return 'outer(' + previous + ')';
        });

        expect(sequence.resume('initial').yieldSync()).to.equal('outer(inner(initial, sub))');
    });

    it('should support running a Sequence synchronously with multiple handlers and a throw that is rethrown', function (done) {
        var log = [],
            sequence = controlFactory.createSequence();

        sequence.next(function (previous) {
            log.push('[first resume]: ' + previous);

            return previous + ' resume1';
        });
        sequence.next(function (previous) {
            log.push('[second resume]: ' + previous);

            throw new Error('resume2: My error with: ' + previous);
        });
        sequence.next(function (previous) {
            log.push('[third resume - I should not be reached!]');

            return previous + ' resume3';
        }, function (error) {
            log.push('[third throw]: ' + error);

            throw error;
        });

        sequence.resume('first').next(function (result) {
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

    it('should support running a Sequence asynchronously with multiple resume handlers returning Futures that resolve', function (done) {
        var sequence = controlFactory.createSequence();

        sequence.next(function (previous) {
            return futureFactory.createFuture(function (resolve) {
                setImmediate(function () {
                    resolve(previous + ' second');
                });
            });
        });
        sequence.next(function (previous) {
            return futureFactory.createFuture(function (resolve) {
                setImmediate(function () {
                    resolve(previous + ' third');
                });
            });
        });

        sequence.resume('first').next(function (result) {
            expect(result).to.equal('first second third');
            done();
        }).catch(done);
    });

    it('should support running a Sequence asynchronously with multiple resume handlers returning Futures that resolve and reject', function (done) {
        var sequence = controlFactory.createSequence();

        sequence.next(function (previous) {
            return futureFactory.createFuture(function (resolve) {
                setImmediate(function () {
                    resolve(previous + ' second');
                });
            });
        });
        sequence.next(function (previous) {
            return futureFactory.createFuture(function (resolve, reject) {
                setImmediate(function () {
                    reject(new Error('Bang! ' + previous + ' third'));
                });
            });
        });

        sequence.resume('first').next(function (result) {
            done('Unexpected success: ' + result);
        }, function (error) {
            expect(error.message).to.equal('Bang! first second third');
            done();
        }).catch(done);
    });

    it('should support running a Sequence asynchronously with a resume handler that returns another Sequence resumed asynchronously to chain', function (done) {
        var sequence = controlFactory.createSequence();

        sequence.next(function (previous) {
            var subSequence = controlFactory.createSequence();

            subSequence.next(function (subPrevious) {
                return 'inner(' + previous + ', ' + subPrevious + ')';
            });
            // Delay before resuming the inner sequence
            setImmediate(function () {
                subSequence.resume('sub');
            });

            return subSequence;
        });
        sequence.next(function (previous) {
            return 'outer(' + previous + ')';
        });

        sequence.resume('initial').next(function (result) {
            expect(result).to.equal('outer(inner(initial, sub))');
            done();
        }).catch(done);
    });

    it('should return the eventual result from .yieldSync() when synchronously completed with a result', function () {
        var sequence = controlFactory.createSequence();

        sequence.next(function (previous) {
            return previous + ' is my result';
        });

        expect(sequence.resume('this').yieldSync()).to.equal('this is my result');
    });

    it('should throw the eventual error from .yieldSync() when synchronously completed with an error', function () {
        var sequence = controlFactory.createSequence();

        sequence.next(function (previous) {
            throw new Error('My error is: ' + previous);
        });

        expect(function () {
            sequence.resume('from here').yieldSync();
        }).to.throw('My error is: from here');
    });

    it('should synchronously execute further synchronous handlers attached after .yieldSync()', function () {
        var sequence = controlFactory.createSequence();

        sequence.next(function (previous) {
            return previous + ' first';
        });
        sequence
            .resume('this')
            .yieldSync();
        sequence.next(function (previous) {
            return previous + ' second';
        });

        expect(sequence.yieldSync()).to.equal('this first second');
    });

    it('should throw when attempting to add an async handler (returning Future) after .yieldSync()', function () {
        var sequence = controlFactory.createSequence();

        sequence.next(function (previous) {
            return previous + ' first';
        });
        sequence
            .resume('this')
            .yieldSync();
        sequence.next(function (previous) {
            return futureFactory.createFuture(function (resolve) {
                setImmediate(function () {
                    resolve(previous + ', async');
                });
            });
        });

        expect(function () {
            sequence.yieldSync();
        }).to.throw(
            'Unable to yield a sequence that has not completed - did you mean to chain with .next(...)?'
        );
    });

    it('should support resuming a completed Sequence when another Sequence is returned', function (done) {
        var innerSequence,
            sequence = controlFactory.createSequence();

        sequence.next(function (result) {
            return result + ', completed';
        });
        sequence.resume('start');
        sequence.next(function (outerResult) {
            innerSequence = controlFactory.createSequence();

            innerSequence.next(function (innerResult) {
                return outerResult + innerResult + ', reopened';
            });

            return innerSequence;
        });
        // Defer the resume of the inner Sequence to check that the entire sequence is delayed asynchronously
        setImmediate(function () {
            innerSequence.resume(', resumed');
        });
        sequence.next(function (result) {
            return result + ', last';
        });

        sequence.next(function (result) {
            expect(result).to.equal('start, completed, resumed, reopened, last');
            done();
        }).catch(done);
    });

    it('should support resuming a completed Sequence when a Future is returned', function (done) {
        var sequence = controlFactory.createSequence();

        sequence.next(function (result) {
            return result + ', completed';
        });
        sequence.resume('start');
        sequence.next(function (result) {
            return futureFactory.createFuture(function (resolve) {
                setImmediate(function () {
                    resolve(result + ', reopened');
                });
            });
        });
        sequence.next(function (result) {
            return result + ', last';
        });

        sequence.next(function (result) {
            expect(result).to.equal('start, completed, reopened, last');
            done();
        }).catch(done);
    });
});
