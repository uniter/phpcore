/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

/**
 * Interface for references to extend to allow instanceof checking
 *
 * @constructor
 */
function Reference() {
    throw new Error('Reference is abstract, no need to instantiate it');
}

_.extend(Reference.prototype, {
    /**
     * Coerces the value from this reference and the specified one to strings,
     * concatenates them together and then assigns the result back to this reference.
     *
     * Used by the `.=` operator
     *
     * @param {Value} rightValue
     */
    concatWith: function (rightValue) {
        var reference = this;

        reference.setValue(reference.getValue().concat(rightValue));
    },

    /**
     * Subtracts the specified value from the value from this reference
     * and then assigns the result back to this reference
     *
     * Used by the `-=` operator
     *
     * @param {Value} rightValue
     */
    decrementBy: function (rightValue) {
        var reference = this;

        reference.setValue(reference.getValue().subtract(rightValue));
    },

    /**
     * Divides the value from this reference by the specified value
     * and then assigns the result back to this reference
     *
     * Used by the `/=` operator
     *
     * @param {Value} rightValue
     */
    divideBy: function (rightValue) {
        var reference = this;

        reference.setValue(reference.getValue().divide(rightValue));
    },

    /**
     * Fetches the native value of the PHP value being referred to
     *
     * @returns {*}
     */
    getNative: function () {
        return this.getValue().getNative();
    },

    getReference: function () {
        return this;
    },

    getValue: function () {
        throw new Error('Not implemented');
    },

    /**
     * Adds the specified value to the value from this reference
     * and then assigns the result back to this reference
     *
     * Used by the `+=` operator
     *
     * @param {Value} rightValue
     */
    incrementBy: function (rightValue) {
        var reference = this;

        reference.setValue(reference.getValue().add(rightValue));
    },

    /**
     * Determines whether the reference is classed as "empty" or not
     *
     * @returns {boolean}
     */
    isEmpty: function () {
        throw new Error('Not implemented');
    },

    isSet: function () {
        throw new Error('Not implemented');
    },

    /**
     * Multiplies the specified value by the value from this reference
     * and then assigns the result back to this reference
     *
     * Used by the `*=` operator
     *
     * @param {Value} rightValue
     */
    multiplyBy: function (rightValue) {
        var reference = this;

        reference.setValue(reference.getValue().multiply(rightValue));
    },

    /**
     * Decrements the stored value, returning its original value
     *
     * @returns {Value}
     */
    postDecrement: function () {
        var reference = this,
            originalValue = reference.getValue(),
            decrementedValue = originalValue.decrement();

        reference.setValue(decrementedValue);

        return originalValue;
    },

    /**
     * Increments the stored value, returning its original value
     *
     * @returns {Value}
     */
    postIncrement: function () {
        var reference = this,
            originalValue = reference.getValue(),
            incrementedValue = originalValue.increment();

        reference.setValue(incrementedValue);

        return originalValue;
    },

    /**
     * Decrements the stored value, returning its new value
     *
     * @returns {Value}
     */
    preDecrement: function () {
        var reference = this,
            decrementedValue = reference.getValue().decrement();

        reference.setValue(decrementedValue);

        return decrementedValue;
    },

    /**
     * Increments the stored value, returning its new value
     *
     * @returns {Value}
     */
    preIncrement: function () {
        var reference = this,
            incrementedValue = reference.getValue().increment();

        reference.setValue(incrementedValue);

        return incrementedValue;
    },

    setValue: function () {
        throw new Error('Not implemented');
    }
});

module.exports = Reference;
