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
    };

/**
 * Interface for references to extend to allow instanceof checking
 *
 * @param {ReferenceFactory} referenceFactory
 * @param {Flow} flow
 * @constructor
 */
function Reference(referenceFactory, flow) {
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
}

_.extend(Reference.prototype, {
    /**
     * Subtracts the specified value from the value from this reference
     * and then assigns the result back to this reference
     *
     * Used by the `-=` operator
     *
     * @deprecated Remove all of these types of method from Reference, and from Variable too
     * @param {Value} rightValue
     */
    decrementBy: function (rightValue) {
        var reference = this;

        reference.setValue(reference.getValue().subtract(rightValue));
    },

    /**
     * Formats the reference (which may not be defined) for display in stack traces etc.
     *
     * @returns {string}
     */
    formatAsString: function () {
        var reference = this;

        return reference.isDefined() ?
            reference.getValue().formatAsString() :
            'NULL';
    },

    /**
     * Fetches the value of this reference when it is being assigned to a variable or another reference.
     * This is used to implement the copy-on-assignment behaviour of PHP arrays
     *
     * @returns {Value}
     */
    getForAssignment: throwUnimplemented('getForAssignment'),

    /**
     * Fetches an instance property of this reference's value (assuming it contains an object) by its name
     *
     * @param {Value} nameValue
     * @returns {PropertyReference}
     */
    getInstancePropertyByName: function (nameValue) {
        return this.getValue().getInstancePropertyByName(nameValue);
    },

    /**
     * Fetches the native value of the PHP value being referred to
     *
     * @returns {*}
     */
    getNative: function () {
        return this.getValue().getNative();
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
     * Fetches the value this reference stores, if any
     *
     * @returns {Value|null}
     */
    getValue: throwUnimplemented('getValue'),

    /**
     * Returns this reference's value if defined, NULL otherwise.
     * No notice/warning will be raised if the reference has no value defined.
     *
     * @return {Value}
     */
    getValueOrNull: function () {
        var reference = this;

        return reference.isDefined() ?
            reference.getValue() :
            reference.valueFactory.createNull();
    },

    /**
     * Determines whether this reference is defined
     *
     * @returns {boolean}
     */
    isDefined: throwUnimplemented('isDefined'),

    /**
     * Determines whether the reference is classed as "empty" or not
     *
     * @returns {boolean|Future<boolean>}
     */
    isEmpty: throwUnimplemented('isEmpty'),

    /**
     * Determines whether the reference is classed as "set" or not
     *
     * @returns {boolean}
     */
    isSet: throwUnimplemented('isSet'),

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

    /**
     * Sets the value of this reference. If it was already assigned a value it will be overwritten,
     * otherwise if it was already assigned a sub-reference then that reference will be assigned the value
     *
     * @param {Value} value
     * @returns {Value} Returns the value that was set
     */
    setValue: throwUnimplemented('setValue')
});

module.exports = Reference;
