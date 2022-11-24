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
 * Represents an opcode that is to be executed but whose result is not to be traced.
 * Used when we are already inside an opcode and only the outer one's result is needed.
 *
 * @param {UnpausedSentinel} unpausedSentinel
 * @param {Function} handler
 * @param {*[]} args
 * @constructor
 */
function UntracedOpcode(unpausedSentinel, handler, args) {
    /**
     * @type {*[]}
     */
    this.args = args;
    /**
     * @type {Function}
     */
    this.handler = handler;
    /**
     * @type {UnpausedSentinel}
     */
    this.unpausedSentinel = unpausedSentinel;
}

_.extend(UntracedOpcode.prototype, {
    /**
     * Calls the wrapped handler for this opcode.
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
        return false;
    },

    /**
     * Releases this opcode back into the pool to be reused.
     *
     * @param {OpcodePool} opcodePool
     */
    release: function (/* opcodePool */) {
        // TODO: Not yet implemented!
    },

    /**
     * Returns the previous result of this opcode if it succeeded,
     * or re-throws the previous error for this opcode if it failed,
     * or returns UnpausedSentinel if it has not executed yet.
     *
     * For an untraced opcode this will always return UnpausedSentinel, as they are not traced
     * and therefore cannot be resumed.
     *
     * @returns {UnpausedSentinel}
     */
    resume: function () {
        return this.unpausedSentinel;
    },

    /**
     * Records the result of this opcode if/when it succeeds.
     */
    traceResult: function () {
        // Nothing to record.
    },

    /**
     * Records the error thrown by this opcode if/when it fails.
     */
    traceThrow: function () {
        // Nothing to record.
    }
});

module.exports = UntracedOpcode;
