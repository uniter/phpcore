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
    KeyReferencePair = require('../KeyReferencePair'),
    KeyValuePair = require('../KeyValuePair'),
    PHPError = phpCommon.PHPError,
    Reference = require('./Reference'),
    ReferenceSlot = require('./ReferenceSlot');

function ElementReference(valueFactory, callStack, arrayValue, key, value, reference) {
    if (value && reference) {
        throw new Error('Array elements can only have a value or be a reference, not both');
    }

    this.arrayValue = arrayValue;
    this.key = key;
    this.reference = reference || null;
    this.callStack = callStack;
    this.value = value || null;
    this.valueFactory = valueFactory;
}

util.inherits(ElementReference, Reference);

_.extend(ElementReference.prototype, {
    getKey: function () {
        return this.key;
    },

    /**
     * Fetches the relevant type of Pair class to represent this array element.
     * If the element is a reference (to a variable, another array element or object property)
     * then a KeyReferencePair will be returned.
     * Otherwise the element simply holds a value, in which case a KeyValuePair will be returned.
     *
     * @param {Value|undefined} overrideKey Optional key to use rather than this element's
     * @returns {KeyReferencePair|KeyValuePair}
     * @throws {Error} Throws when the element is neither defined as a reference nor with a value
     */
    getPairForAssignment: function (overrideKey) {
        var element = this;

        if (!overrideKey) {
            overrideKey = element.key;
        }

        if (element.value) {
            return new KeyValuePair(overrideKey, element.value.getForAssignment());
        }

        if (element.reference) {
            return new KeyReferencePair(overrideKey, element.reference);
        }

        throw new Error('Element is not defined');
    },

    /**
     * Fetches a reference to this element's value
     *
     * @returns {Reference}
     */
    getReference: function () {
        var element = this;

        if (element.reference) {
            // This element already refers to something else, so return its target
            return element.reference;
        }

        // Implicitly define a "slot" to contain this element's value
        element.reference = new ReferenceSlot(element.valueFactory);

        if (element.value) {
            element.reference.setValue(element.value);
            element.value = null; // This element now has a reference (to the slot) and not a value
        }

        return element.reference;
    },

    getValue: function () {
        var element = this;

        // Special value of native null (vs. NullValue) represents undefined
        if (!element.value && !element.reference) {
            element.callStack.raiseError(PHPError.E_NOTICE, 'Undefined ' + element.arrayValue.referToElement(element.key.getNative()));
            return element.valueFactory.createNull();
        }

        return element.value ? element.value : element.reference.getValue();
    },

    getValueReference: function () {
        var element = this;

        return element.reference || element.value || null;
    },

    /**
     * Determines whether this reference is defined
     *
     * @returns {boolean}
     */
    isDefined: function () {
        var element = this;

        return !!(element.value || element.reference);
    },

    /**
     * Determines whether the specified array element is "empty" or not
     *
     * @returns {boolean}
     */
    isEmpty: function () {
        var element = this;

        if (element.value) {
            return element.value.isEmpty();
        }

        if (element.reference) {
            return element.reference.getValue().isEmpty();
        }

        return true; // Undefined elements are empty
    },

    isReference: function () {
        return !!this.reference;
    },

    isSet: function () {
        var element = this;

        if (element.value) {
            return element.value.isSet();
        }

        if (element.reference) {
            return element.reference.getValue().isSet();
        }

        return false;
    },

    /**
     * Sets the key for this element
     *
     * @param {Value} keyValue
     */
    setKey: function (keyValue) {
        this.key = keyValue;
    },

    setReference: function (reference) {
        var element = this;

        element.reference = reference;
        element.value = null;

        element.arrayValue.defineElement(element);

        return reference;
    },

    setValue: function (value) {
        var element = this,
            isFirstElement = (element.arrayValue.getLength() === 0);

        if (element.key === null) {
            // This reference refers to a new element to push onto the end of an array
            element.arrayValue.pushElement(element);
        }

        if (element.reference) {
            element.reference.setValue(value);
        } else {
            element.arrayValue.defineElement(element);
            element.value = value.getForAssignment();
        }

        if (isFirstElement) {
            element.arrayValue.pointToElement(element);
        }

        return value;
    },

    unset: function () {
        var element = this;

        element.value = element.reference = null;
    }
});

module.exports = ElementReference;
