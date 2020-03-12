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

function AccessorReference(valueFactory, valueGetter, valueSetter) {
    this.valueFactory = valueFactory;
    this.valueGetter = valueGetter;
    this.valueSetter = valueSetter;
}

util.inherits(AccessorReference, Reference);

_.extend(AccessorReference.prototype, {
    getReference: function () {
        return this;
    },

    getValue: function () {
        var reference = this;

        return reference.valueFactory.coerce(reference.valueGetter());
    },

    /**
     * Determines whether this reference is defined
     *
     * @returns {boolean}
     */
    isDefined: function () {
        return true;
    },

    setValue: function (value) {
        this.valueSetter(value.getNative());

        return value;
    }
});

module.exports = AccessorReference;
