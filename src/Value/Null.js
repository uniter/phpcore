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

        divide: function (rightValue) {
            return rightValue.divideByNull(this);
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

        divideByNonArray: function () {
            var rightValue = this;

            rightValue.callStack.raiseError(PHPError.E_WARNING, 'Division by zero');

            return rightValue.factory.createBoolean(false);
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

        getInstancePropertyByName: function () {
            var value = this;

            value.callStack.raiseError(
                PHPError.E_NOTICE,
                'Trying to get property of non-object'
            );

            return value.factory.createNull();
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

        isSet: function () {
            return false;
        },

        subtract: function (rightValue) {
            return rightValue.subtractFromNull();
        }
    });

    return NullValue;
}, {strict: true});
