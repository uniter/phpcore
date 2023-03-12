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
 * @param {class} Future
 * @param {class} Reference
 * @param {class} Value
 * @param {class} Variable
 * @constructor
 */
function ControlBridge(Future, Reference, Value, Variable) {
    /**
     * @type {class}
     */
    this.Future = Future;
    /**
     * @type {class}
     */
    this.Reference = Reference;
    /**
     * @type {class}
     */
    this.Value = Value;
    /**
     * @type {class}
     */
    this.Variable = Variable;
}

_.extend(ControlBridge.prototype, {
    /**
     * Determines whether the given value is a Future.
     *
     * @param {*} value
     * @returns {boolean}
     */
    isChainable: function (value) {
        var bridge = this;

        // TODO: Use a Symbol indicating "implements ChainableInterface" on the prototype of these classes
        //       to speed up this test by replacing it with a single lookup.

        return bridge.isFuture(value) ||
            value instanceof bridge.Reference ||
            value instanceof bridge.Value ||
            value instanceof bridge.Variable;
    },

    /**
     * Determines whether the given value is a Future.
     *
     * @param {*} value
     * @returns {boolean}
     */
    isFuture: function (value) {
        var bridge = this;

        return value instanceof bridge.Future;
    }
});

module.exports = ControlBridge;
