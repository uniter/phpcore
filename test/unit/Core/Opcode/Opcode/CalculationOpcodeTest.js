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
    CalculationOpcode = require('../../../../../src/Core/Opcode/Opcode/CalculationOpcode'),
    OpcodePool = require('../../../../../src/Core/Opcode/Opcode/OpcodePool'),
    Trace = require('../../../../../src/Control/Trace');

describe('CalculationOpcode', function () {
    var handler,
        opcode,
        opcodePool,
        trace;

    beforeEach(function () {
        handler = sinon.stub();
        opcodePool = sinon.createStubInstance(OpcodePool);
        trace = sinon.createStubInstance(Trace);

        opcode = new CalculationOpcode();
        opcode.hydrate(trace, 21, handler, ['first arg', 'second arg']);
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

    describe('release()', function () {
        it('should return the opcode to the OpcodePool', function () {
            opcode.release(opcodePool);

            expect(opcodePool.returnCalculationOpcode).to.have.been.calledOnce;
            expect(opcodePool.returnCalculationOpcode).to.have.been.calledWith(sinon.match.same(opcode));
        });
    });

    describe('resume()', function () {
        it('should resume via the Trace', function () {
            opcode.resume();

            expect(trace.resumeCalculationOpcode).to.have.been.calledOnce;
            expect(trace.resumeCalculationOpcode).to.have.been.calledWith(21);
        });
    });

    describe('traceResult()', function () {
        it('should trace the opcode result in the Trace', function () {
            opcode.traceResult('my result');

            expect(trace.traceCalculationOpcodeResult).to.have.been.calledOnce;
            expect(trace.traceCalculationOpcodeResult).to.have.been.calledWith(21, 'my result');
        });
    });

    describe('traceThrow()', function () {
        it('should trace the opcode throw in the Trace', function () {
            var error = new Error('Bang!');

            opcode.traceThrow(error);

            expect(trace.traceCalculationOpcodeThrow).to.have.been.calledOnce;
            expect(trace.traceCalculationOpcodeThrow).to.have.been.calledWith(21, sinon.match.same(error));
        });
    });
});
