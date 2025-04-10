/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    LiePromise = require('lie'),
    isPromise = typeof Promise === 'function' ?
        function (value) {
            return value instanceof Promise || value instanceof LiePromise;
        } :
        function (value) {
            return value instanceof LiePromise;
        };

/**
 * @constructor
 */
function PromiseBridge() {

}

_.extend(PromiseBridge.prototype, {
    /**
     * Determines whether the given value is a Promise.
     *
     * @param {*} value
     * @returns {boolean}
     */
    isPromise: function (value) {
        return isPromise(value);
    }
});

module.exports = PromiseBridge;
