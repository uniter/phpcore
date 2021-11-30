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
 * @constructor
 */
function Reference(referenceFactory) {
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
}

_.extend(Reference.prototype, {
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
     * @returns {Future<boolean>}
     */
    isEmpty: throwUnimplemented('isEmpty'),

    /**
     * Determines whether the reference is classed as "set" or not
     *
     * @returns {Future<boolean>}
     */
    isSet: throwUnimplemented('isSet'),

    /**
     * Sets the value of this reference. If it was already assigned a value it will be overwritten,
     * otherwise if it was already assigned a sub-reference then that reference will be assigned the value
     *
     * @param {Value} value
     * @returns {Value} Returns the value that was set
     */
    setValue: throwUnimplemented('setValue'),

    /**
     * Unsets the value of this reference.
     *
     * @returns {Future}
     */
    unset: throwUnimplemented('unset')
});

module.exports = Reference;
