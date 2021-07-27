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
 * @param {OpcodeFactory} opcodeFactory
 * @constructor
 */
function LoopStructureOpcodeFetcher(opcodeFactory) {
    /**
     * @type {OpcodeFactory}
     */
    this.opcodeFactory = opcodeFactory;
}

_.extend(LoopStructureOpcodeFetcher.prototype, {
    /**
     * Fetches a suitable LoopStructureOpcode
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {Function} handler
     * @param {*[]} args
     * @returns {LoopStructureOpcode}
     */
    fetchOpcode: function (trace, opIndex, handler, args) {
        var effectiveOpIndex,
            loopIndex = args[0]; // First arg to a loop structure opcode is the loop index

        args = args.slice(1); // Strip the loop index from the rest of the args

        effectiveOpIndex = trace.getEffectiveLoopStructureOpIndex(opIndex, loopIndex);

        return this.opcodeFactory.createLoopStructureOpcode(trace, effectiveOpIndex, loopIndex, handler, args);
    }
});

module.exports = LoopStructureOpcodeFetcher;
