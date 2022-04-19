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
    OpcodeFactory = require('../../../../../src/Core/Opcode/Opcode/OpcodeFactory'),
    OpcodePool = require('../../../../../src/Core/Opcode/Opcode/OpcodePool'),
    Trace = require('../../../../../src/Control/Trace');

describe('OpcodePool', function () {
    var handler,
        opcodeFactory,
        pool,
        trace;

    beforeEach(function () {
        handler = sinon.stub();
        opcodeFactory = sinon.createStubInstance(OpcodeFactory);
        trace = sinon.createStubInstance(Trace);

        pool = new OpcodePool(opcodeFactory);
    });

    describe('provideCalculationOpcode()', function () {
        describe('when there are no free CalculationOpcodes in the pool', function () {
            var opcode;

            beforeEach(function () {
                opcode = sinon.createStubInstance(CalculationOpcode);
                opcodeFactory.createCalculationOpcode
                    .returns(opcode);
            });

            it('should return a newly created CalculationOpcode', function () {
                expect(pool.provideCalculationOpcode(trace, 21, handler, ['first arg', 'second arg']))
                    .to.equal(opcode);
            });

            it('should hydrate the new CalculationOpcode', function () {
                pool.provideCalculationOpcode(trace, 21, handler, ['first arg', 'second arg']);

                expect(opcode.hydrate).to.have.been.calledOnce;
                expect(opcode.hydrate).to.have.been.calledWith(
                    sinon.match.same(trace),
                    21,
                    sinon.match.same(handler),
                    ['first arg', 'second arg']
                );
            });
        });

        describe('when there is a free CalculationOpcode in the pool', function () {
            var opcode;

            beforeEach(function () {
                opcode = sinon.createStubInstance(CalculationOpcode);
                pool.returnCalculationOpcode(opcode);
            });

            it('should return the free CalculationOpcode', function () {
                expect(pool.provideCalculationOpcode(trace, 21, handler, ['first arg', 'second arg']))
                    .to.equal(opcode);
            });

            it('should hydrate the free CalculationOpcode', function () {
                pool.provideCalculationOpcode(trace, 21, handler, ['first arg', 'second arg']);

                expect(opcode.hydrate).to.have.been.calledOnce;
                expect(opcode.hydrate).to.have.been.calledWith(
                    sinon.match.same(trace),
                    21,
                    sinon.match.same(handler),
                    ['first arg', 'second arg']
                );
            });
        });
    });
});
