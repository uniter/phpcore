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
 * @param {boolean} isVariadic
 * @constructor
 */
function Parameter(name, type, isVariadic) {
    /**
     * @type {string}
     */
    this.name = name;
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
     * Determines whether this parameter is variadic.
     *
     * @returns {boolean}
     */
    isVariadic: function () {
        return this.variadic;
    }
});

module.exports = Parameter;
