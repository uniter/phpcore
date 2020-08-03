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
    MAGIC_GET = '__get',
    MAGIC_SET = '__set',
    MAGIC_UNSET = '__unset',
    PHPError = phpCommon.PHPError,
    Reference = require('./Reference'),
    ReferenceSlot = require('./ReferenceSlot');

/**
 * @param {ValueFactory} valueFactory
 * @param {CallStack} callStack
 * @param {ObjectValue} objectValue
 * @param {Value} key
 * @param {Class} classObject Class in the hierarchy that defines the property - may be an ancestor
 * @param {string} visibility "private", "protected" or "public"
 * @param {number} index
 * @constructor
 */
function PropertyReference(valueFactory, callStack, objectValue, key, classObject, visibility, index) {
    /**
     * @type {Class}
     */
    this.classObject = classObject;
    /**
     * @type {number}
     */
    this.index = index;
    /**
     * @type {ObjectValue}
     */
    this.objectValue = objectValue;
    /**
     * @type {Value}
     */
    this.key = key;
    /**
     * @type {Reference|null}
     */
    this.reference = null;
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * Value of this property - a native null value indicates that the property is not defined
     *
     * @type {Value|null}
     */
    this.value = null;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @type {string}
     */
    this.visibility = visibility;
}

util.inherits(PropertyReference, Reference);

_.extend(PropertyReference.prototype, {
    /**
     * Fetches the unique name of this property as viewed from outside the class (eg. when casting to array)
     *
     * @returns {*}
     */
    getExternalName: function () {
        var property = this;

        switch (property.visibility) {
            case 'private':
                return '\0' + property.classObject.getName() + '\0' + property.key.getNative();
            case 'protected':
                return '\0*\0' + property.key.getNative();
            default:
                return property.key.getNative();
        }
    },

    /**
     * Fetches the index of this property within its object
     *
     * @returns {number}
     */
    getIndex: function () {
        return this.index;
    },

    getKey: function () {
        return this.key;
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

    /**
     * Fetches the value of this property on its object. If it is not defined,
     * and a magic __get getter method is defined, it will be called,
     * otherwise a notice will be raised and NULL returned
     *
     * @returns {Value}
     */
    getValue: function () {
        var property = this;

        // Special value of native null (vs. NullValue) represents undefined
        if (!property.isDefined()) {
            if (property.objectValue.isMethodDefined(MAGIC_GET)) {
                // Magic getter method is defined, so use it
                return property.objectValue.callMethod(MAGIC_GET, [property.key]);
            }

            property.callStack.raiseError(
                PHPError.E_NOTICE,
                'Undefined ' + property.objectValue.referToElement(
                    property.key.getNative()
                )
            );

            return property.valueFactory.createNull();
        }

        if (property.value) {
            return property.value;
        }

        if (property.reference) {
            return property.reference.getValue();
        }

        throw new Error('Defined properties should have a value or reference assigned');
    },

    /**
     * Fetches the visibility of this property
     *
     * @returns {string}
     */
    getVisibility: function () {
        return this.visibility;
    },

    /**
     * Sets the initial value for this property, ignoring any magic setter
     *
     * @param {Value} value
     */
    initialise: function (value) {
        this.value = value.getForAssignment();
    },

    /**
     * Determines whether this property is defined. If assigned a value of NULL,
     * the property will still be considered defined
     *
     * @returns {boolean}
     */
    isDefined: function () {
        var property = this;

        if (property.reference) {
            return true;
        }

        // This property is defined if it has a non-native null value -
        // if it is defined but with a value of PHP NULL, `.value` will be an instance of NullValue
        return property.value !== null;
    },

    /**
     * Determines whether this object property is "empty" or not
     *
     * @returns {boolean}
     */
    isEmpty: function () {
        var property = this;

        if (property.isDefined()) {
            return property.getValue().isEmpty();
        }

        if (property.objectValue.isMethodDefined(MAGIC_GET)) {
            // Magic getter method is defined, so use it to determine the property's value
            // and then check _that_ for being "empty"
            return property.objectValue.callMethod(MAGIC_GET, [property.key]).isEmpty();
        }

        // Property is not defined and there is no magic getter,
        // so the property must be empty as it is unset and undefined
        return true;
    },

    isReference: function () {
        return !!this.reference;
    },

    /**
     * Determines whether this property is "set".
     * A set property must be both defined and have a non-NULL value
     *
     * @returns {boolean}
     */
    isSet: function () {
        var property = this,
            defined = property.isDefined();

        if (!defined) {
            return false;
        }

        // Check that the property resolves to something other than null,
        // otherwise it is not set
        // (no need to check for a value of native null - meaning an undefined property -
        //  as the check for that is done just above)
        return property.value.getType() !== 'null';
    },

    /**
     * Determines whether this property is visible from the calling scope
     * - for a private property, the calling scope must be inside that class
     * - for a protected property, the calling scope must be inside that class or an ancestor or descendant of it
     * - public properties are visible from everywhere
     *
     * @returns {boolean}
     */
    isVisible: function () {
        var property = this,
            // Fetch the class that the current line of PHP code is executing inside (if any)
            callingClass = property.callStack.getCurrentClass();

        if (property.getVisibility() === 'private') {
            // Private properties are only accessible by the class that defines them
            return callingClass &&
                property.classObject.getName() === callingClass.getName();
        }

        if (property.getVisibility() === 'protected') {
            // Protected properties may be accessed by the class that defines them
            // or an ancestor or descendant of it
            return callingClass &&
                callingClass.isInFamilyOf(property.classObject);
        }

        // Public visibility - public properties are always visible
        return true;
    },

    setReference: function (reference) {
        var property = this;

        property.reference = reference;

        return reference;
    },

    /**
     * Sets the value of this property on its object. If it is not defined,
     * and a magic __set setter method is defined, it will be called,
     * otherwise the property will be dynamically defined on the object
     *
     * @param {Value} value
     * @returns {Value}
     */
    setValue: function (value) {
        var property = this,
            isFirstProperty = (property.objectValue.getLength() === 0),
            valueForAssignment;

        function pointIfFirstProperty() {
            if (isFirstProperty) {
                property.objectValue.pointToProperty(property);
            }
        }

        if (property.reference) {
            property.reference.setValue(value);

            pointIfFirstProperty();

            return value;
        }

        valueForAssignment = value.getForAssignment();

        if (!property.isDefined()) {
            // Property is not defined - attempt to call magic setter method first,
            // otherwise just dynamically define the new property by setting its value below
            if (property.objectValue.isMethodDefined(MAGIC_SET)) {
                property.objectValue.callMethod(MAGIC_SET, [property.key, valueForAssignment]);

                return value;
            }
        }

        // No magic setter is defined - store the value of this property directly on itself
        property.value = valueForAssignment;

        pointIfFirstProperty();

        return value;
    },

    /**
     * Marks this property as unset and undefined
     */
    unset: function () {
        var property = this;

        if (!property.isDefined()) {
            // Property is not defined - call magic unsetter method if defined
            if (property.objectValue.isMethodDefined(MAGIC_UNSET)) {
                property.objectValue.callMethod(MAGIC_UNSET, [property.key]);
            }
        }

        // Clear value and/or reference to mark as unset
        property.value = property.reference = null;
    }
});

module.exports = PropertyReference;
