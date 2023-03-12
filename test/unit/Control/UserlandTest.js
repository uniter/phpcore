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
    CallStack = require('../../../src/CallStack'),
    ControlScope = require('../../../src/Control/ControlScope'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    OpcodePool = require('../../../src/Core/Opcode/Opcode/OpcodePool'),
    Pause = require('../../../src/Control/Pause'),
    Trace = require('../../../src/Control/Trace'),
    Userland = require('../../../src/Control/Userland');

describe('Userland', function () {
    var call,
        callStack,
        controlBridge,
        controlFactory,
        controlScope,
        createUserland,
        flow,
        futureFactory,
        opcodePool,
        pauseFactory,
        state,
        userland,
        valueFactory,
        variable,
        variableFactory;

    beforeEach(function () {
        // Stubbed below.
        call = null;
        callStack = null;
        state = null;
        controlBridge = null;
        controlFactory = null;
        controlScope = null;
        flow = null;
        futureFactory = null;
        opcodePool = null;
        pauseFactory = null;
        valueFactory = null;
        variable = null;
        userland = null;

        createUserland = function (mode) {
            call = sinon.createStubInstance(Call);
            callStack = sinon.createStubInstance(CallStack);
            controlScope = sinon.createStubInstance(ControlScope);
            state = tools.createIsolatedState(mode, {
                'call_stack': callStack,
                'control_scope': controlScope
            });
            controlBridge = state.getControlBridge();
            controlFactory = state.getControlFactory();
            flow = state.getFlow();
            futureFactory = state.getFutureFactory();
            opcodePool = sinon.createStubInstance(OpcodePool);
            pauseFactory = state.getPauseFactory();
            valueFactory = state.getValueFactory();
            variableFactory = state.getService('variable_factory');
            variable = variableFactory.createVariable('my_var');

            callStack.getCurrent.returns(call);

            userland = new Userland(
                callStack,
                controlFactory,
                controlBridge,
                controlScope,
                flow,
                valueFactory,
                opcodePool,
                mode || 'sync'
            );
        };
    });

    describe('enterIsolated()', function () {
        describe('in async mode', function () {
            beforeEach(function () {
                createUserland('async');
            });

            it('should return the result of the executor coerced to a Value on success', async function () {
                var resultValue;
                variable.setValue(valueFactory.createString('my result'));

                resultValue = await userland.enterIsolated(function () {
                    return variable;
                }).toPromise();

                expect(resultValue.getNative()).to.equal('my result');
            });

            it('should not catch errors on failure', function () {
                return expect(
                    userland.enterIsolated(function () {
                        throw new Error('Bang!');
                    }).toPromise()
                ).to.eventually.be.rejectedWith('Bang!');
            });

            it('should return the eventual result coerced to a Value if a pause is raised and resumed', async function () {
                var paused = false,
                    resultValue;
                variable.setValue(valueFactory.createString('my result'));

                resultValue = await userland.enterIsolated(function () {
                    var pause;

                    if (paused) {
                        // Simulate a successful userland PHP resume.
                        return callStack.resume.args[0][0];
                    }

                    pause = pauseFactory.createPause(function (resume) {
                        setImmediate(function () {
                            resume(variable);
                        });
                    });

                    paused = true;
                    pause.now();
                }).toPromise();

                expect(resultValue.getNative()).to.equal('my result');
            });

            it('should mark a captured pause as paused in the ControlScope', async function () {
                var pause = null;
                variable.setValue(valueFactory.createString('my result'));

                await userland.enterIsolated(function () {
                    if (pause) {
                        // Simulate a successful userland PHP resume.
                        return callStack.resume.args[0][0];
                    }

                    pause = pauseFactory.createPause(function (resume) {
                        setImmediate(function () {
                            resume(variable);
                        });
                    });

                    pause.now();
                }).toPromise();

                expect(pause).to.be.an.instanceOf(Pause);
                expect(controlScope.markPaused).to.have.been.calledOnce;
                expect(controlScope.markPaused).to.have.been.calledWith(sinon.match.same(pause));
            });

            it('should enter a NamespaceScope when given before calling the executor', async function () {
                var executor = sinon.stub(),
                    namespaceScope = sinon.createStubInstance(NamespaceScope);

                await userland.enterIsolated(executor, namespaceScope).toPromise();

                expect(namespaceScope.enter).to.have.been.calledBefore(executor);
            });

            it('should leave a NamespaceScope when given after calling the executor', async function () {
                var executor = sinon.stub(),
                    namespaceScope = sinon.createStubInstance(NamespaceScope);

                await userland.enterIsolated(executor, namespaceScope).toPromise();

                expect(namespaceScope.leave).to.have.been.calledAfter(executor);
            });

            it('should set an isolated Trace on the current call before calling the executor', async function () {
                var originalTrace = sinon.createStubInstance(Trace),
                    executor = sinon.stub(function () {
                        expect(call.getTrace()).not.to.equal(originalTrace);
                    });
                call.setTrace.callsFake(function (newTrace) {
                    var currentTrace = call.getTrace();
                    call.getTrace.returns(newTrace);
                    return currentTrace;
                });
                call.getTrace.returns(originalTrace);

                await userland.enterIsolated(executor).toPromise();

                expect(call.setTrace).to.have.been.calledBefore(executor);
            });

            it('should restore the original Trace on the current call after calling the executor', async function () {
                var originalTrace = sinon.createStubInstance(Trace),
                    executor = sinon.stub();
                call.setTrace.callsFake(function (newTrace) {
                    var currentTrace = call.getTrace();
                    call.getTrace.returns(newTrace);
                    return currentTrace;
                });
                call.getTrace.returns(originalTrace);

                await userland.enterIsolated(executor).toPromise();

                expect(call.setTrace).to.have.been.calledAfter(executor);
                expect(call.getTrace()).to.equal(originalTrace);
            });

            it('should reject with the eventual error if a pause is raised and thrown into with an error', function () {
                var paused = false;

                return expect(
                    userland.enterIsolated(function () {
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
                    }).toPromise()
                ).to.eventually.be.rejectedWith('my error');
            });

            it('should reject with the eventual error if a pause is raised and thrown into with a future that eventually rejects', function () {
                var paused = false;

                return expect(
                    userland.enterIsolated(function () {
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
                    }).toPromise()
                ).to.eventually.be.rejectedWith('my error');
            });
        });

        describe('in sync mode', function () {
            beforeEach(function () {
                createUserland('sync');
            });

            it('should return the result of the executor on success', function () {
                var resultValue;
                variable.setValue(valueFactory.createString('my result'));

                resultValue = userland.enterIsolated(function () {
                    return variable;
                });

                expect(resultValue.getNative()).to.equal('my result');
            });

            it('should enter a NamespaceScope when given before calling the executor', function () {
                var executor = sinon.stub(),
                    namespaceScope = sinon.createStubInstance(NamespaceScope);

                userland.enterIsolated(executor, namespaceScope);

                expect(namespaceScope.enter).to.have.been.calledBefore(executor);
            });

            it('should leave a NamespaceScope when given after calling the executor', function () {
                var executor = sinon.stub(),
                    namespaceScope = sinon.createStubInstance(NamespaceScope);

                userland.enterIsolated(executor, namespaceScope);

                expect(namespaceScope.leave).to.have.been.calledAfter(executor);
            });

            it('should wrap errors in a rejected Future on failure', async function () {
                await expect(
                    userland.enterIsolated(function () {
                        throw new Error('Bang!');
                    })
                        .toPromise()
                ).to.eventually.be.rejectedWith('Bang!');
            });
        });
    });

    describe('enterTopLevel()', function () {
        describe('in async mode', function () {
            beforeEach(function () {
                createUserland('async');
            });

            it('should return the result of the executor on success', async function () {
                var resultValue;
                variable.setValue(valueFactory.createString('my result'));

                resultValue = await userland.enterTopLevel(function () {
                    return variable;
                });

                expect(resultValue.getNative()).to.equal('my result');
            });

            it('should not catch errors on failure', function () {
                return expect(
                    userland.enterTopLevel(function () {
                        throw new Error('Bang!');
                    })
                ).to.eventually.be.rejectedWith('Bang!');
            });

            it('should return the eventual result if a pause is raised and resumed', async function () {
                var paused = false,
                    resultValue;
                variable.setValue(valueFactory.createString('my result'));

                resultValue = await userland.enterTopLevel(function () {
                    var pause;

                    if (paused) {
                        // Simulate a successful userland PHP resume.
                        return callStack.resume.args[0][0];
                    }

                    pause = pauseFactory.createPause(function (resume) {
                        setImmediate(function () {
                            resume(variable);
                        });
                    });

                    paused = true;
                    pause.now();
                });

                expect(resultValue.getNative()).to.equal('my result');
            });

            it('should mark a captured pause as paused in the ControlScope', async function () {
                var pause = null;
                variable.setValue(valueFactory.createString('my result'));

                await userland.enterTopLevel(function () {
                    if (pause) {
                        // Simulate a successful userland PHP resume.
                        return callStack.resume.args[0][0];
                    }

                    pause = pauseFactory.createPause(function (resume) {
                        setImmediate(function () {
                            resume(variable);
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
                var resultValue;
                variable.setValue(valueFactory.createString('my result'));

                resultValue = userland.enterTopLevel(function () {
                    return variable;
                });

                expect(resultValue.getNative()).to.equal('my result');
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
