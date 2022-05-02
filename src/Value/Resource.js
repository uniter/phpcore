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
    ATTEMPT_TO_READ_PROPERTY = 'core.attempt_to_read_property',
    CANNOT_DECREMENT = 'core.cannot_decrement',
    CANNOT_INCREMENT = 'core.cannot_increment',
    INVALID_FOREACH_ARGUMENT = 'core.invalid_foreach_argument',
    TRYING_TO_ACCESS_ARRAY_OFFSET = 'core.trying_to_access_array_offset',
    UNSUPPORTED_OPERAND_TYPES = 'core.unsupported_operand_types',
    VALUE_NOT_CALLABLE = 'core.value_not_callable',
    Value = require('../Value').sync();

/**
 * Represents a PHP resource value.
 *
 * @param {ValueFactory} factory
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {CallStack} callStack
 * @param {Object} resource
 * @param {string} type
 * @param {number} id
 * @constructor
 */
function ResourceValue(
    factory,
    referenceFactory,
    futureFactory,
    callStack,
    resource,
    type,
    id
) {
    Value.call(this, factory, referenceFactory, futureFactory, callStack, 'resource', id);

    /**
     * @type {Object}
     */
    this.resource = resource;
    /**
     * @type {string}
     */
    this.resourceType = type;
}

util.inherits(ResourceValue, Value);

_.extend(ResourceValue.prototype, {
    /**
     * {@inheritdoc}
     */
    add: function () {
        this.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
    },

    /**
     * {@inheritdoc}
     */
    call: function () {
        this.callStack.raiseTranslatedError(PHPError.E_ERROR, VALUE_NOT_CALLABLE, {
            'type': 'resource'
        });
    },

    /**
     * {@inheritdoc}
     */
    coerceToBoolean: function () {
        var value = this;

        return value.factory.createBoolean(true);
    },

    /**
     * {@inheritdoc}
     */
    coerceToKey: function () {
        this.callStack.raiseError(PHPError.E_WARNING, 'Illegal offset type');
    },

    /**
     * {@inheritdoc}
     */
    coerceToNumber: function () {
        this.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
    },

    /**
     * {@inheritdoc}
     */
    coerceToString: function () {
        var value = this;

        return value.factory.createString('Resource id #' + value.value);
    },

    /**
     * {@inheritdoc}
     */
    compareWithArray: function () {
        return 1; // Arrays (even empty ones) are always greater (except for objects).
    },

    /**
     * {@inheritdoc}
     */
    compareWithBoolean: function (leftValue) {
        var rightValue = this,
            leftBoolean = leftValue.getNative(),
            rightBoolean = rightValue.coerceToBoolean().getNative();

        if (!leftBoolean && rightBoolean) {
            return -1;
        }

        if (leftBoolean && !rightBoolean) {
            return 1;
        }

        return 0;
    },

    /**
     * {@inheritdoc}
     */
    compareWithFloat: function (leftValue) {
        var rightValue = this,
            leftFloat = leftValue.getNative(),
            rightInteger = rightValue.getNative();

        if (leftFloat < rightInteger) {
            return -1;
        }

        if (leftFloat > rightInteger) {
            return 1;
        }

        return 0;
    },

    /**
     * {@inheritdoc}
     */
    compareWithInteger: function (leftValue) {
        var rightValue = this,
            leftInteger = leftValue.getNative(),
            rightInteger = rightValue.getNative();

        if (leftInteger < rightInteger) {
            return -1;
        }

        if (leftInteger > rightInteger) {
            return 1;
        }

        return 0;
    },

    /**
     * {@inheritdoc}
     */
    compareWithNull: function () {
        return -1; // Null is always smaller than a resource.
    },

    /**
     * {@inheritdoc}
     */
    compareWithObject: function () {
        return 1; // Objects (even empty ones) are always greater.
    },

    /**
     * {@inheritdoc}
     */
    compareWithPresent: function (rightValue) {
        return rightValue.compareWithResource(this);
    },

    /**
     * {@inheritdoc}
     */
    compareWithResource: function (leftValue) {
        // Compare resources by their globally unique IDs.
        var leftResourceID = leftValue.getID(),
            rightResourceID = this.getID();

        if (leftResourceID < rightResourceID) {
            return -1;
        }

        if (leftResourceID > rightResourceID) {
            return 1;
        }

        // Resources are equal if they have the same ID.
        return 0;
    },

    /**
     * {@inheritdoc}
     */
    compareWithString: function () {
        return -1; // Strings (even empty ones) are always smaller than resources.
    },

    /**
     * {@inheritdoc}
     */
    decrement: function () {
        this.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_DECREMENT, {
            'type': 'resource'
        }, 'TypeError');
    },

    /**
     * {@inheritdoc}
     */
    formatAsString: function () {
        var value = this;

        return 'resource(' + value.value + ') of type (' + value.resourceType + ')';
    },

    /**
     * {@inheritdoc}
     */
    getElementByKey: function () {
        var value = this;

        value.callStack.raiseTranslatedError(PHPError.E_WARNING, TRYING_TO_ACCESS_ARRAY_OFFSET);

        return value.factory.createNull();
    },

    /**
     * {@inheritdoc}
     */
    getElementByIndex: function () {
        var value = this;

        value.callStack.raiseTranslatedError(PHPError.E_WARNING, TRYING_TO_ACCESS_ARRAY_OFFSET);

        return value.factory.createNull();
    },

    /**
     * Fetches the unique internal ID of this resource. Used by eg. var_dump(...).
     *
     * @returns {number}
     */
    getID: function () {
        return this.value;
    },

    /**
     * {@inheritdoc}
     */
    getInstancePropertyByName: function (nameValue) {
        var value = this,
            name = nameValue.getNative();

        value.callStack.raiseTranslatedError(PHPError.E_WARNING, ATTEMPT_TO_READ_PROPERTY, {
            'name': name,
            'type': 'resource'
        });

        return value.referenceFactory.createNull();
    },

    /**
     * {@inheritdoc}
     */
    getIterator: function () {
        var value = this;

        value.callStack.raiseTranslatedError(PHPError.E_WARNING, INVALID_FOREACH_ARGUMENT, {
            'type': 'resource'
        });

        // Create an iterator over an empty array, ie. one that does not iterate.
        return value.futureFactory.createPresent(value.factory.createArrayIterator(value.factory.createArray([])));
    },

    /**
     * Returns the inner resource data.
     *
     * @returns {Object}
     */
    getResource: function () {
        return this.resource;
    },

    /**
     * Returns the inner type of this resource, eg. "stream".
     *
     * @returns {string}
     */
    getResourceType: function () {
        return this.resourceType;
    },

    /**
     * {@inheritdoc}
     */
    increment: function () {
        this.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_INCREMENT, {
            'type': 'resource'
        }, 'TypeError');
    },

    /**
     * {@inheritdoc}
     */
    isAnInstanceOf: function () {
        return this.factory.createBoolean(false);
    },

    /**
     * {@inheritdoc}
     */
    isCallable: function () {
        return this.futureFactory.createPresent(false);
    },

    /**
     * {@inheritdoc}
     */
    isEmpty: function () {
        return this.futureFactory.createPresent(false);
    },

    /**
     * {@inheritdoc}
     */
    isIdenticalTo: function (rightValue) {
        return rightValue.isIdenticalToResource(this);
    },

    /**
     * {@inheritdoc}
     */
    isIdenticalToResource: function (leftValue) {
        var rightValue = this,
            factory = rightValue.factory;

        return factory.createBoolean(leftValue.getID() === rightValue.getID());
    },

    /**
     * {@inheritdoc}
     */
    isIterable: function () {
        return false;
    },

    /**
     * {@inheritdoc}
     */
    isNumeric: function () {
        return true; // Resources are numeric (they coerce to their ID).
    },

    /**
     * {@inheritdoc}
     */
    modulo: function () {
        this.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
    },

    /**
     * Calculates the ones' complement of this value.
     */
    onesComplement: function () {
        this.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
    }
});

module.exports = ResourceValue;
