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
     * Fetches the number of parameters whose arguments (if specified) must be specified initially.
     *
     * @returns {number}
     */
    getInitialParameterCount: function () {
        var parameterIndex,
            signature = this;

        for (parameterIndex = signature.parameters.length - 1; parameterIndex >= 0; parameterIndex--) {
            if (signature.parameters[parameterIndex].isInitial()) {
                return parameterIndex + 1;
            }
        }

        return 0;
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
     * Determines whether this signature has a final variadic parameter.
     *
     * @returns {boolean}
     */
    hasVariadicParameter: function () {
        var signature = this;

        return signature.parameters.length > 0 &&
            signature.parameters[signature.parameters.length - 1].isVariadic();
    }
});

module.exports = Signature;
