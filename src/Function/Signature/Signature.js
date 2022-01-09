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
 * @constructor
 */
function Signature(parametersSpecData) {
    /**
     * @type {Array}
     */
    this.parametersSpecData = parametersSpecData;
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
    }
});

module.exports = Signature;
