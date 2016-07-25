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
        Value.call(this, factory, callStack, 'integer', value);
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

        divide: function (rightValue) {
            return rightValue.divideByInteger(this);
        },

        divideByBoolean: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

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

        divideByInteger: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

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

        divideByNull: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        divideByObject: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        divideByString: function (leftValue) {
            return this.divideByNonArray(leftValue);
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
         * Integers are always numeric: always returns true
         *
         * @returns {boolean}
         */
        isNumeric: function () {
            return true;
        },

        multiply: function (rightValue) {
            var leftValue = this,
                factory = leftValue.factory,
                rightType = rightValue.getType();

            // Coerce to float and return a float if either operand is a float
            if (rightType === 'float') {
                return factory.createFloat(leftValue.coerceToFloat().getNative() + rightValue.coerceToFloat().getNative());
            }

            return factory.createInteger(leftValue.getNative() * rightValue.getNative());
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
