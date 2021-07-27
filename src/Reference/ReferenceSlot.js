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
 * Stores a value that may be referred to by multiple variables or references
 *
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {Flow} flow
 * @constructor
 */
function ReferenceSlot(valueFactory, referenceFactory, flow) {
    Reference.call(this, referenceFactory, flow);

    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
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

    // /**
    //  * {@inheritdoc}
    //  */
    // setAsValueOrReferenceOf: function (arrayReference) {
    //     var reference = this;
    //
    //     arrayReference.getValue().getPushElement().setReference(reference);
    //
    //     return reference.getValue();
    // },

    /**
     * {@inheritdoc}
     */
    setValue: function (value) {
        this.value = value;

        return value;
    }
});

module.exports = ReferenceSlot;
