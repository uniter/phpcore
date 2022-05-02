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
    CallStack = require('../../../../../src/CallStack'),
    ControlBridge = require('../../../../../src/Control/ControlBridge'),
    Exception = phpCommon.Exception,
    Future = require('../../../../../src/Control/Future'),
    OpcodeExecutor = require('../../../../../src/Core/Opcode/Handler/OpcodeExecutor'),
    OpcodeFetcherRepository = require('../../../../../src/Core/Opcode/Fetcher/OpcodeFetcherRepository'),
    OpcodeHandlerFactory = require('../../../../../src/Core/Opcode/Handler/OpcodeHandlerFactory'),
    OpcodeRescuer = require('../../../../../src/Core/Opcode/Handler/OpcodeRescuer'),
    Pause = require('../../../../../src/Control/Pause'),
    Trace = require('../../../../../src/Control/Trace');

describe('OpcodeHandlerFactory', function () {
    var callStack,
        controlBridge,
        factory,
        opcodeExecutor,
        opcodeFetcherRepository,
        opcodeRescuer,
        trace;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        controlBridge = sinon.createStubInstance(ControlBridge);
        opcodeExecutor = sinon.createStubInstance(OpcodeExecutor);
        opcodeFetcherRepository = sinon.createStubInstance(OpcodeFetcherRepository);
        opcodeRescuer = sinon.createStubInstance(OpcodeRescuer);
        trace = sinon.createStubInstance(Trace);

        callStack.getCurrentTrace.returns(trace);
        controlBridge.isFuture.returns(false);

        factory = new OpcodeHandlerFactory(
            controlBridge,
            callStack,
            opcodeFetcherRepository,
            opcodeExecutor,
            opcodeRescuer
        );
    });

    describe('createTracedHandler()', function () {
        var callCreate,
            opcode,
            opcodeFetcher,
            opcodeHandler,
            tracedOpcodeHandler;

        beforeEach(function () {
            opcode = {
                resume: sinon.stub().returns(null),
                traceResult: sinon.stub()
            };
            opcodeFetcher = {};
            opcodeHandler = sinon.stub();
            tracedOpcodeHandler = null;

            opcodeFetcherRepository.getFetcher
                .withArgs('my_fetcher_type')
                .returns(opcodeFetcher);

            trace.fetchOpcode
                .withArgs(
                    sinon.match.same(opcodeFetcher),
                    sinon.match.same(opcodeHandler),
                    ['arg 1', 'arg 2', undefined, undefined, undefined]
                )
                .returns(opcode);

            callCreate = function () {
                tracedOpcodeHandler = factory.createTracedHandler(opcodeHandler, 'my_fetcher_type');
            };
        });

        it('should throw when the arity limit is exceeded', function () {
            /* jshint unused:false */
            opcodeHandler = function (one, two, three, four, five, six) {};

            expect(function () {
                callCreate();
            }).to.throw(
                Exception,
                'Opcode handler arity of 6 exceeds max of 5'
            );
        });

        describe('the function returned', function () {
            describe('when resuming from a pause', function () {
                beforeEach(function () {
                    opcode.resume.returns('my resume result');
                });

                it('should return the resume value', function () {
                    callCreate();

                    expect(tracedOpcodeHandler('arg 1', 'arg 2')).to.equal('my resume result');
                });

                it('should not trace the opcode result', function () {
                    callCreate();

                    tracedOpcodeHandler('arg 1', 'arg 2');

                    expect(opcode.traceResult).not.to.have.been.called;
                });

                it('should not advance the opcode index for the trace', function () {
                    callCreate();

                    tracedOpcodeHandler('arg 1', 'arg 2');

                    expect(trace.advanceOpIndex).not.to.have.been.called;
                });
            });

            describe('when executing an opcode and a non-Future is returned', function () {
                beforeEach(function () {
                    opcodeExecutor.execute
                        .withArgs(sinon.match.same(opcode))
                        .returns('my exec result');
                });

                it('should return the result from executing the opcode', function () {
                    callCreate();

                    expect(tracedOpcodeHandler('arg 1', 'arg 2')).to.equal('my exec result');
                });

                it('should trace the opcode result', function () {
                    callCreate();

                    tracedOpcodeHandler('arg 1', 'arg 2');

                    expect(opcode.traceResult).to.have.been.calledOnce;
                    expect(opcode.traceResult).to.have.been.calledWith('my exec result');
                });

                it('should advance the opcode index for the trace', function () {
                    callCreate();

                    tracedOpcodeHandler('arg 1', 'arg 2');

                    expect(trace.advanceOpIndex).to.have.been.calledOnce;
                });
            });

            describe('when executing an opcode and a resolved Future is returned', function () {
                var future;

                beforeEach(function () {
                    future = sinon.createStubInstance(Future);
                    future.yield.returns('my exec result');

                    controlBridge.isFuture
                        .withArgs(sinon.match.same(future))
                        .returns(true);

                    opcodeExecutor.execute
                        .withArgs(sinon.match.same(opcode))
                        .returns(future);
                });

                it('should return the result from executing the opcode', function () {
                    callCreate();

                    expect(tracedOpcodeHandler('arg 1', 'arg 2')).to.equal('my exec result');
                });

                it('should trace the opcode result', function () {
                    callCreate();

                    tracedOpcodeHandler('arg 1', 'arg 2');

                    expect(opcode.traceResult).to.have.been.calledOnce;
                    expect(opcode.traceResult).to.have.been.calledWith('my exec result');
                });

                it('should advance the opcode index for the trace', function () {
                    callCreate();

                    tracedOpcodeHandler('arg 1', 'arg 2');

                    expect(trace.advanceOpIndex).to.have.been.calledOnce;
                });
            });

            describe('when executing an opcode and a pending Future is returned', function () {
                var future,
                    pause;

                beforeEach(function () {
                    future = sinon.createStubInstance(Future);
                    pause = sinon.createStubInstance(Pause);
                    future.yield.throws(pause);

                    controlBridge.isFuture
                        .withArgs(sinon.match.same(future))
                        .returns(true);

                    opcodeExecutor.execute
                        .withArgs(sinon.match.same(opcode))
                        .returns(future);
                });

                it('should rescue the resulting pause', function () {
                    callCreate();

                    tracedOpcodeHandler('arg 1', 'arg 2');

                    expect(opcodeRescuer.rescuePauseOrError).to.have.been.calledOnce;
                    expect(opcodeRescuer.rescuePauseOrError).to.have.been.calledWith(
                        sinon.match.same(pause),
                        sinon.match.same(opcode),
                        sinon.match.same(trace)
                    );
                });

                it('should not trace the opcode result', function () {
                    callCreate();

                    tracedOpcodeHandler('arg 1', 'arg 2');

                    expect(opcode.traceResult).not.to.have.been.called;
                });

                it('should not advance the opcode index for the trace', function () {
                    callCreate();

                    tracedOpcodeHandler('arg 1', 'arg 2');

                    expect(trace.advanceOpIndex).not.to.have.been.called;
                });
            });

            describe('when executing an opcode and a non-Pause error is raised', function () {
                var error;

                beforeEach(function () {
                    error = new Error('Bang!');

                    opcodeExecutor.execute
                        .withArgs(sinon.match.same(opcode))
                        .throws(error);
                });

                it('should rescue the resulting error', function () {
                    callCreate();

                    tracedOpcodeHandler('arg 1', 'arg 2');

                    expect(opcodeRescuer.rescuePauseOrError).to.have.been.calledOnce;
                    expect(opcodeRescuer.rescuePauseOrError).to.have.been.calledWith(
                        sinon.match.same(error),
                        sinon.match.same(opcode),
                        sinon.match.same(trace)
                    );
                });

                it('should not trace the opcode result', function () {
                    callCreate();

                    tracedOpcodeHandler('arg 1', 'arg 2');

                    expect(opcode.traceResult).not.to.have.been.called;
                });

                it('should not advance the opcode index for the trace', function () {
                    callCreate();

                    tracedOpcodeHandler('arg 1', 'arg 2');

                    expect(trace.advanceOpIndex).not.to.have.been.called;
                });
            });
        });
    });
});
