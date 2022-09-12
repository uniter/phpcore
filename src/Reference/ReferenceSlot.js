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

/**
 * Stores a value that may be referred to by multiple variables or references.
 * Note that a ReferenceSlot cannot itself have a reference assigned to it:
 * reference-assignments will change the reference that points _to_ this slot instead.
 *
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @constructor
 */
function ReferenceSlot(valueFactory, referenceFactory) {
    Reference.call(this, referenceFactory);

    /**
     * Implicitly define this slot with a value of NULL
     *
     * @type {Value}
     */
    this.value = valueFactory.createNull();
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

util.inherits(ReferenceSlot, Reference);

_.extend(ReferenceSlot.prototype, {
    /**
     * {@inheritdoc}
     */
    getForAssignment: function () {
        return this.getValue();
    },

    /**
     * {@inheritdoc}
     */
    getValue: function () {
        return this.value;
    },

    /**
     * {@inheritdoc}
     */
    isDefined: function () {
        return true;
    },

    /**
     * {@inheritdoc}
     */
    isEmpty: function () {
        return this.value.isEmpty();
    },

    /**
     * {@inheritdoc}
     */
    isReference: function () {
        return false;
    },

    /**
     * {@inheritdoc}
     */
    isSet: function () {
        return this.value.isSet();
    },

    /**
     * {@inheritdoc}
     */
    setValue: function (value) {
        this.value = value;

        return value;
    }
});

module.exports = ReferenceSlot;
