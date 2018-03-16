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
