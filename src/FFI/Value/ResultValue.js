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
 * Represents a result of execution returned from PHP-land to JS-land.
 *
 * @param {Value} internalValue
 * @param {*} nativeValue
 * @constructor
 */
function ResultValue(internalValue, nativeValue) {
    /**
     * @type {Value}
     */
    this.internalValue = internalValue;
    /**
     * @type {*}
     */
    this.nativeValue = nativeValue;
}

_.extend(ResultValue.prototype, {
    /**
     * Fetches the internal Value of the result.
     *
     * @returns {Value}
     */
    getInternalValue: function () {
        return this.internalValue;
    },

    /**
     * Fetches the previously-resolved native value of the result.
     *
     * @returns {*}
     */
    getNative: function () {
        return this.nativeValue;
    },

    /**
     * Exports a "proxying" version of the native value. For normal primitive values
     * (string, boolean, int, float) this will just be the native value,
     * but for objects it will be an instance of PHPObject (see ObjectValue.prototype.getProxy())
     *
     * @returns {*}
     */
    getProxy: function () {
        var value = this;

        return value.getType() === 'object' ?
            // Only ObjectValues support proxying.
            value.internalValue.getProxy() :
            // For other value types, use the native value we already resolved.
            value.nativeValue;
    },

    /**
     * Fetches the exit code, if any, otherwise 0. Note this is only valid on exit -
     * if the internal value was not an ExitValue then null will be returned.
     *
     * @returns {number|null}
     */
    getStatus: function () {
        var value = this;

        return value.internalValue.getType() === 'exit' ?
            value.internalValue.getStatus() :
            null;
    },

    /**
     * Fetches the type of the result.
     *
     * @returns {string}
     */
    getType: function () {
        return this.internalValue.getType();
    }
});

module.exports = ResultValue;
