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
 * Represents a control expression opcode, eg. ternary if.
 *
 * @param {Trace} trace
 * @param {number} opIndex
 * @param {Function} handler
 * @param {*[]} args
 * @constructor
 */
function ControlExpressionOpcode(trace, opIndex, handler, args) {
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
    this.opIndex = opIndex;
    /**
     * @type {Trace}
     */
    this.trace = trace;
}

_.extend(ControlExpressionOpcode.prototype, {
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

        opcode.trace.traceControlExpressionOpcodeResult(opcode.opIndex, result);
    },

    /**
     * Records the error thrown by this opcode if/when it fails
     *
     * @param {*} result
     */
    traceThrow: function (error) {
        var opcode = this;

        opcode.trace.traceControlExpressionOpcodeThrow(opcode.opIndex, error);
    }
});

module.exports = ControlExpressionOpcode;
