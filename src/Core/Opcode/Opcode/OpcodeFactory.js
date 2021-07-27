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
 * @param {class} CalculationOpcode
 * @param {class} ControlExpressionOpcode
 * @param {class} ControlStructureOpcode
 * @param {class} LoopStructureOpcode
 * @param {class} UntracedOpcode
 * @constructor
 */
function OpcodeFactory(
    CalculationOpcode,
    ControlExpressionOpcode,
    ControlStructureOpcode,
    LoopStructureOpcode,
    UntracedOpcode
) {
    /**
     * @type {class}
     */
    this.CalculationOpcode = CalculationOpcode;
    /**
     * @type {class}
     */
    this.ControlExpressionOpcode = ControlExpressionOpcode;
    /**
     * @type {class}
     */
    this.ControlStructureOpcode = ControlStructureOpcode;
    /**
     * @type {class}
     */
    this.LoopStructureOpcode = LoopStructureOpcode;
    /**
     * @type {class}
     */
    this.UntracedOpcode = UntracedOpcode;
}

_.extend(OpcodeFactory.prototype, {
    /**
     * Creates a new CalculationOpcode
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {Function} handler
     * @param {*[]} args
     * @returns {CalculationOpcode}
     */
    createCalculationOpcode: function (trace, opIndex, handler, args) {
        var factory = this;

        return new factory.CalculationOpcode(trace, opIndex, handler, args);
    },

    /**
     * Creates a new ControlExpressionOpcode
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {Function} handler
     * @param {*[]} args
     * @returns {ControlExpressionOpcode}
     */
    createControlExpressionOpcode: function (trace, opIndex, handler, args) {
        var factory = this;

        return new factory.ControlExpressionOpcode(trace, opIndex, handler, args);
    },

    /**
     * Creates a new ControlStructureOpcode
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {Function} handler
     * @param {*[]} args
     * @returns {ControlStructureOpcode}
     */
    createControlStructureOpcode: function (trace, opIndex, handler, args) {
        var factory = this;

        return new factory.ControlStructureOpcode(trace, opIndex, handler, args);
    },

    /**
     * Creates a new LoopStructureOpcode
     *
     * @param {Trace} trace
     * @param {number} opIndex
     * @param {number} loopIndex
     * @param {Function} handler
     * @param {*[]} args
     * @returns {LoopStructureOpcode}
     */
    createLoopStructureOpcode: function (trace, opIndex, loopIndex, handler, args) {
        var factory = this;

        return new factory.LoopStructureOpcode(trace, opIndex, loopIndex, handler, args);
    },

    /**
     * Creates a new UntracedOpcode
     *
     * @param {Function} handler
     * @param {*[]} args
     * @returns {UntracedOpcode}
     */
    createUntracedOpcode: function (handler, args) {
        return new this.UntracedOpcode(handler, args);
    }
});

module.exports = OpcodeFactory;
