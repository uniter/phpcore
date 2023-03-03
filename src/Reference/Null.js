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
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @param {Object} options
 * @constructor
 */
function NullReference(
    valueFactory,
    referenceFactory,
    futureFactory,
    flow,
    options
) {
    options = options || {};

    Reference.call(this, referenceFactory, futureFactory, flow);

    /**
     * @type {Function|null}
     */
    this.onSet = options.onSet || null;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

util.inherits(NullReference, Reference);

_.extend(NullReference.prototype, {
    /**
     * {@inheritdoc}
     */
    getValue: function () {
        return this.valueFactory.createNull();
    },

    /**
     * {@inheritdoc}
     */
    isDefined: function () {
        return false;
    },

    /**
     * Determines whether this reference is empty or not
     * (NULL references are always empty).
     *
     * @returns {ChainableInterface<boolean>}
     */
    isEmpty: function () {
        return this.futureFactory.createPresent(true); // PHP NULL is classed as empty.
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
        return this.futureFactory.createPresent(false);
    },

    /**
     * {@inheritdoc}
     */
    raiseUndefined: function () {
        return this.valueFactory.createNull();
    },

    /**
     * {@inheritdoc}
     */
    setValue: function (value) {
        var reference = this;

        if (reference.onSet) {
            reference.onSet();
        }

        return value;
    }
});

module.exports = NullReference;
