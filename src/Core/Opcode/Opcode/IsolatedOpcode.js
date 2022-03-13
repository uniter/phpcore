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
 * Encapsulates execution of userland code when no tracing is desired,
 * eg. when evaluating the value of a class constant
 *
 * @constructor
 */
function IsolatedOpcode() {

}

_.extend(IsolatedOpcode.prototype, {
    /**
     * Calls the wrapped handler for this opcode
     *
     * @returns {*}
     */
    handle: function () {
        return null; // TODO: Throw instead, as this should not be called for this class?
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
     */
    resume: function () {
        return null; // TODO: Throw instead, as this should not be called for this class?
    },

    /**
     * Tracing is intentionally not performed for isolated opcodes
     */
    traceResult: function () {
        // Nothing to record
    },

    /**
     * Tracing is intentionally not performed for isolated opcodes
     */
    traceThrow: function () {
        // Nothing to record
    }
});

module.exports = IsolatedOpcode;
