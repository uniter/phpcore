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
    LoopStructureOpcode = require('../../../../../src/Core/Opcode/Opcode/LoopStructureOpcode'),
    Trace = require('../../../../../src/Control/Trace');

describe('LoopStructureOpcode', function () {
    var handler,
        opcode,
        trace;

    beforeEach(function () {
        handler = sinon.stub();
        trace = sinon.createStubInstance(Trace);

        opcode = new LoopStructureOpcode(trace, 21, 101, handler, ['first arg', 'second arg']);
    });

    describe('handle()', function () {
        it('should invoke the handler correctly', function () {
            handler.returns('my result');

            opcode.handle();

            expect(handler).to.have.been.calledOnce;
            expect(handler).to.have.been.calledOn(null);
            expect(handler).to.have.been.calledWith('first arg', 'second arg');
        });

        it('should return the result', function () {
            handler
                .withArgs('first arg', 'second arg')
                .returns('my result');

            expect(opcode.handle()).to.equal('my result');
        });
    });

    describe('isTraced()', function () {
        it('should return true', function () {
            expect(opcode.isTraced()).to.be.true;
        });
    });

    describe('resume()', function () {
        it('should resume via the Trace', function () {
            opcode.resume();

            expect(trace.resumeControlFlowOpcode).to.have.been.calledOnce;
            expect(trace.resumeControlFlowOpcode).to.have.been.calledWith(21);
        });
    });

    describe('traceResult()', function () {
        it('should trace the opcode result in the Trace', function () {
            opcode.traceResult('my result');

            expect(trace.traceControlStructureOpcodeResult).to.have.been.calledOnce;
            expect(trace.traceControlStructureOpcodeResult).to.have.been.calledWith(21, 'my result');
        });
    });

    describe('traceThrow()', function () {
        it('should trace the opcode throw in the Trace', function () {
            var error = new Error('Bang!');

            opcode.traceThrow(error);

            expect(trace.traceControlStructureOpcodeThrow).to.have.been.calledOnce;
            expect(trace.traceControlStructureOpcodeThrow).to.have.been.calledWith(21, sinon.match.same(error));
        });
    });
});
