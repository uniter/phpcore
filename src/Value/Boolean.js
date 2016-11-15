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
    var PHPError = phpCommon.PHPError,
        PHPFatalError = phpCommon.PHPFatalError;

    function BooleanValue(factory, callStack, value) {
        Value.call(this, factory, callStack, 'boolean', !!value);
    }

    util.inherits(BooleanValue, Value);

    _.extend(BooleanValue.prototype, {
        add: function (rightValue) {
            return rightValue.addToBoolean(this);
        },

        addToBoolean: function (rightValue) {
            var value = this;

            return value.factory.createInteger(value.value + rightValue.value);
        },

        addToInteger: function (integerValue) {
            return integerValue.addToBoolean(this);
        },

        addToNull: function () {
            return this.coerceToInteger();
        },

        addToObject: function (objectValue) {
            return objectValue.addToBoolean(this);
        },

        coerceToBoolean: function () {
            return this;
        },

        coerceToInteger: function () {
            var value = this;

            return value.factory.createInteger(value.value ? 1 : 0);
        },

        coerceToKey: function () {
            return this.coerceToInteger();
        },

        coerceToNumber: function () {
            return this.coerceToInteger();
        },

        coerceToString: function () {
            var value = this;

            return value.factory.createString(value.value ? '1' : '');
        },

        divide: function (rightValue) {
            return rightValue.divideByBoolean(this);
        },

        divideByBoolean: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        divideByFloat: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        divideByInteger: function (leftValue) {
            return this.divideByNonArray(leftValue);
        },

        divideByNonArray: function (leftValue) {
            var coercedLeftValue,
                rightValue = this,
                divisor = rightValue.getNative(),
                quotient;

            if (divisor === false) {
                rightValue.callStack.raiseError(PHPError.E_WARNING, 'Division by zero');

                return rightValue.factory.createBoolean(false);
            }

            coercedLeftValue = leftValue.coerceToNumber();
            quotient = coercedLeftValue.getNative() / divisor;

            return coercedLeftValue.getType() === 'float' ?
                rightValue.factory.createFloat(quotient) :
                rightValue.factory.createInteger(quotient);
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

        formatAsString: function () {
            return this.value ? 'true' : 'false';
        },

        getElement: function () {
            // Array access on booleans always returns null, no notice or warning is raised
            return this.factory.createNull();
        },

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfBoolean(this);
        },

        isEqualTo: function (rightValue) {
            var leftValue = this,
                factory = leftValue.factory;

            return factory.createBoolean(rightValue.coerceToBoolean().value === leftValue.value);
        },

        isEqualToObject: function () {
            return this;
        },

        isEqualToString: function (stringValue) {
            var booleanValue = this;

            return stringValue.factory.createBoolean(
                stringValue.coerceToBoolean().getNative() === booleanValue.getNative()
            );
        },

        /**
         * Booleans are never numeric: always returns false
         *
         * @returns {boolean}
         */
        isNumeric: function () {
            return false;
        },

        onesComplement: function () {
            throw new PHPFatalError(PHPFatalError.UNSUPPORTED_OPERAND_TYPES);
        },

        shiftLeftBy: function (rightValue) {
            return this.coerceToInteger().shiftLeftBy(rightValue);
        },

        shiftRightBy: function (rightValue) {
            return this.coerceToInteger().shiftRightBy(rightValue);
        }
    });

    return BooleanValue;
}, {strict: true});
