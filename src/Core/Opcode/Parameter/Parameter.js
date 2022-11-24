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
 * Represents a parameter to an opcode.
 *
 * @param {string} name
 * @param {TypeInterface} type
 * @param {boolean} isInitial
 * @param {boolean} isRequired
 * @param {boolean} isVariadic
 * @param {*} defaultArgument
 * @constructor
 */
function Parameter(
    name,
    type,
    isInitial,
    isRequired,
    isVariadic,
    defaultArgument
) {
    /**
     * @type {*}
     */
    this.defaultArgument = defaultArgument;
    /**
     * @type {boolean}
     */
    this.initial = isInitial;
    /**
     * @type {string}
     */
    this.name = name;
    /**
     * @type {boolean}
     */
    this.required = isRequired;
    /**
     * @type {TypeInterface}
     */
    this.type = type;
    /**
     * @type {boolean}
     */
    this.variadic = isVariadic;
}

_.extend(Parameter.prototype, {
    /**
     * Coerces an argument for this parameter based on its type.
     *
     * @param {*} value
     * @returns {*}
     */
    coerceArgument: function (value) {
        return this.type.coerceValue(value);
    },

    /**
     * Fetches the default argument value for this parameter.
     *
     * @returns {*}
     */
    getDefaultArgument: function () {
        return this.defaultArgument;
    },

    /**
     * Fetches the name of this parameter.
     *
     * @returns {string}
     */
    getName: function () {
        return this.name;
    },

    /**
     * Fetches the type of this parameter.
     *
     * @returns {TypeInterface}
     */
    getType: function () {
        return this.type;
    },

    /**
     * Determines whether this parameter must have its argument specified initially.
     *
     * @returns {boolean}
     */
    isInitial: function () {
        return this.initial;
    },

    /**
     * Determines whether this parameter is required.
     *
     * @returns {boolean}
     */
    isRequired: function () {
        return this.required;
    },

    /**
     * Determines whether this parameter is variadic.
     *
     * @returns {boolean}
     */
    isVariadic: function () {
        return this.variadic;
    }
});

module.exports = Parameter;
