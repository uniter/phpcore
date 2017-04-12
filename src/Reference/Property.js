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
    hasOwn = {}.hasOwnProperty,
    phpCommon = require('phpcommon'),
    util = require('util'),
    MAGIC_GET = '__get',
    MAGIC_SET = '__set',
    PHPError = phpCommon.PHPError,
    Reference = require('./Reference');

/**
 * @param {ValueFactory} valueFactory
 * @param {CallStack} callStack
 * @param {ObjectValue} objectValue
 * @param {object} nativeObject
 * @param {Value} key
 * @constructor
 */
function PropertyReference(valueFactory, callStack, objectValue, nativeObject, key) {
    /**
     * @type {ObjectValue}
     */
    this.objectValue = objectValue;
    /**
     * @type {Value}
     */
    this.key = key;
    /**
     * @type {object}
     */
    this.nativeObject = nativeObject;
    /**
     * @type {Reference|null}
     */
    this.reference = null;
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

util.inherits(PropertyReference, Reference);

_.extend(PropertyReference.prototype, {
    clone: function () {
        var property = this;

        return new PropertyReference(
            property.valueFactory,
            property.callStack,
            property.objectValue,
            property.nativeObject,
            property.key
        );
    },

    getInstancePropertyByName: function (name) {
        return this.getValue().getInstancePropertyByName(name);
    },

    getKey: function () {
        return this.key;
    },

    getReference: function () {
        return this;
    },

    /**
     * Fetches the value of this property on its object. If it is not defined,
     * and a magic __get getter method is defined, it will be called,
     * otherwise a notice will be raised and NULL returned
     *
     * @returns {Value}
     */
    getValue: function () {
        var property = this,
            nativeObject = property.nativeObject,
            nativeKey = property.key.getNative();

        // Special value of native null (vs. NullValue) represents undefined
        if (!property.isDefined()) {
            if (property.objectValue.isMethodDefined(MAGIC_GET)) {
                // Magic getter method is defined, so use it
                return property.objectValue.callMethod(MAGIC_GET, [property.key]);
            }

            property.callStack.raiseError(
                PHPError.E_NOTICE,
                'Undefined ' + property.objectValue.referToElement(
                    nativeKey
                )
            );

            return property.valueFactory.createNull();
        }

        return property.reference ?
            property.reference.getValue() :
            property.valueFactory.coerce(
                nativeObject[nativeKey]
            );
    },

    /**
     * Determines whether this property is defined. If assigned a value of NULL,
     * the property will still be considered defined
     *
     * @returns {boolean}
     */
    isDefined: function () {
        var defined = true,
            otherObject,
            property = this,
            nativeObject = property.nativeObject,
            nativeKey = property.key.getNative();

        if (property.reference) {
            return true;
        }

        // Allow properties inherited via the prototype chain up to but not including Object.prototype
        if (!hasOwn.call(nativeObject, nativeKey)) {
            otherObject = nativeObject;

            do {
                otherObject = Object.getPrototypeOf(otherObject);
                if (!otherObject || otherObject === Object.prototype) {
                    defined = false;
                    break;
                }
            } while (!hasOwn.call(otherObject, nativeKey));
        }

        return defined;
    },

    /**
     * Determines whether this object property is "empty" or not
     *
     * @returns {boolean}
     */
    isEmpty: function () {
        var property = this;

        return !property.isDefined() || property.getValue().isEmpty();
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
            defined = property.isDefined(),
            nativeObject = property.nativeObject,
            nativeKey = property.key.getNative();

        if (!defined) {
            return false;
        }

        // Check that the property resolves to something other than null,
        // otherwise it is not set
        return property.valueFactory.coerce(nativeObject[nativeKey]).getType() !== 'null';
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
            nativeObject = property.nativeObject,
            nativeKey = property.key.getNative(),
            isFirstProperty = (property.objectValue.getLength() === 0),
            valueForAssignment;

        // Ensure we write the native value to properties on native JS objects
        function getValueForAssignment() {
            if (property.objectValue.getClassName() === 'JSObject') {
                return value.getNative();
            }

            return value.getForAssignment();
        }

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

        valueForAssignment = getValueForAssignment();

        if (!property.isDefined()) {
            // Property is not defined - attempt to call magic setter method first,
            // otherwise just dynamically define the new property
            if (property.objectValue.isMethodDefined(MAGIC_SET)) {
                property.objectValue.callMethod(MAGIC_SET, [property.key, valueForAssignment]);

                return value;
            }
        }

        nativeObject[nativeKey] = valueForAssignment;

        pointIfFirstProperty();

        return value;
    },

    unset: function () {
        var property = this,
            nativeObject = property.nativeObject,
            nativeKey = property.key.getNative();

        // Clear value and/or reference to mark as unset
        property.value = property.reference = null;

        // Delete the property from the native object
        delete nativeObject[nativeKey];
    }
});

module.exports = PropertyReference;
