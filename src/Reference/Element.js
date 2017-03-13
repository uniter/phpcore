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
    Reference = require('./Reference');

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
    clone: function () {
        var element = this;

        return new ElementReference(element.valueFactory, element.callStack, element.arrayValue, element.key, element.value);
    },

    getInstancePropertyByName: function (name) {
        return this.getValue().getInstancePropertyByName(name);
    },

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
     */
    getPair: function (overrideKey) {
        var element = this;

        if (!overrideKey) {
            overrideKey = element.key;
        }

        if (element.value) {
            return new KeyValuePair(overrideKey, element.value);
        }

        if (element.reference) {
            return new KeyReferencePair(overrideKey, element.reference);
        }

        throw new Error('Element is not defined');
    },

    getReference: function () {
        return this;
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

    isDefined: function () {
        var element = this;

        return element.value || element.reference;
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

        return false;
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
            element.key = element.arrayValue.pushElement(element);
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
