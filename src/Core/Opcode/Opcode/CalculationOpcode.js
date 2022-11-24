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
 * Represents an opcode that performs a calculation, e.g. arithmetic addition.
 *
 * @constructor
 */
function CalculationOpcode() {
    /**
     * @type {*[]|null}
     */
    this.args = null;
    /**
     * @type {Function|null}
     */
    this.handler = null;
    /**
     * @type {number|null}
     */
    this.opIndex = null;
    /**
     * @type {Trace|null}
     */
    this.trace = null;
}

_.extend(CalculationOpcode.prototype, {
    /**
     * Calls the wrapped handler for this opcode
     *
     * @returns {*}
     */
    handle: function () {
        var opcode = this;

        return opcode.handler.apply(null, opcode.args);
    },

    /**
     * Hydrates this opcode with the relevant data
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {Function} handler
     * @param {*[]} args
     */
    hydrate: function (trace, opIndex, handler, args) {
        var opcode = this;

        opcode.args = args;
        opcode.handler = handler;
        opcode.opIndex = opIndex;
        opcode.trace = trace;
    },

    /**
     * Fetches whether this opcode's result (or error) is traced.
     *
     * @returns {boolean}
     */
    isTraced: function () {
        return true;
    },

    /**
     * Releases this opcode back into the pool to be reused
     *
     * @param {OpcodePool} opcodePool
     */
    release: function (opcodePool) {
        var opcode = this;

        opcode.args = null;
        opcode.handler = null;
        opcode.opIndex = null;
        opcode.trace = null;

        opcodePool.returnCalculationOpcode(opcode);
    },

    /**
     * Returns the previous result of this opcode if it succeeded,
     * or re-throws the previous error for this opcode if it failed,
     * or returns UnpausedSentinel if it has not executed yet.
     *
     * @returns {*}
     * @throws {Error} Throws when the opcode previously failed
     */
    resume: function () {
        var opcode = this;

        return opcode.trace.resumeCalculationOpcode(opcode.opIndex);
    },

    /**
     * Records the result of this opcode if/when it succeeds
     *
     * @param {*} result
     */
    traceResult: function (result) {
        var opcode = this;

        opcode.trace.traceCalculationOpcodeResult(opcode.opIndex, result);
    },

    /**
     * Records the error thrown by this opcode if/when it fails
     *
     * @param {*} result
     */
    traceThrow: function (error) {
        var opcode = this;

        opcode.trace.traceCalculationOpcodeThrow(opcode.opIndex, error);
    }
});

module.exports = CalculationOpcode;
