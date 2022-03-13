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
 * @param {Function} handler
 * @param {*[]} args
 * @constructor
 */
function UntracedOpcode(handler, args) {
    /**
     * @type {*[]}
     */
    this.args = args;
    /**
     * @type {Function}
     */
    this.handler = handler;
}

_.extend(UntracedOpcode.prototype, {
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

    resume: function () {
        return null;
    },

    traceResult: function () {
        // Nothing to record
    },

    traceThrow: function () {
        // Nothing to record
    }
});

module.exports = UntracedOpcode;
