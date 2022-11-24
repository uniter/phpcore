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
 * Represents a special type of reference where callback functions are provided.
 *
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @param {Function} valueGetter
 * @param {Function|null} valueSetter
 * @param {Function|null} unsetter
 * @param {Function|null} referenceGetter
 * @param {Function|null} referenceSetter
 * @param {Function|null} referenceClearer
 * @param {Function|null} definednessGetter
 * @param {Function|null} readablenessGetter
 * @param {Function|null} emptinessGetter
 * @param {Function|null} setnessGetter
 * @param {Function|null} referencenessGetter
 * @param {Function|null} undefinednessRaiser
 * @constructor
 */
function AccessorReference(
    valueFactory,
    referenceFactory,
    futureFactory,
    flow,
    valueGetter,
    valueSetter,
    unsetter,
    referenceGetter,
    referenceSetter,
    referenceClearer,
    definednessGetter,
    readablenessGetter,
    emptinessGetter,
    setnessGetter,
    referencenessGetter,
    undefinednessRaiser
) {
    Reference.call(this, referenceFactory, futureFactory, flow);

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
    this.readablenessGetter = readablenessGetter;
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
    this.referencenessGetter = referencenessGetter;
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
     * @type {Function|null}
     */
    this.unsetter = unsetter;
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

        if (!reference.isReadable()) {
            return reference.raiseUndefined();
        }

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
            .next(function (resultValue) {
                return resultValue.isEmpty();
            });
    },

    /**
     * {@inheritdoc}
     */
    isReadable: function () {
        var reference = this;

        return reference.readablenessGetter ?
            reference.readablenessGetter() :
            reference.isDefined();
    },

    /**
     * {@inheritdoc}
     */
    isReference: function () {
        var reference = this;

        return reference.referencenessGetter ?
            reference.referencenessGetter() :
            false;
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
        var reference = this;

        if (!reference.valueSetter) {
            throw new Exception('Accessor is read-only');
        }

        return reference.futureFactory
            .createFutureChain(function () {
                // Capture any error thrown by the setter and convert to a rejected Future.
                return reference.valueSetter(value);
            })
            .next(function (setterResultValue) {
                // Return the coerced result from the setter or fall back to the set value as the result.
                return setterResultValue ?
                    reference.valueFactory.coerce(setterResultValue) :
                    value;
            });
    },

    /**
     * {@inheritdoc}
     */
    unset: function () {
        var reference = this;

        if (!reference.unsetter) {
            throw new Exception('Accessor cannot be unset');
        }

        return reference.flow.chainify(reference.unsetter())
            .next(function () {
                return null;
            });
    }
});

module.exports = AccessorReference;
