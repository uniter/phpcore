/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

/**
 * Limits garbage collector pressure by allowing Opcode instances to be reused.
 * Note that an Opcode instance is required every time an individual opcode is evaluated.
 *
 * @param {OpcodeFactory} opcodeFactory
 * @constructor
 */
function OpcodePool(opcodeFactory) {
    /**
     * @type {CalculationOpcode[]}
     */
    this.calculationOpcodes = [];
    /**
     * @type {OpcodeFactory}
     */
    this.opcodeFactory = opcodeFactory;
}

_.extend(OpcodePool.prototype, {
    /**
     * Fetches a free CalculationOpcode from the pool if one is available,
     * otherwise creates a new one.
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {Function} handler
     * @param {*[]} args
     * @returns {CalculationOpcode}
     */
    provideCalculationOpcode: function (trace, opIndex, handler, args) {
        var pool = this,
            opcode;

        if (pool.calculationOpcodes.length > 0) {
            // An opcode is available from the pool; fetch it.
            opcode = pool.calculationOpcodes.pop();
        } else {
            // All opcodes have been depleted from the pool, we'll have to create a new one.
            // TODO: Keep all regardless of growth or limit max # of opcodes returned to pool?
            opcode = pool.opcodeFactory.createCalculationOpcode();
        }

        opcode.hydrate(trace, opIndex, handler, args);

        return opcode;
    },

    /**
     * Creates a new ControlExpressionOpcode.
     *
     * TODO: Investigate and pool these if needed.
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {Function} handler
     * @param {*[]} args
     * @returns {ControlExpressionOpcode}
     */
    provideControlExpressionOpcode: function (trace, opIndex, handler, args) {
        var pool = this;

        return pool.opcodeFactory.createControlExpressionOpcode(trace, opIndex, handler, args);
    },

    /**
     * Creates a new ControlStructureOpcode.
     *
     * TODO: Investigate and pool these if needed.
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {Function} handler
     * @param {*[]} args
     * @returns {ControlStructureOpcode}
     */
    provideControlStructureOpcode: function (trace, opIndex, handler, args) {
        var pool = this;

        return pool.opcodeFactory.createControlStructureOpcode(trace, opIndex, handler, args);
    },

    /**
     * Creates a new IsolatedOpcode.
     *
     * TODO: Investigate and pool these if needed.
     *
     * @returns {IsolatedOpcode}
     */
    provideIsolatedOpcode: function () {
        // TODO: Always return the same single instance of this class?
        return this.opcodeFactory.createIsolatedOpcode();
    },

    /**
     * Creates a new LoopStructureOpcode.
     *
     * TODO: Investigate and pool these if needed.
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {number} loopIndex
     * @param {Function} handler
     * @param {*[]} args
     * @returns {LoopStructureOpcode}
     */
    provideLoopStructureOpcode: function (trace, opIndex, loopIndex, handler, args) {
        var pool = this;

        return pool.opcodeFactory.createLoopStructureOpcode(trace, opIndex, loopIndex, handler, args);
    },

    /**
     * Creates a new UntracedOpcode.
     *
     * TODO: Investigate and pool these if needed.
     *
     * @param {Function} handler
     * @param {*[]} args
     * @returns {UntracedOpcode}
     */
    provideUntracedOpcode: function (handler, args) {
        return this.opcodeFactory.createUntracedOpcode(handler, args);
    },

    /**
     * Returns a finished CalculationOpcode to the pool to be reused.
     *
     * @param {CalculationOpcode} opcode
     */
    returnCalculationOpcode: function (opcode) {
        this.calculationOpcodes.push(opcode);
    }
});

module.exports = OpcodePool;
