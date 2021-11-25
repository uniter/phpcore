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
 * @param {class} FutureValue
 * @param {class} Value
 * @constructor
 */
function ControlBridge(Future, FutureValue, Value) {
    /**
     * @type {class}
     */
    this.Future = Future;
    /**
     * @type {class}
     */
    this.FutureValue = FutureValue;
    /**
     * @type {class}
     */
    this.Value = Value;
}

_.extend(ControlBridge.prototype, {
    /**
     * Determines whether the given value is a Future or FutureValue
     *
     * @param {*} value
     * @returns {boolean}
     */
    isChainable: function (value) {
        var bridge = this;

        return bridge.isFuture(value) || value instanceof bridge.Value;
    },

    /**
     * Determines whether the given value is a Future or FutureValue
     *
     * @param {*} value
     * @returns {boolean}
     */
    isFuture: function (value) {
        var bridge = this;

        return value instanceof bridge.Future || value instanceof bridge.FutureValue;
    }
});

module.exports = ControlBridge;
