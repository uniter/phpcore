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
    PHPError = phpCommon.PHPError,
    Reference = require('./Reference'),
    ReferenceSlot = require('./ReferenceSlot'),

    CANNOT_UNSET_STATIC_PROPERTY = 'core.cannot_unset_static_property';

/**
 * @param {ValueFactory} valueFactory
 * @param {CallStack} callStack
 * @param {Class} classObject
 * @param {string} name
 * @param {string} visibility "private", "protected" or "public"
 * @param {Value} value
 * @constructor
 */
function StaticPropertyReference(
    valueFactory,
    callStack,
    classObject,
    name,
    visibility,
    value
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {Class}
     */
    this.classObject = classObject;
    /**
     * @type {string}
     */
    this.name = name;
    /**
     * @type {Reference|null}
     */
    this.reference = null;
    /**
     * @type {Value}
     */
    this.value = value;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @type {string}
     */
    this.visibility = visibility;
}

util.inherits(StaticPropertyReference, Reference);

_.extend(StaticPropertyReference.prototype, {
    getName: function () {
        return this.name;
    },

    /**
     * Fetches a reference to this property's value
     *
     * @returns {Reference}
     */
    getReference: function () {
        var property = this;

        if (property.reference) {
            // This property already refers to something else, so return its target
            return property.reference;
        }

        // Implicitly define a "slot" to contain this property's value
        property.reference = new ReferenceSlot(property.valueFactory);

        if (property.value) {
            property.reference.setValue(property.value);
            property.value = null; // This property now has a reference (to the slot) and not a value
        }

        return property.reference;
    },

    getValue: function () {
        var property = this;

        return property.value ? property.value : property.reference.getValue();
    },

    getVisibility: function () {
        return this.visibility;
    },

    /**
     * Determines whether this property is defined
     *
     * @returns {boolean}
     */
    isDefined: function () {
        return true;
    },

    /**
     * Determines whether this class property is "empty" or not
     *
     * @returns {boolean}
     */
    isEmpty: function () {
        return this.getValue().isEmpty();
    },

    isReference: function () {
        return !!this.reference;
    },

    /**
     * Determines whether this class property is "set" (assigned a non-NULL value) or not
     *
     * @returns {boolean}
     */
    isSet: function () {
        return this.getValue().isSet();
    },

    setReference: function (reference) {
        var property = this;

        property.reference = reference;
        property.value = null;
    },

    setValue: function (value) {
        var property = this;

        if (property.reference) {
            property.reference.setValue(value);
        } else {
            property.value = value.getForAssignment();
        }
    },

    /**
     * Static properties cannot be unset, so this always raises an error
     *
     * @throws {PHPFatalError}
     */
    unset: function () {
        var property = this;

        property.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_UNSET_STATIC_PROPERTY, {
            className: property.classObject.getName(),
            propertyName: property.name
        });
    }
});

module.exports = StaticPropertyReference;
