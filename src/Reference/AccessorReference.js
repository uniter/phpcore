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
    phpCommon = require('phpcommon'),
    util = require('util'),
    Exception = phpCommon.Exception,
    Reference = require('./Reference');

/**
 * Represents a special type of reference where a getter and setter callback function are provided
 *
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {Flow} flow
 * @param {Function} valueGetter
 * @param {Function|null} valueSetter
 * @constructor
 */
function AccessorReference(
    valueFactory,
    referenceFactory,
    flow,
    valueGetter,
    valueSetter
) {
    Reference.call(this, referenceFactory, flow);

    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @type {Function}
     */
    this.valueGetter = valueGetter;
    /**
     * @type {Function}
     */
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
     * {@inheritdoc}
     */
    isDefined: function () {
        return true;
    },

    /**
     * {@inheritdoc}
     */
    isEmpty: function () {
        return this.getValue().next(function (resultValue) {
            return resultValue.isEmpty();
        });
    },

    /**
     * {@inheritdoc}
     */
    isSet: function () {
        return this.getValue().next(function (resultValue) {
            return resultValue.isSet();
        });
    },

    setValue: function (value) {
        var reference = this;

        if (!reference.valueSetter) {
            throw new Exception('Accessor is read-only');
        }

        return value.next(function (presentValue) {
            reference.valueSetter(presentValue.getNative());
        });
    }
});

module.exports = AccessorReference;
