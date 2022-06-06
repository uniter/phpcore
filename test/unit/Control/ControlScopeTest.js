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
    ControlScope = require('../../../src/Control/ControlScope'),
    Coroutine = require('../../../src/Control/Coroutine'),
    CoroutineFactory = require('../../../src/Control/CoroutineFactory'),
    Exception = phpCommon.Exception,
    Pause = require('../../../src/Control/Pause');

describe('ControlScope', function () {
    var controlScope,
        coroutineFactory,
        createdCoroutine,
        state;

    beforeEach(function () {
        state = tools.createIsolatedState();
        coroutineFactory = sinon.createStubInstance(CoroutineFactory);
        createdCoroutine = null;

        coroutineFactory.createCoroutine.callsFake(function () {
            createdCoroutine = sinon.createStubInstance(Coroutine);

            return createdCoroutine;
        });

        controlScope = new ControlScope();
        controlScope.setCoroutineFactory(coroutineFactory);
    });

    describe('enterCoroutine()', function () {
        describe('when there is no current Coroutine', function () {
            it('should enter a new Coroutine', function () {
                var coroutine = controlScope.enterCoroutine();

                expect(coroutineFactory.createCoroutine).to.have.been.calledOnce;
                expect(controlScope.getCoroutine()).to.equal(createdCoroutine);
                expect(coroutine).to.equal(createdCoroutine);
            });
        });

        describe('when there is a current Coroutine', function () {
            var previousCoroutine;

            beforeEach(function () {
                previousCoroutine = controlScope.enterCoroutine();

                coroutineFactory.createCoroutine.resetHistory();
            });

            it('should enter a new Coroutine', function () {
                var coroutine = controlScope.enterCoroutine();

                expect(coroutineFactory.createCoroutine).to.have.been.calledOnce;
                expect(controlScope.getCoroutine()).to.equal(createdCoroutine);
                expect(coroutine).to.equal(createdCoroutine);
            });

            it('should suspend the previous Coroutine', function () {
                controlScope.enterCoroutine();

                expect(previousCoroutine.suspend).to.have.been.calledOnce;
            });
        });

        describe('when the next Coroutine has been marked for nesting', function () {
            var doCreateAndNest,
                previousCoroutine;

            beforeEach(function () {
                doCreateAndNest = function () {
                    previousCoroutine = controlScope.enterCoroutine();
                    coroutineFactory.createCoroutine.resetHistory();

                    controlScope.nestCoroutine();
                };
            });

            it('should not create a new Coroutine', function () {
                doCreateAndNest();

                controlScope.enterCoroutine();

                expect(coroutineFactory.createCoroutine).not.to.have.been.called;
            });

            it('should keep the previous Coroutine as current', function () {
                doCreateAndNest();

                controlScope.enterCoroutine();

                expect(controlScope.getCoroutine()).to.equal(previousCoroutine);
            });

            it('should return the previous Coroutine', function () {
                doCreateAndNest();

                expect(controlScope.enterCoroutine()).to.equal(previousCoroutine);
            });

            it('should throw when there is no current Coroutine', function () {
                controlScope.nestCoroutine();

                expect(function () {
                    controlScope.enterCoroutine();
                }).to.throw(
                    Exception,
                    'ControlScope.enterCoroutine() :: Unable to nest - no coroutine is active'
                );
            });
        });
    });

    describe('getCoroutine()', function () {
        it('should return the current Coroutine', function () {
            var coroutine = controlScope.enterCoroutine();

            expect(controlScope.getCoroutine()).to.equal(coroutine);
        });

        it('should raise an Exception when there is no current Coroutine', function () {
            expect(function () {
                controlScope.getCoroutine();
            }).to.throw(
                Exception,
                'ControlScope.getCoroutine() :: Invalid state - no coroutine is active'
            );
        });
    });

    describe('inCoroutine()', function () {
        it('should return true when there is a current Coroutine', function () {
            controlScope.enterCoroutine();

            expect(controlScope.inCoroutine()).to.be.true;
        });

        it('should return false when there is no current Coroutine', function () {
            expect(controlScope.inCoroutine()).to.be.false;
        });
    });

    describe('isNestingCoroutine()', function () {
        it('should return true when nesting the next Coroutine', function () {
            controlScope.nestCoroutine();

            expect(controlScope.isNestingCoroutine()).to.be.true;
        });

        it('should return false when not nesting the next Coroutine', function () {
            expect(controlScope.isNestingCoroutine()).to.be.false;
        });
    });

    describe('isPausing()', function () {
        var pause;

        beforeEach(function () {
            pause = sinon.createStubInstance(Pause);
        });

        it('should return true when there is a Pause taking effect', function () {
            controlScope.markPausing(pause);

            expect(controlScope.isPausing()).to.be.true;
        });

        it('should return false when there is no Pause taking effect', function () {
            expect(controlScope.isPausing()).to.be.false;
        });
    });

    describe('markPaused()', function () {
        var pause;

        beforeEach(function () {
            pause = sinon.createStubInstance(Pause);
        });

        it('should throw when no Pause is taking effect', function () {
            expect(function () {
                controlScope.markPaused(pause);
            }).to.throw(
                Exception,
                'ControlScope.markPaused() :: Invalid state - no pause is currently taking effect'
            );
        });

        it('should throw when a different Pause is taking effect', function () {
            controlScope.markPausing(sinon.createStubInstance(Pause));

            expect(function () {
                controlScope.markPaused(pause);
            }).to.throw(
                Exception,
                'ControlScope.markPaused() :: Invalid state - wrong pause'
            );
        });
    });

    describe('markPausing()', function () {
        var pause;

        beforeEach(function () {
            pause = sinon.createStubInstance(Pause);
        });

        it('should set the given Pause as currently taking effect', function () {
            controlScope.markPausing(pause);

            expect(controlScope.isPausing()).to.be.true;
        });

        it('should throw when a Pause is already taking effect', function () {
            controlScope.markPausing(sinon.createStubInstance(Pause));

            expect(function () {
                controlScope.markPausing(pause);
            }).to.throw(
                Exception,
                'ControlScope.markPausing() :: Invalid state - a pause is already taking effect'
            );
        });
    });

    describe('nestCoroutine()', function () {
        it('should throw when the next Coroutine has already been marked for nesting', function () {
            controlScope.nestCoroutine();

            expect(function () {
                controlScope.nestCoroutine();
            }).to.throw(
                Exception,
                'ControlScope.nestCoroutine() :: Invalid state - already marked for nesting'
            );
        });
    });

    describe('resumeCoroutine()', function () {
        var coroutine;

        beforeEach(function () {
            coroutine = sinon.createStubInstance(Coroutine);
        });

        describe('when there is no current Coroutine', function () {
            it('should resume the given Coroutine', function () {
                controlScope.resumeCoroutine(coroutine);

                expect(coroutine.resume).to.have.been.calledOnce;
            });

            it('should set the given Coroutine as current', function () {
                controlScope.resumeCoroutine(coroutine);

                expect(controlScope.getCoroutine()).to.equal(coroutine);
            });
        });

        describe('when there is a current Coroutine', function () {
            var previousCoroutine;

            beforeEach(function () {
                previousCoroutine = controlScope.enterCoroutine();
            });

            it('should suspend the previous Coroutine', function () {
                controlScope.resumeCoroutine(coroutine);

                expect(previousCoroutine.suspend).to.have.been.calledOnce;
            });

            it('should resume the given Coroutine', function () {
                controlScope.resumeCoroutine(coroutine);

                expect(coroutine.resume).to.have.been.calledOnce;
            });

            it('should resume the given Coroutine after suspending the previous one', function () {
                controlScope.resumeCoroutine(coroutine);

                expect(coroutine.resume).to.have.been.calledAfter(previousCoroutine.suspend);
            });

            it('should set the given coroutine as current', function () {
                controlScope.resumeCoroutine(coroutine);

                expect(controlScope.getCoroutine()).to.equal(coroutine);
            });
        });

        it('should throw when a Pause is currently taking effect', function () {
            var pause = sinon.createStubInstance(Pause);
            controlScope.markPausing(pause);

            expect(function () {
                controlScope.resumeCoroutine(coroutine);
            }).to.throw(
                Exception,
                'ControlScope.resumeCoroutine() :: Invalid state - a pause is currently taking effect'
            );
        });
    });
});
