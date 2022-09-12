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
 * Creates opcode parameters.
 *
 * @param {class} Parameter
 * @constructor
 */
function ParameterFactory(Parameter) {
    /**
     * @type {class}
     */
    this.Parameter = Parameter;
}

_.extend(ParameterFactory.prototype, {
    /**
     * Creates a new Parameter.
     *
     * @param {string} name
     * @param {TypeInterface} type
     * @param {boolean} isVariadic
     * @returns {Parameter}
     */
    createParameter: function (name, type, isVariadic) {
        return new this.Parameter(name, type, isVariadic);
    }
});

module.exports = ParameterFactory;
