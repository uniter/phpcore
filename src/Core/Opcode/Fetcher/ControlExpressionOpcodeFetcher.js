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
function ControlExpressionOpcodeFetcher(opcodeFactory) {
    /**
     * @type {OpcodeFactory}
     */
    this.opcodeFactory = opcodeFactory;
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
        return this.opcodeFactory.createControlExpressionOpcode(trace, opIndex, handler, args);
    }
});

module.exports = ControlExpressionOpcodeFetcher;
