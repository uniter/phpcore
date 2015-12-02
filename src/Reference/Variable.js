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

function VariableReference(variable) {
    this.variable = variable;
}

_.extend(VariableReference.prototype, {
    getForAssignment: function () {
        return this.getValue();
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
