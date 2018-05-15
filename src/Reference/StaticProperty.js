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
    PHPFatalError = phpCommon.PHPFatalError,
    Reference = require('./Reference');

/**
 * @param {Class} classObject
 * @param {string} name
 * @param {string} visibility "private", "protected" or "public"
 * @param {Value} value
 * @constructor
 */
function StaticPropertyReference(classObject, name, visibility, value) {
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
     * @type {string}
     */
    this.visibility = visibility;
}

util.inherits(StaticPropertyReference, Reference);

_.extend(StaticPropertyReference.prototype, {
    getInstancePropertyByName: function (name) {
        return this.getValue().getInstancePropertyByName(name);
    },

    getName: function () {
        return this.name;
    },

    getReference: function () {
        return this;
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
     * @return {boolean}
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

        throw new PHPFatalError(PHPFatalError.CANNOT_UNSET_STATIC_PROPERTY, {
            className: property.classObject.getName(),
            propertyName: property.name
        });
    }
});

module.exports = StaticPropertyReference;
