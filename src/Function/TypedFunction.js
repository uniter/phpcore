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
 * @param {string} signature
 * @param {Function} func
 * @constructor
 */
function TypedFunction(signature, func) {
    /**
     * @type {Function}
     */
    this.func = func;
    /**
     * @type {string}
     */
    this.signature = signature;
}

_.extend(TypedFunction.prototype, {
    /**
     * Fetches the underlying native function.
     *
     * @returns {Function}
     */
    getFunction: function () {
        return this.func;
    },

    /**
     * Fetches the typed function's signature.
     *
     * @returns {string}
     */
    getSignature: function () {
        return this.signature;
    }
});

module.exports = TypedFunction;
