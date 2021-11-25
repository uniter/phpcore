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
 * @param {FutureFactory} futureFactory
 * @param {Object} options
 * @constructor
 */
function NullReference(valueFactory, futureFactory, options) {
    options = options || {};

    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {Function|null}
     */
    this.onSet = options.onSet;
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
    getReference: function () {
        return this;
    },

    /**
     * {@inheritdoc}
     */
    getValue: function () {
        return this.valueFactory.createNull();
    },

    /**
     * Determines whether this reference is defined
     *
     * @returns {boolean}
     */
    isDefined: function () {
        return false;
    },

    /**
     * Determines whether this reference is empty or not
     * (NULL references are always empty)
     *
     * @returns {Future<boolean>}
     */
    isEmpty: function () {
        return this.futureFactory.createPresent(true); // PHP NULL is classed as empty
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
    setValue: function () {
        var reference = this;

        if (reference.onSet) {
            reference.onSet();
        }
    }
});

module.exports = NullReference;
