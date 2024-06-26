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
 * Represents a parsed signature of an opcode.
 *
 * @param {Parameter[]} parameters
 * @param {TypeInterface} returnType Note that this will be an AnyType if none was explicitly specified.
 * @constructor
 */
function Signature(parameters, returnType) {
    /**
     * @type {Parameter[]}
     */
    this.parameters = parameters;
    /**
     * @type {TypeInterface}
     */
    this.returnType = returnType;
}

_.extend(Signature.prototype, {
    /**
     * Coerces the return value of the opcode as per its return type, if any.
     *
     * @param {*} returnValue
     * @returns {*}
     */
    coerceReturnValue: function (returnValue) {
        return this.returnType.coerceValue(returnValue);
    },

    /**
     * Fetches the number of parameters in this opcode signature.
     *
     * @returns {number}
     */
    getParameterCount: function () {
        return this.parameters.length;
    },

    /**
     * Fetches the parameters for the opcode signature.
     *
     * @returns {Parameter[]}
     */
    getParameters: function () {
        return this.parameters;
    },

    /**
     * Fetches the return type for the opcode signature.
     *
     * @returns {TypeInterface}
     */
    getReturnType: function () {
        return this.returnType;
    },

    /**
     * Fetches the final variadic parameter if this signature has one.
     *
     * @returns {Parameter|null}
     */
    getVariadicParameter: function () {
        var signature = this,
            parameter;

        if (signature.parameters.length === 0) {
            return null;
        }

        parameter = signature.parameters[signature.parameters.length - 1];

        return parameter.isVariadic() ?
            parameter :
            null;
    },

    /**
     * Determines whether this signature has a final variadic parameter.
     *
     * @returns {boolean}
     */
    hasVariadicParameter: function () {
        return this.getVariadicParameter() !== null;
    }
});

module.exports = Signature;
