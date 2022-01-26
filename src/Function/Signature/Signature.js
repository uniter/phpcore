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
 * Represents a parsed signature of a native function or method.
 *
 * @param {Array} parametersSpecData
 * @param {Object|null} returnTypeSpecData
 * @constructor
 */
function Signature(parametersSpecData, returnTypeSpecData) {
    /**
     * @type {Array}
     */
    this.parametersSpecData = parametersSpecData;
    /**
     * @type {Object|null}
     */
    this.returnTypeSpecData = returnTypeSpecData;
}

_.extend(Signature.prototype, {
    /**
     * Fetches the number of parameters in this function signature.
     *
     * @returns {number}
     */
    getParameterCount: function () {
        return this.parametersSpecData.length;
    },

    /**
     * Fetches the parameters' spec data for the function signature.
     *
     * @returns {Array}
     */
    getParametersSpecData: function () {
        return this.parametersSpecData;
    },

    /**
     * Fetches the return type's spec data for the function signature, if any.
     *
     * @returns {Object|null}
     */
    getReturnTypeSpecData: function () {
        return this.returnTypeSpecData;
    }
});

module.exports = Signature;
