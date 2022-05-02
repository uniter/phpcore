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
 * Represents a special type of reference where a getter and setter callback function are provided.
 *
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {Function} valueGetter
 * @param {Function|null} valueSetter
 * @param {Function|null} referenceSetter
 * @constructor
 */
function AccessorReference(
    valueFactory,
    referenceFactory,
    valueGetter,
    valueSetter,
    referenceSetter
) {
    Reference.call(this, referenceFactory);

    /**
     * @type {Function|null}
     */
    this.referenceSetter = referenceSetter;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @type {Function}
     */
    this.valueGetter = valueGetter;
    /**
     * @type {Function|null}
     */
    this.valueSetter = valueSetter;
}

util.inherits(AccessorReference, Reference);

_.extend(AccessorReference.prototype, {
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
        return this.getValue()
            .asFuture() // Avoid auto-boxing the boolean result as a BooleanValue.
            .next(function (resultValue) {
                return resultValue.isEmpty();
            });
    },

    /**
     * {@inheritdoc}
     */
    isSet: function () {
        return this.getValue()
            .asFuture() // Avoid auto-boxing the boolean result as a BooleanValue.
            .next(function (resultValue) {
                return resultValue.isSet();
            });
    },

    /**
     * {@inheritdoc}
     */
    setReference: function (newReference) {
        var reference = this;

        if (!reference.referenceSetter) {
            throw new Exception('Accessor cannot have a reference set');
        }

        reference.referenceSetter(newReference);
    },

    /**
     * {@inheritdoc}
     */
    setValue: function (value) {
        var reference = this,
            presentSetValue;

        if (!reference.valueSetter) {
            throw new Exception('Accessor is read-only');
        }

        return value.next(function (presentValue) {
            presentSetValue = presentValue;

            return reference.valueSetter(presentValue);
        }).next(function () {
            // Return the set value as the result.
            return presentSetValue;
        });
    }
});

module.exports = AccessorReference;
