/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception;

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
     * Calls the wrapped handler for this opcode.
     *
     * @returns {*}
     */
    handle: function () {
        throw new Exception('IsolatedOpcode.handle() should not be called');
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
     * or returns null if it has not executed yet.
     *
     * @returns {*}
     */
    resume: function () {
        throw new Exception('IsolatedOpcode.resume() should not be called');
    },

    /**
     * Tracing is intentionally not performed for isolated opcodes.
     */
    traceResult: function () {
        throw new Exception('IsolatedOpcode.traceResult() should not be called');
    },

    /**
     * Tracing is intentionally not performed for isolated opcodes.
     */
    traceThrow: function () {
        throw new Exception('IsolatedOpcode.traceThrow() should not be called');
    }
});

module.exports = IsolatedOpcode;
