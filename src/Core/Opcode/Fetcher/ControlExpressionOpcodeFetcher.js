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
function ControlExpressionOpcodeFetcher(opcodePool) {
    /**
     * @type {OpcodePool}
     */
    this.opcodePool = opcodePool;
}

_.extend(ControlExpressionOpcodeFetcher.prototype, {
    /**
     * Fetches a suitable ControlExpressionOpcode
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {Function} handler
     * @param {*[]} args
     * @returns {ControlExpressionOpcode}
     */
    fetchOpcode: function (trace, opIndex, handler, args) {
        return this.opcodePool.provideControlExpressionOpcode(trace, opIndex, handler, args);
    }
});

module.exports = ControlExpressionOpcodeFetcher;
