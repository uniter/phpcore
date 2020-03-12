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
    var PHPError = phpCommon.PHPError;

    function FloatValue(factory, callStack, value) {
        Value.call(this, factory, callStack, 'float', value);
    }

    util.inherits(FloatValue, Value);

    _.extend(FloatValue.prototype, {
        add: function (rightValue) {
            return rightValue.addToFloat(this);
        },

        addToBoolean: function (booleanValue) {
            var value = this;

            return value.factory.createFloat(value.value + Number(booleanValue.value));
        },

        addToInteger: function (integerValue) {
            var value = this;

            return value.factory.createFloat(value.value + integerValue.value);
        },

        addToObject: function (objectValue) {
            return objectValue.addToFloat(this);
        },

        addToNull: function () {
            return this.coerceToNumber();
        },

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

        coerceToNumber: function () {
            return this;
        },

        coerceToString: function () {
            var value = this;

            return value.factory.createString(value.value + '');
        },

        /**
         * Divides this float by another value
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        divide: function (rightValue) {
            return rightValue.divideByFloat(this);
        },

        /**
         * Divides a non-array value by this float
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        divideByNonArray: function (leftValue) {
            var coercedLeftValue,
                rightValue = this,
                divisor = rightValue.getNative();

            if (divisor === 0) {
                rightValue.callStack.raiseError(PHPError.E_WARNING, 'Division by zero');

                return rightValue.factory.createBoolean(false);
            }

            coercedLeftValue = leftValue.coerceToNumber();

            return rightValue.factory.createFloat(coercedLeftValue.getNative() / divisor);
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

        /**
         * Multiplies this float by another value
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        multiply: function (rightValue) {
            return rightValue.multiplyByFloat(this);
        },

        /**
         * Multiplies a non-array value by this float
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        multiplyByNonArray: function (leftValue) {
            var coercedMultiplicand = leftValue.coerceToNumber(),
                rightValue = this,
                multiplier = rightValue.value;

            return rightValue.factory.createFloat(coercedMultiplicand.getNative() * multiplier);
        },

        onesComplement: function () {
            /*jshint bitwise: false */
            return this.factory.createInteger(~this.value);
        },

        shiftLeftBy: function (rightValue) {
            return this.coerceToInteger().shiftLeftBy(rightValue);
        },

        shiftRightBy: function (rightValue) {
            return this.coerceToInteger().shiftRightBy(rightValue);
        },

        subtract: function (rightValue) {
            var leftValue = this,
                factory = leftValue.factory;

            rightValue = rightValue.coerceToNumber();

            return factory.createFloat(leftValue.getNative() - rightValue.getNative());
        },

        toNegative: function () {
            var value = this;

            return value.factory.createFloat(-value.value);
        },

        toPositive: function () {
            var value = this;

            return value.factory.createInteger(+value.value);
        }
    });

    return FloatValue;
}, {strict: true});
