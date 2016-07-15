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
    util = require('util'),
    Reference = require('./Reference');

function VariableReference(variable) {
    this.variable = variable;
}

util.inherits(VariableReference, Reference);

_.extend(VariableReference.prototype, {
    getForAssignment: function () {
        return this.getValue();
    },

    getInstancePropertyByName: function (name) {
        return this.getValue().getInstancePropertyByName(name);
    },

    getReference: function () {
        return this;
    },

    getValue: function () {
        return this.variable.getValue();
    },

    setValue: function (value) {
        this.variable.setValue(value);

        return value;
    }
});

module.exports = VariableReference;
