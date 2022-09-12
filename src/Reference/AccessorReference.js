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
 * @param {Function|null} referenceGetter
 * @param {Function|null} referenceSetter
 * @param {Function|null} referenceClearer
 * @param {Function|null} definednessGetter
 * @param {Function|null} emptinessGetter
 * @param {Function|null} setnessGetter
 * @param {Function|null} undefinednessRaiser
 * @constructor
 */
function AccessorReference(
    valueFactory,
    referenceFactory,
    valueGetter,
    valueSetter,
    referenceGetter,
    referenceSetter,
    referenceClearer,
    definednessGetter,
    emptinessGetter,
    setnessGetter,
    undefinednessRaiser
) {
    Reference.call(this, referenceFactory);

    /**
     * @type {Function|null}
     */
    this.definednessGetter = definednessGetter;
    /**
     * @type {Function|null}
     */
    this.emptinessGetter = emptinessGetter;
    /**
     * @type {Function|null}
     */
    this.referenceClearer = referenceClearer;
    /**
     * @type {Function|null}
     */
    this.referenceGetter = referenceGetter;
    /**
     * @type {Function|null}
     */
    this.referenceSetter = referenceSetter;
    /**
     * @type {Function|null}
     */
    this.setnessGetter = setnessGetter;
    /**
     * @type {Function|null}
     */
    this.undefinednessRaiser = undefinednessRaiser;
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
    clearReference: function () {
        var reference = this;

        if (!reference.referenceClearer) {
            throw new Exception('Accessor cannot have its reference cleared');
        }

        reference.referenceClearer();
    },

    /**
     * {@inheritdoc}
     */
    getReference: function () {
        var reference = this;

        return reference.referenceGetter ? reference.referenceGetter() : reference;
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
    hasReferenceSetter: function () {
        return this.referenceSetter !== null;
    },

    /**
     * {@inheritdoc}
     */
    isDefined: function () {
        var reference = this;

        return reference.definednessGetter ? reference.definednessGetter() : true;
    },

    /**
     * {@inheritdoc}
     */
    isEmpty: function () {
        var reference = this;

        if (reference.emptinessGetter) {
            return reference.emptinessGetter();
        }

        return reference.getValue()
            .asFuture() // Avoid auto-boxing the boolean result as a BooleanValue.
            .next(function (resultValue) {
                return resultValue.isEmpty();
            });
    },

    /**
     * {@inheritdoc}
     */
    isReference: function () {
        return Boolean(this.referenceGetter);
    },

    /**
     * {@inheritdoc}
     */
    isSet: function () {
        var reference = this;

        if (reference.setnessGetter) {
            return reference.setnessGetter();
        }

        return reference.getValue()
            .asFuture() // Avoid auto-boxing the boolean result as a BooleanValue.
            .next(function (resultValue) {
                return resultValue.isSet();
            });
    },

    /**
     * {@inheritdoc}
     */
    raiseUndefined: function () {
        var reference = this;

        if (reference.undefinednessRaiser) {
            return reference.undefinednessRaiser();
        }

        throw new Exception(
            'Unable to raise AccessorReference as undefined - ' +
            'did you mean to provide an undefinednessRaiser?'
        );
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
