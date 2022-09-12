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
 * Represents a value that a reference had at some point in time.
 *
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {Reference|Variable} wrappedReference The reference whose value was snapshotted.
 * @param {Value|null} value Snapshotted value: null for an undefined variable or reference.
 * @param {Reference|null} reference Reference of the reference if it had one assigned.
 * @constructor
 */
function ReferenceSnapshot(
    valueFactory,
    referenceFactory,
    futureFactory,
    wrappedReference,
    value,
    reference
) {
    // Note that as value is the resolved value, it is possible for a snapshot to have both
    // unlike other reference types.

    Reference.call(this, referenceFactory);

    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {Reference|null}
     */
    this.reference = reference;
    /**
     * @type {ReferenceSlot|null}
     */
    this.syntheticReference = null;
    /**
     * @type {Value|null}
     */
    this.value = value;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @type {Reference|Variable}
     */
    this.wrappedReference = wrappedReference;
}

util.inherits(ReferenceSnapshot, Reference);

_.extend(ReferenceSnapshot.prototype, {
    /**
     * Fetches a reference to the inner reference's value.
     *
     * Note that if the wrapped reference did not have a reference,
     * we will create an isolated reference slot to contain the snapshotted value,
     * as the wrapped reference could have been mutated by now.
     *
     * @returns {Reference}
     */
    getReference: function () {
        var snapshot = this;

        if (snapshot.reference) {
            // A reference was snapshotted, so extract a reference to it.
            return snapshot.reference.getReference();
        }

        if (snapshot.syntheticReference) {
            // We've already created a synthetic reference (see below), reuse it.
            return snapshot.syntheticReference;
        }

        if (snapshot.wrappedReference.isReference()) {
            // The snapshotted reference did not have a reference at the time,
            // but now does, so create a synthetic ReferenceSlot with the snapshotted value.
            snapshot.syntheticReference = snapshot.referenceFactory.createReferenceSlot();

            if (snapshot.value) {
                snapshot.syntheticReference.setValue(snapshot.value);
            }
        } else {
            // The snapshotted reference did not have a reference at the time,
            // and still doesn't, so create a reference slot for the wrapped reference.
            snapshot.syntheticReference = snapshot.wrappedReference.getReference();
        }

        return snapshot.syntheticReference;
    },

    /**
     * Fetches the snapshotted value if the reference was defined,
     * raising an undefined error otherwise.
     *
     * @returns {Value}
     */
    getValue: function () {
        var snapshot = this;

        if (snapshot.value) {
            return snapshot.value;
        }

        return snapshot.wrappedReference.raiseUndefined();
    },

    /**
     * Fetches the reference whose value or reference was snapshotted.
     *
     * @returns {Reference}
     */
    getWrappedReference: function () {
        return this.wrappedReference;
    },

    /**
     * {@inheritdoc}
     */
    isDefined: function () {
        var snapshot = this;

        return snapshot.value !== null;
    },

    /**
     * {@inheritdoc}
     */
    isEmpty: function () {
        return this.futureFactory.createRejection(new Exception('ReferenceSnapshot.isEmpty(): Unsupported'));
    },

    /**
     * {@inheritdoc}
     */
    isReference: function () {
        return Boolean(this.reference);
    },

    /**
     * {@inheritdoc}
     */
    isSet: function () {
        return this.futureFactory.createRejection(new Exception('ReferenceSnapshot.isSet(): Unsupported'));
    },

    /**
     * Sets a new reference for the wrapped reference.
     * Note that this snapshot is left unchanged.
     *
     * @param {Reference} reference
     * @returns {Reference}
     */
    setReference: function () {
        throw new Exception('ReferenceSnapshot.setReference(): Unsupported');
    },

    /**
     * Sets a new value for the wrapped reference.
     * Note that this snapshot is left unchanged.
     *
     * @param {Value} value
     * @returns {Value}
     */
    setValue: function (value) {
        return this.wrappedReference.setValue(value);
    },

    /**
     * Unsets the value or reference of the wrapped reference, if any.
     * Note that this snapshot is left unchanged.
     *
     * @returns {Future}
     */
    unset: function () {
        throw new Exception('ReferenceSnapshot.unset(): Unsupported');
    }
});

module.exports = ReferenceSnapshot;
