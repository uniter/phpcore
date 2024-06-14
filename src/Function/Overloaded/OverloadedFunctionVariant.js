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
 * @param {Signature} signature
 * @param {Function} func
 * @constructor
 */
function OverloadedFunctionVariant(signature, func) {
    /**
     * @type {Function}
     */
    this.func = func;
    /**
     * @type {Signature}
     */
    this.signature = signature;
}

_.extend(OverloadedFunctionVariant.prototype, {
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
     * @returns {Signature}
     */
    getSignature: function () {
        return this.signature;
    }
});

module.exports = OverloadedFunctionVariant;
