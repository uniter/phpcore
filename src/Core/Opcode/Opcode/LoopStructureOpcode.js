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
 * Represents a loop structure opcode, eg. a for loop condition.
 *
 * @param {Trace} trace
 * @param {number} opIndex
 * @param {number} loopIndex
 * @param {Function} handler
 * @param {*[]} args
 * @constructor
 */
function LoopStructureOpcode(trace, opIndex, loopIndex, handler, args) {
    /**
     * @type {*[]}
     */
    this.args = args;
    /**
     * @type {Function}
     */
    this.handler = handler;
    /**
     * @type {number}
     */
    this.loopIndex = loopIndex;
    /**
     * @type {number}
     */
    this.opIndex = opIndex;
    /**
     * @type {Trace}
     */
    this.trace = trace;
}

_.extend(LoopStructureOpcode.prototype, {
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
     * Releases this opcode back into the pool to be reused
     *
     * @param {OpcodePool} opcodePool
     */
    release: function (/* opcodePool */) {
        // TODO: Not yet implemented!
    },

    /**
     * Returns the previous result of this opcode if it succeeded,
     * or re-throws the previous error for this opcode if it failed,
     * or returns null if it has not executed yet.
     *
     * @returns {*}
     * @throws {Error} Throws when the opcode previously failed
     */
    resume: function () {
        var opcode = this;

        return opcode.trace.resumeControlFlowOpcode(opcode.opIndex);
    },

    /**
     * Records the result of this opcode if/when it succeeds
     *
     * @param {*} result
     */
    traceResult: function (result) {
        var opcode = this;

        // Note that we reuse the control structure logic here,
        // as a loop is a form of control structure.
        opcode.trace.traceControlStructureOpcodeResult(opcode.opIndex, result);
    },

    /**
     * Records the error thrown by this opcode if/when it fails
     *
     * @param {*} result
     */
    traceThrow: function (error) {
        var opcode = this;

        // Note that we reuse the control structure logic here,
        // as a loop is a form of control structure.
        opcode.trace.traceControlStructureOpcodeThrow(opcode.opIndex, error);
    }
});

module.exports = LoopStructureOpcode;
