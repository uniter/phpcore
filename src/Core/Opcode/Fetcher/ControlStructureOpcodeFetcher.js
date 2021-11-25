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
 * @param {OpcodePool} opcodePool
 * @constructor
 */
function ControlStructureOpcodeFetcher(opcodePool) {
    /**
     * @type {OpcodePool}
     */
    this.opcodePool = opcodePool;
}

_.extend(ControlStructureOpcodeFetcher.prototype, {
    /**
     * Fetches a suitable ControlStructureOpcode
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {Function} handler
     * @param {*[]} args
     * @returns {ControlStructureOpcode}
     */
    fetchOpcode: function (trace, opIndex, handler, args) {
        return this.opcodePool.provideControlStructureOpcode(trace, opIndex, handler, args);
    }
});

module.exports = ControlStructureOpcodeFetcher;
