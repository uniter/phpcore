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
 * @param {class} Trace
 * @param {OpcodePool} opcodePool
 * @param {UnpausedSentinel} unpausedSentinel
 * @constructor
 */
function ControlFactory(Trace, opcodePool, unpausedSentinel) {
    /**
     * @type {OpcodePool}
     */
    this.opcodePool = opcodePool;
    /**
     * @type {class}
     */
    this.Trace = Trace;
    /**
     * @type {UnpausedSentinel}
     */
    this.unpausedSentinel = unpausedSentinel;
}

_.extend(ControlFactory.prototype, {
    /**
     * Creates a new Trace.
     *
     * @returns {Trace}
     */
    createTrace: function () {
        var factory = this;

        return new factory.Trace(factory.opcodePool, factory.unpausedSentinel);
    }
});

module.exports = ControlFactory;
