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

    function NullValue(factory, callStack) {
        Value.call(this, factory, callStack, 'null', null);
    }

    util.inherits(NullValue, Value);

    _.extend(NullValue.prototype, {
        add: function (rightValue) {
            return rightValue.addToNull();
        },

        addToBoolean: function (booleanValue) {
            return booleanValue.coerceToInteger();
        },

        coerceToArray: function () {
            // Null just casts to an empty array
            return this.factory.createArray();
        },

        coerceToBoolean: function () {
            return this.factory.createBoolean(false);
        },

        coerceToKey: function () {
            return this.factory.createString('');
        },

        coerceToString: function () {
            return this.factory.createString('');
        },

        /**
         * Divides this null by another value
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        divide: function (rightValue) {
            return rightValue.divideByNull(this);
        },

        /**
         * Divides a non-array value by this null
         *
         * @returns {Value}
         */
        divideByNonArray: function () {
            var rightValue = this;

            rightValue.callStack.raiseError(PHPError.E_WARNING, 'Division by zero');

            return rightValue.factory.createBoolean(false);
        },

        formatAsString: function () {
            return 'NULL';
        },

        getInstancePropertyByName: function () {
            var value = this;

            value.callStack.raiseError(
                PHPError.E_NOTICE,
                'Trying to get property of non-object'
            );

            return value.factory.createNull();
        },

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfNull(this);
        },

        /**
         * {@inheritdoc}
         */
        isCallable: function () {
            return false;
        },

        /**
         * Null is always classed as empty
         *
         * @returns {boolean}
         */
        isEmpty: function () {
            return true;
        },

        isEqualTo: function (rightValue) {
            return rightValue.isEqualToNull(this);
        },

        isEqualToFloat: function (floatValue) {
            return floatValue.isEqualToNull();
        },

        isEqualToNull: function () {
            return this.factory.createBoolean(true);
        },

        isEqualToObject: function (objectValue) {
            return objectValue.isEqualToNull();
        },

        isEqualToString: function (stringValue) {
            return stringValue.isEqualToNull();
        },

        /**
         * {@inheritdoc}
         */
        isIterable: function () {
            return false;
        },

        /**
         * Null is never numeric: always returns false
         *
         * @returns {boolean}
         */
        isNumeric: function () {
            return false;
        },

        isSet: function () {
            return false;
        },

        /**
         * Multiplies this null by another value
         *
         * @param {Value} rightValue
         * @returns {Value}
         */
        multiply: function (rightValue) {
            return rightValue.multiplyByNull(this);
        },

        /**
         * Multiplies this value by a float
         *
         * @returns {FloatValue}
         */
        multiplyByFloat: function () {
            return this.factory.createFloat(0);
        },

        /**
         * Multiplies a non-array value by this null
         *
         * @param {Value} leftValue
         * @returns {Value}
         */
        multiplyByNonArray: function (leftValue) {
            var value = this;

            return leftValue.coerceToNumber().getType() === 'float' ?
                value.factory.createFloat(0) :
                value.factory.createInteger(0);
        },

        subtract: function (rightValue) {
            return rightValue.subtractFromNull();
        }
    });

    return NullValue;
}, {strict: true});
