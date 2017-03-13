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

    getValue: function () {
        var property = this,
            nativeObject = property.nativeObject,
            nativeKey = property.key.getNative();

        // Special value of native null (vs. NullValue) represents undefined
        if (!property.isDefined()) {
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

        // Check that the property resolves to something other than null,
        // otherwise it is not set
        if (
            defined &&
            property.valueFactory.coerce(nativeObject[nativeKey]).getType() === 'null'
        ) {
            return false;
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

    isSet: function () {
        return this.isDefined();
    },

    setReference: function (reference) {
        var property = this;

        property.reference = reference;

        return reference;
    },

    setValue: function (value) {
        var property = this,
            nativeObject = property.nativeObject,
            nativeKey = property.key.getNative(),
            isFirstProperty = (property.objectValue.getLength() === 0);

        // Ensure we write the native value to properties on native JS objects
        function getValueForAssignment() {
            if (property.objectValue.getClassName() === 'JSObject') {
                return value.getNative();
            }

            return value.getForAssignment();
        }

        if (property.reference) {
            property.reference.setValue(value);
        } else {
            nativeObject[nativeKey] = getValueForAssignment();
        }

        if (isFirstProperty) {
            property.objectValue.pointToProperty(property);
        }

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
