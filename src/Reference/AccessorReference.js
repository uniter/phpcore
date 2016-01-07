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

function AccessorReference(valueFactory, valueGetter, valueSetter) {
    this.valueFactory = valueFactory;
    this.valueGetter = valueGetter;
    this.valueSetter = valueSetter;
}

_.extend(AccessorReference.prototype, {
    getValue: function () {
        var reference = this;

        return reference.valueFactory.coerce(reference.valueGetter());
    },

    setValue: function (value) {
        this.valueSetter(value.unwrapForJS());

        return value;
    }
});

module.exports = AccessorReference;
