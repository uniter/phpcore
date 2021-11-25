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
function CalculationOpcodeFetcher(opcodePool) {
    /**
     * @type {OpcodePool}
     */
    this.opcodePool = opcodePool;
}

_.extend(CalculationOpcodeFetcher.prototype, {
    /**
     * Fetches a suitable CalculationOpcode
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {Function} handler
     * @param {*[]} args
     * @returns {CalculationOpcode}
     */
    fetchOpcode: function (trace, opIndex, handler, args) {
        return this.opcodePool.provideCalculationOpcode(trace, opIndex, handler, args);
    }
});

module.exports = CalculationOpcodeFetcher;
