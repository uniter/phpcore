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
    CallStack = require('../../../src/CallStack'),
    ControlScope = require('../../../src/Control/ControlScope'),
    Exception = phpCommon.Exception,
    Pause = require('../../../src/Control/Pause');

describe('Pause', function () {
    var callStack,
        controlScope,
        enactPause,
        future,
        futureFactory,
        pause,
        rejectFuture,
        resolveFuture,
        resumePause,
        state,
        throwIntoPause,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        controlScope = sinon.createStubInstance(ControlScope);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack,
            'control_scope': controlScope
        });
        futureFactory = state.getFutureFactory();
        future = futureFactory.createFuture(function (resolve, reject) {
            resolveFuture = resolve;
            rejectFuture = reject;
        });
        valueFactory = state.getValueFactory();

        enactPause = function () {
            try {
                pause.now();
            } catch (error) {
                // Rethrow any error other than the pause itself.
                if (error !== pause) {
                    throw error;
                }
            }
        };

        pause = new Pause(
            callStack,
            controlScope,
            future,
            resolveFuture,
            rejectFuture,
            function (resume, throwInto) {
                resumePause = resume;
                throwIntoPause = throwInto;
            }
        );
    });

    describe('catch()', function () {
        it('should attach a handler to be called in a microtask if the Pause is thrown-into', function (done) {
            var error = new Error('Bang!'),
                handler = sinon.stub();
            enactPause();
            pause.catch(handler);

            pause.next(function () {
                expect(handler).to.have.been.calledOnce;
                expect(handler).to.have.been.calledWith(sinon.match.same(error));
                done();
            }).catch(done);

            throwIntoPause(error);
        });
    });

    describe('the executor', function () {
        describe('resume()', function () {
            it('should not call resolve handlers synchronously', function () {
                var handler = sinon.stub();
                enactPause();
                pause.next(handler);

                resumePause('my result');

                expect(handler).not.to.have.been.called;
            });
        });

        describe('throwInto()', function () {
            it('should not call rejection handlers synchronously', function () {
                var handler = sinon.stub();
                enactPause();
                pause.catch(handler);

                throwIntoPause(new Error('Bang!'));

                expect(handler).not.to.have.been.called;
            });
        });
    });

    describe('next()', function () {
        it('should maintain handlers in the order they were attached', function (done) {
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
            enactPause();

            resumePause('initial_result');
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
            enactPause();

            resumePause('initial_result');
        });
    });

    describe('now()', function () {
        it('should throw the Pause', function () {
            expect(function () {
                pause.now();
            }).to.throw(pause);
        });

        it('should raise an error if the Pause has already been enacted', function () {
            enactPause();

            expect(function () {
                pause.now();
            }).to.throw(Exception, 'Pause has already been enacted');
        });

        it('should mark the Pause as in progress via the ControlScope', function () {
            enactPause();

            expect(controlScope.markPausing).to.have.been.calledOnce;
            expect(controlScope.markPausing).to.have.been.calledWith(sinon.match.same(pause));
        });
    });
});
