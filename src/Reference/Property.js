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
    Reference = require('./Reference');

/**
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {CallStack} callStack
 * @param {Flow} flow
 * @param {ObjectValue} objectValue
 * @param {Value} key
 * @param {Class} classObject Class in the hierarchy that defines the property - may be an ancestor
 * @param {string} visibility "private", "protected" or "public"
 * @param {number} index
 * @constructor
 */
function PropertyReference(
    valueFactory,
    referenceFactory,
    futureFactory,
    callStack,
    flow,
    objectValue,
    key,
    classObject,
    visibility,
    index
) {
    Reference.call(this, referenceFactory, futureFactory, flow);

    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {Class}
     */
    this.classObject = classObject;
    /**
     * @type {number}
     */
    this.index = index;
    /**
     * @type {Value}
     */
    this.key = key;
    /**
     * @type {ObjectValue}
     */
    this.objectValue = objectValue;
    /**
     * @type {Reference|null}
     */
    this.reference = null;
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
     * Fetches the native string name of this property.
     *
     * @returns {string}
     */
    getName: function () {
        return this.key.getNative();
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
        property.reference = property.referenceFactory.createReferenceSlot();

        if (property.value) {
            property.reference.setValue(property.value).yieldSync();
            property.value = null; // This property now has a reference (to the slot) and not a value
        }

        return property.reference;
    },

    /**
     * Fetches the value of this property on its object. If it is not defined,
     * and a magic __get getter method is defined, it will be called,
     * otherwise a notice will be raised and NULL returned.
     *
     * @returns {ChainableInterface<Value>}
     */
    getValue: function () {
        var property = this;

        if (!property.isDefined()) {
            if (property.objectValue.isMethodDefined(MAGIC_GET)) {
                // Magic getter method is defined, so use it
                return property.objectValue.callMethod(MAGIC_GET, [property.key]);
            }

            return property.raiseUndefined();
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
     * @returns {ChainableInterface<boolean>}
     */
    isEmpty: function () {
        var property = this;

        if (property.isDefined()) {
            return property.getValue().isEmpty();
        }

        if (property.objectValue.isMethodDefined(MAGIC_GET)) {
            // Magic getter method is defined, so use it to determine the property's value
            // and then check _that_ for being "empty"
            return property.objectValue.callMethod(MAGIC_GET, [property.key])
                .next(function (resultReference) {
                    return resultReference.isEmpty();
                });
        }

        // Property is not defined and there is no magic getter,
        // so the property must be empty as it is unset and undefined
        return property.futureFactory.createPresent(true);
    },

    /**
     * {@inheritdoc}
     */
    isReadable: function () {
        var property = this;

        if (property.isDefined()) {
            return true;
        }

        // Detect property overloading otherwise.
        return property.objectValue.isMethodDefined(MAGIC_GET);
    },

    /**
     * {@inheritdoc}
     */
    isReference: function () {
        return Boolean(this.reference);
    },

    /**
     * Determines whether this property is "set".
     * A set property must be both defined and have a non-NULL value.
     *
     * @returns {ChainableInterface<boolean>}
     */
    isSet: function () {
        var property = this,
            defined = property.isDefined();

        if (!defined) {
            return property.futureFactory.createPresent(false);
        }

        // Check that the property resolves to something other than null,
        // otherwise it is not set
        // (no need to check for a value of native null - meaning an undefined property -
        //  as the check for that is done just above)
        return property.futureFactory.createPresent(property.value.getType() !== 'null');
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

    /**
     * {@inheritdoc}
     */
    raiseUndefined: function () {
        var property = this;

        property.callStack.raiseError(
            PHPError.E_NOTICE,
            'Undefined ' + property.objectValue.referToElement(
                property.key.getNative()
            )
        );

        return property.valueFactory.createNull();
    },

    /**
     * {@inheritdoc}
     */
    setReference: function (reference) {
        var property = this;

        property.reference = reference;

        return reference;
    },

    /**
     * Sets the value of this property on its object. If it is not defined,
     * and a magic __set setter method is defined, it will be called,
     * otherwise the property will be dynamically defined on the object.
     *
     * @param {Value} value
     * @returns {Value}
     */
    setValue: function (value) {
        var property = this,
            valueForAssignment;

        if (property.reference) {
            // Note that we don't call .getForAssignment() here as the eventual reference will do so.
            return property.reference.setValue(value);
        }

        valueForAssignment = value.getForAssignment();

        if (!property.isDefined()) {
            // Property is not defined - attempt to call magic setter method first,
            // otherwise just dynamically define the new property by setting its value below.
            if (property.objectValue.isMethodDefined(MAGIC_SET)) {
                return property.objectValue.callMethod(MAGIC_SET, [property.key, valueForAssignment])
                    // Ignore the return value of __set(), but still await it as it may return a Future.
                    .next(function () {
                        return value;
                    });
            }
        }

        // No magic setter is defined - store the value of this property directly on itself.
        property.value = valueForAssignment;

        return valueForAssignment;
    },

    /**
     * Marks this property as unset and undefined
     *
     * @returns {Future}
     */
    unset: function () {
        var property = this;

        if (!property.isDefined()) {
            // Property is not defined - call magic unsetter method if defined
            if (property.objectValue.isMethodDefined(MAGIC_UNSET)) {
                return property.objectValue.callMethod(MAGIC_UNSET, [property.key]);
            }
        }

        // Clear value and/or reference to mark as unset
        property.value = property.reference = null;

        return property.futureFactory.createPresent(null);
    }
});

module.exports = PropertyReference;
