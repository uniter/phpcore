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
 * @param {class} Sequence
 * @param {class} Trace
 * @param {ControlBridge} controlBridge
 * @param {ControlScope} controlScope
 * @param {OpcodePool} opcodePool
 * @constructor
 */
function ControlFactory(Sequence, Trace, controlBridge, controlScope, opcodePool) {
    /**
     * @type {ControlBridge}
     */
    this.controlBridge = controlBridge;
    /**
     * @type {ControlScope}
     */
    this.controlScope = controlScope;
    /**
     * @type {OpcodePool}
     */
    this.opcodePool = opcodePool;
    /**
     * @type {class}
     */
    this.Sequence = Sequence;
    /**
     * @type {class}
     */
    this.Trace = Trace;
}

_.extend(ControlFactory.prototype, {
    /**
     * Creates a new Sequence
     *
     * @returns {Sequence}
     */
    createSequence: function () {
        var factory = this;

        return new factory.Sequence(factory, factory.controlBridge, factory.controlScope);
    },

    /**
     * Creates a new Trace
     *
     * @returns {Trace}
     */
    createTrace: function () {
        var factory = this;

        return new factory.Trace(factory.opcodePool);
    }
});

module.exports = ControlFactory;
