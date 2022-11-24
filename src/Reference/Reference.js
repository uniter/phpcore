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
    throwUnimplemented = function (functionName) {
        return function () {
            throw new Error('Reference.' + functionName + '() :: Not implemented');
        };
    },
    Promise = require('lie');

/**
 * Interface for references to extend to allow instanceof checking.
 *
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @constructor
 * @implements {ChainableInterface}
 */
function Reference(referenceFactory, futureFactory, flow) {
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
}

_.extend(Reference.prototype, {
    /**
     * Returns the value or reference of this reference, suitable for use as an array element.
     * Note that Futures will be returned unchanged ready to be awaited.
     *
     * PHP references will be represented as ReferenceElements instead.
     *
     * @returns {ChainableInterface<Reference|Value|Variable>}
     */
    asArrayElement: function () {
        return this.getValue().next(function (value) {
            return value.getForAssignment();
        });
    },

    /**
     * Returns a Future that will resolve to the native value of the PHP value being referred to.
     *
     * @returns {ChainableInterface<*>}
     */
    asEventualNative: function () {
        return this.getValue().next(function (value) {
            return value.asEventualNative();
        });
    },

    /**
     * {@inheritdoc}
     */
    asValue: function () {
        return this.getValue();
    },

    /**
     * Clears any reference this variable may have assigned.
     */
    clearReference: throwUnimplemented('clearReference'),

    /**
     * Fetches the value of this reference when it is being assigned to a variable or another reference.
     * This is used to implement the copy-on-assignment behaviour of PHP arrays
     *
     * @returns {Value}
     */
    getForAssignment: throwUnimplemented('getForAssignment'),

    /**
     * Fetches the native value of the PHP value being referred to
     *
     * @returns {*}
     */
    getNative: function () {
        return this.getValue().yieldSync().getNative();
    },

    /**
     * Fetches this reference
     *
     * @returns {Reference}
     */
    getReference: function () {
        return this;
    },

    /**
     * Fetches the value this reference stores, if any.
     *
     * @returns {ChainableInterface<Value>}
     */
    getValue: throwUnimplemented('getValue'),

    /**
     * Returns this reference's value if defined, null otherwise.
     * No notice/warning will be raised if the reference has no value defined.
     *
     * Note that unlike .getValueOrNull(), native null is returned if not defined.
     *
     * @returns {ChainableInterface<Value>|null}
     */
    getValueOrNativeNull: function () {
        var reference = this;

        return reference.isReadable() ? reference.getValue() : null;
    },

    /**
     * Returns this reference's value if defined, NULL otherwise.
     * No notice/warning will be raised if the reference has no value defined.
     *
     * @return {ChainableInterface<Value>}
     */
    getValueOrNull: function () {
        var reference = this;

        return reference.isReadable() ?
            reference.getValue() :
            reference.valueFactory.createNull();
    },

    /**
     * Determines whether this reference itself intercepts further reference assignments.
     *
     * @returns {boolean}
     */
    hasReferenceSetter: function () {
        return false;
    },

    /**
     * Determines whether this reference is defined.
     *
     * @returns {boolean}
     */
    isDefined: throwUnimplemented('isDefined'),

    /**
     * Determines whether the reference is classed as "empty" or not
     *
     * @returns {ChainableInterface<boolean>}
     */
    isEmpty: throwUnimplemented('isEmpty'),

    /**
     * {@inheritdoc}
     */
    isFuture: function () {
        return false;
    },

    /**
     * Determines whether this reference is readable.
     * Some values may be undefined but still readable, e.g. overloaded properties using __get(...).
     *
     * @returns {boolean}
     */
    isReadable: function () {
        return this.isDefined();
    },

    /**
     * Determines whether this reference has a reference rather than value assigned.
     *
     * @return {boolean}
     */
    isReference: throwUnimplemented('isReference'),

    /**
     * Determines whether this reference may be referenced (shared interface with Value and Variable).
     *
     * @returns {boolean}
     */
    isReferenceable: function () {
        return true;
    },

    /**
     * Determines whether the reference is classed as "set" or not
     *
     * @returns {ChainableInterface<boolean>}
     */
    isSet: throwUnimplemented('isSet'),

    /**
     * {@inheritdoc}
     */
    next: function (resolveHandler) {
        var reference = this,
            result;

        if (!resolveHandler) {
            return reference;
        }

        try {
            result = resolveHandler(reference);
        } catch (error) {
            return reference.futureFactory.createRejection(error);
        }

        result = reference.flow.chainify(result);

        return result;
    },

    /**
     * Raises an error for when this reference is not defined.
     *
     * @returns {NullValue}
     */
    raiseUndefined: throwUnimplemented('raiseUndefined'),

    /**
     * Sets a new reference for this reference.
     *
     * @param {Reference} reference
     */
    setReference: throwUnimplemented('setReference'),

    /**
     * Sets the value of this reference. If it was already assigned a value it will be overwritten,
     * otherwise if it was already assigned a sub-reference then that reference will be assigned the value.
     *
     * @param {Value} value
     * @returns {ChainableInterface<Value>} Returns the value that was set
     */
    setValue: throwUnimplemented('setValue'),

    /**
     * Derives a promise of the PHP value being referred to (shared interface with Future).
     *
     * @returns {Promise<Value>}
     */
    toPromise: function () {
        return Promise.resolve(this);
    },

    /**
     * Unsets the value of this reference.
     *
     * @returns {Future}
     */
    unset: throwUnimplemented('unset'),

    /**
     * {@inheritdoc}
     */
    yieldSync: function () {
        return this;
    }
});

module.exports = Reference;
