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

    function IntegerValue(factory, callStack, value) {
        Value.call(this, factory, callStack, 'int', value);
    }

    util.inherits(IntegerValue, Value);

    _.extend(IntegerValue.prototype, {
        add: function (rightValue) {
            return rightValue.addToInteger(this);
        },

        addToBoolean: function (booleanValue) {
            var value = this;

            return value.factory.createInteger(value.value + booleanValue.value);
        },

        addToInteger: function (rightValue) {
            var value = this;

            return value.factory.createInteger(value.value + rightValue.value);
        },

        coerceToBoolean: function () {
            var value = this;

            return value.factory.createBoolean(!!value.value);
        },

        coerceToFloat: function () {
            var value = this;

            return value.factory.createFloat(value.value);
        },

        coerceToInteger: function () {
            return this;
        },

        coerceToKey: function () {
            return this;
        },

        coerceToNumber: function () {
            return this;
        },

        coerceToString: function () {
            var value = this;

            return value.factory.createString(value.value.toString());
        },

        decrement: function () {
            var value = this;

            return value.factory.createInteger(value.value - 1);
        },

        /**
         * Divides this integer by another value
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        divide: function (rightValue) {
            return rightValue.divideByInteger(this);
        },

        /**
         * Divides a float value by this integer
         *
         * @param {FloatValue} leftValue
         * @returns {Value}
         */
        divideByFloat: function (leftValue) {
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

        /**
         * Divides a non-array value by this integer
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        divideByNonArray: function (leftValue) {
            var coercedLeftValue,
                rightValue = this,
                divisor = rightValue.getNative(),
                quotient;

            if (divisor === 0) {
                rightValue.callStack.raiseError(PHPError.E_WARNING, 'Division by zero');

                return rightValue.factory.createBoolean(false);
            }

            coercedLeftValue = leftValue.coerceToNumber();

            quotient = coercedLeftValue.getNative() / divisor;

            // Return result as a float if needed, otherwise keep as integer
            return Math.round(quotient) === quotient ?
                rightValue.factory.createInteger(quotient) :
                rightValue.factory.createFloat(quotient);
        },

        formatAsString: function () {
            return this.value + '';
        },

        getElement: function () {
            // Array access on integers always returns null, no notice or warning is raised
            return this.factory.createNull();
        },

        increment: function () {
            var value = this;

            return value.factory.createInteger(value.value + 1);
        },

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfInteger(this);
        },

        /**
         * {@inheritdoc}
         */
        isCallable: function () {
            return false;
        },

        /**
         * Determines whether this integer is classed as "empty" or not.
         * Only zero is classed as empty
         *
         * @returns {boolean}
         */
        isEmpty: function () {
            return this.value === 0;
        },

        isEqualTo: function (rightValue) {
            return rightValue.isEqualToInteger(this);
        },

        isEqualToInteger: function (rightValue) {
            var leftValue = this;

            return leftValue.factory.createBoolean(rightValue.value === leftValue.value);
        },

        isEqualToNull: function () {
            var leftValue = this;

            return leftValue.factory.createBoolean(leftValue.value === 0);
        },

        isEqualToObject: function (objectValue) {
            return objectValue.isEqualToInteger(this);
        },

        isEqualToString: function (stringValue) {
            var integerValue = this;

            return integerValue.factory.createBoolean(integerValue.getNative() === parseFloat(stringValue.getNative()));
        },

        /**
         * {@inheritdoc}
         */
        isIterable: function () {
            return false;
        },

        /**
         * Integers are always numeric: always returns true
         *
         * @returns {boolean}
         */
        isNumeric: function () {
            return true;
        },

        /**
         * Multiplies another value by this integer
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        multiply: function (rightValue) {
            return rightValue.multiplyByInteger(this);
        },

        /**
         * Multiplies a float value by this integer
         *
         * @param {FloatValue} leftValue
         * @returns {Value}
         */
        multiplyByFloat: function (leftValue) {
            var coercedLeftValue = leftValue.coerceToNumber(),
                rightValue = this,
                multiplier = rightValue.value;

            return rightValue.factory.createFloat(coercedLeftValue.getNative() * multiplier);
        },

        /**
         * Multiplies a non-array value by this integer
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        multiplyByNonArray: function (leftValue) {
            var coercedMultiplicand = leftValue.coerceToNumber(),
                rightValue = this,
                multiplier = rightValue.value,
                product = coercedMultiplicand.getNative() * multiplier;

            // Return result as a float if needed, otherwise keep as integer
            return Math.round(product) === product ?
                rightValue.factory.createInteger(product) :
                rightValue.factory.createFloat(product);
        },

        onesComplement: function () {
            /*jshint bitwise: false */
            return this.factory.createInteger(~this.value);
        },

        shiftLeftBy: function (rightValue) {
            /*jshint bitwise: false */
            var leftValue = this,
                factory = leftValue.factory;

            return factory.createInteger(leftValue.getNative() << rightValue.coerceToInteger().getNative());
        },

        shiftRightBy: function (rightValue) {
            /*jshint bitwise: false */
            var leftValue = this,
                factory = leftValue.factory;

            return factory.createInteger(leftValue.getNative() >> rightValue.coerceToInteger().getNative());
        },

        subtract: function (rightValue) {
            var leftValue = this,
                factory = leftValue.factory;

            rightValue = rightValue.coerceToNumber();

            // Coerce to float and return a float if either operand is a float
            if (rightValue.getType() === 'float') {
                return factory.createFloat(leftValue.coerceToFloat().getNative() - rightValue.coerceToFloat().getNative());
            }

            return factory.createInteger(leftValue.getNative() - rightValue.getNative());
        },

        subtractFromNull: function () {
            var value = this;

            return value.factory.createInteger(-value.getNative());
        },

        toNegative: function () {
            var value = this;

            return value.factory.createInteger(-value.value);
        },

        toPositive: function () {
            var value = this;

            return value.factory.createInteger(+value.value);
        }
    });

    return IntegerValue;
}, {strict: true});
