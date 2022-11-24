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
    util = require('util'),
    Reference = require('../Reference');

/**
 * Decorates an ElementReference to allow it to be hooked into
 *
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @param {ElementReference} decoratedElement
 * @param {ElementHookCollection} elementHookCollection
 * @constructor
 */
function HookableElementReference(
    referenceFactory,
    futureFactory,
    flow,
    decoratedElement,
    elementHookCollection
) {
    Reference.call(this, referenceFactory, futureFactory, flow);

    /**
     * @type {ElementReference}
     */
    this.decoratedElement = decoratedElement;
    /**
     * @type {ElementHookCollection}
     */
    this.elementHookCollection = elementHookCollection;
}

util.inherits(HookableElementReference, Reference);

_.extend(HookableElementReference.prototype, {
    /**
     * Fetches this element's key value
     *
     * @returns {Value}
     */
    getKey: function () {
        return this.decoratedElement.getKey();
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
    getPairForAssignment: function (overrideKey) {
        return this.decoratedElement.getPairForAssignment(overrideKey);
    },

    /**
     * Fetches a reference to this element
     *
     * @returns {HookableElementReference}
     */
    getReference: function () {
        return this;
    },

    /**
     * Fetches the value of this element (or the value of its reference, if set).
     *
     * @returns {ChainableInterface<Value>}
     */
    getValue: function () {
        return this.decoratedElement.getValue();
    },

    /**
     * Fetches either the value or the reference of this element, depending on which (if any) is set
     *
     * @returns {Reference|Value}
     */
    getValueReference: function () {
        return this.decoratedElement.getValueReference();
    },

    /**
     * Determines whether this element is "defined" (whether it has either a value or reference set)
     *
     * @returns {boolean}
     */
    isDefined: function () {
        return this.decoratedElement.isDefined();
    },

    /**
     * Determines whether the specified array element is "empty" or not
     *
     * @returns {ChainableInterface<boolean>}
     */
    isEmpty: function () {
        return this.decoratedElement.isEmpty();
    },

    /**
     * Determines whether this element has a reference set rather than a value.
     *
     * @returns {boolean}
     */
    isReference: function () {
        return this.decoratedElement.isReference();
    },

    /**
     * Determines whether this element is defined and if so, whether its value or reference is "set"
     *
     * @returns {ChainableInterface<boolean>}
     */
    isSet: function () {
        return this.decoratedElement.isSet();
    },

    /**
     * Sets the key for this element
     *
     * @param {Value} keyValue
     */
    setKey: function (keyValue) {
        this.decoratedElement.setKey(keyValue);
    },

    /**
     * Sets a reference for this element to refer to, clearing any value it may currently have.
     *
     * @param {Reference} reference
     */
    setReference: function (reference) {
        var element = this;

        element.decoratedElement.setReference(reference);
        element.elementHookCollection.handleElementReferenceSet(element, reference);
    },

    /**
     * Sets a value for this element to have, clearing any reference it may currently have
     *
     * @param {Value} value
     * @returns {ChainableInterface<Value>}
     */
    setValue: function (value) {
        var element = this;

        return element.decoratedElement.setValue(value).next(function () {
            element.elementHookCollection.handleElementValueSet(element, value);

            return value;
        });
    },

    /**
     * Unsets this element, so that it no longer refers to a reference or holds a value
     *
     * @returns {ChainableInterface}
     */
    unset: function () {
        var element = this;

        return element.decoratedElement.unset().next(function () {
            element.elementHookCollection.handleElementUnset(element);
        });
    }
});

module.exports = HookableElementReference;
