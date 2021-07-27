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
 * @constructor
 */
function ControlBridge(Future, FutureValue) {
    /**
     * @type {class}
     */
    this.Future = Future;
    /**
     * @type {class}
     */
    this.FutureValue = FutureValue;
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

        return bridge.isFuture(value);
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
