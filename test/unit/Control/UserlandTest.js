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
    ControlScope = require('../../../src/Control/ControlScope'),
    OpcodePool = require('../../../src/Core/Opcode/Opcode/OpcodePool'),
    Pause = require('../../../src/Control/Pause'),
    Userland = require('../../../src/Control/Userland');

describe('Userland', function () {
    var callStack,
        controlBridge,
        controlScope,
        createUserland,
        futureFactory,
        opcodePool,
        pauseFactory,
        state,
        userland,
        valueFactory;

    beforeEach(function () {
        // Stubbed below.
        callStack = null;
        state = null;
        controlBridge = null;
        controlScope = null;
        futureFactory = null;
        opcodePool = null;
        pauseFactory = null;
        valueFactory = null;
        userland = null;

        createUserland = function (mode) {
            callStack = sinon.createStubInstance(CallStack);
            controlScope = sinon.createStubInstance(ControlScope);
            state = tools.createIsolatedState(mode, {
                'call_stack': callStack,
                'control_scope': controlScope
            });
            controlBridge = state.getControlBridge();
            futureFactory = state.getFutureFactory();
            opcodePool = sinon.createStubInstance(OpcodePool);
            pauseFactory = state.getPauseFactory();
            valueFactory = state.getValueFactory();

            userland = new Userland(
                callStack,
                controlBridge,
                controlScope,
                valueFactory,
                opcodePool,
                mode || 'sync'
            );
        };
    });

    describe('enterTopLevel()', function () {
        describe('in async mode', function () {
            beforeEach(function () {
                createUserland('async');
            });

            it('should return the result of the executor on success', async function () {
                expect(
                    await userland.enterTopLevel(function () {
                        return 'my result';
                    })
                ).to.equal('my result');
            });

            it('should not catch errors on failure', function () {
                return expect(
                    userland.enterTopLevel(function () {
                        throw new Error('Bang!');
                    })
                ).to.eventually.be.rejectedWith('Bang!');
            });

            it('should return the eventual result if a pause is raised and resumed', async function () {
                var paused = false;

                expect(
                    await userland.enterTopLevel(function () {
                        var pause;

                        if (paused) {
                            // Simulate a successful userland PHP resume.
                            return callStack.resume.args[0][0];
                        }

                        pause = pauseFactory.createPause(function (resume) {
                            setImmediate(function () {
                                resume('my result');
                            });
                        });

                        paused = true;
                        pause.now();
                    })
                ).to.equal('my result');
            });

            it('should mark a captured pause as paused in the ControlScope', async function () {
                var pause = null;

                await userland.enterTopLevel(function () {
                    if (pause) {
                        // Simulate a successful userland PHP resume.
                        return callStack.resume.args[0][0];
                    }

                    pause = pauseFactory.createPause(function (resume) {
                        setImmediate(function () {
                            resume('my result');
                        });
                    });

                    pause.now();
                });

                expect(pause).to.be.an.instanceOf(Pause);
                expect(controlScope.markPaused).to.have.been.calledOnce;
                expect(controlScope.markPaused).to.have.been.calledWith(sinon.match.same(pause));
            });

            it('should reject with the eventual error if a pause is raised and thrown into with an error', function () {
                var paused = false;

                return expect(
                    userland.enterTopLevel(function () {
                        var pause;

                        if (paused) {
                            // Simulate a successful userland PHP throwInto.
                            throw callStack.throwInto.args[0][0];
                        }

                        pause = pauseFactory.createPause(function (resume, throwInto) {
                            setImmediate(function () {
                                throwInto(new Error('my error'));
                            });
                        });

                        paused = true;
                        pause.now();
                    })
                ).to.eventually.be.rejectedWith('my error');
            });

            it('should reject with the eventual error if a pause is raised and thrown into with a future that eventually rejects', function () {
                var paused = false;

                return expect(
                    userland.enterTopLevel(function () {
                        var pause;

                        if (paused) {
                            // Simulate a successful userland PHP throwInto.
                            throw futureFactory.createRejection(callStack.throwInto.args[0][0]);
                        }

                        pause = pauseFactory.createPause(function (resume, throwInto) {
                            setImmediate(function () {
                                throwInto(futureFactory.createRejection(new Error('my error')));
                            });
                        });

                        paused = true;
                        pause.now();
                    })
                ).to.eventually.be.rejectedWith('my error');
            });
        });

        describe('in sync mode', function () {
            beforeEach(function () {
                createUserland('sync');
            });

            it('should return the result of the executor on success', function () {
                expect(userland.enterTopLevel(function () {
                    return 'my result';
                })).to.equal('my result');
            });

            it('should not catch errors on failure', function () {
                expect(function () {
                    userland.enterTopLevel(function () {
                        throw new Error('Bang!');
                    });
                }).to.throw('Bang!');
            });
        });
    });
});
