/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash'),
    require('phpcommon'),
    require('util'),
    require('../Value')
], function (
    _,
    phpCommon,
    util,
    Value
) {
    /**
     * Represents a PHP floating-point/double value
     *
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {number} value
     * @constructor
     */
    function FloatValue(factory, referenceFactory, futureFactory, callStack, value) {
        Value.call(this, factory, referenceFactory, futureFactory, callStack, 'float', value);
    }

    util.inherits(FloatValue, Value);

    _.extend(FloatValue.prototype, {
        coerceToBoolean: function () {
            var value = this;

            return value.factory.createBoolean(!!value.value);
        },

        coerceToFloat: function () {
            return this;
        },

        coerceToInteger: function () {
            /*jshint bitwise: false */
            var value = this;

            return value.factory.createInteger(value.value >> 0);
        },

        coerceToKey: function () {
            return this.coerceToInteger();
        },

        /**
         * Overrides the implementation in Value, as a float should stay unchanged
         *
         * @returns {FloatValue}
         */
        coerceToNumber: function () {
            return this;
        },

        coerceToString: function () {
            var value = this;

            return value.factory.createString(value.value + '');
        },

        formatAsString: function () {
            return this.value + '';
        },

        getElement: function () {
            // Array access on floats always returns null, no notice or warning is raised
            return this.factory.createNull();
        },

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfFloat(this);
        },

        /**
         * {@inheritdoc}
         */
        isCallable: function () {
            return false;
        },

        /**
         * Determines whether this float is classed as "empty" or not.
         * Only zero is classed as empty
         *
         * @returns {boolean}
         */
        isEmpty: function () {
            return this.value === 0;
        },

        isEqualTo: function (rightValue) {
            return rightValue.isEqualToFloat(this);
        },

        isEqualToFloat: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(rightValue.value === leftValue.value);
        },

        isEqualToInteger: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(rightValue.coerceToFloat().value === leftValue.value);
        },

        isEqualToNull: function () {
            var leftValue = this;

            return leftValue.factory.createBoolean(leftValue.value === 0);
        },

        isEqualToObject: function (objectValue) {
            return objectValue.isEqualToFloat(this);
        },

        isEqualToString: function (stringValue) {
            var floatValue = this;

            return floatValue.factory.createBoolean(floatValue.value === stringValue.coerceToFloat().value);
        },

        /**
         * {@inheritdoc}
         */
        isIterable: function () {
            return false;
        },

        /**
         * Floats are always numeric: always returns true
         *
         * @returns {boolean}
         */
        isNumeric: function () {
            return true;
        },

        onesComplement: function () {
            /*jshint bitwise: false */
            return this.factory.createInteger(~this.value);
        }
    });

    return FloatValue;
}, {strict: true});
