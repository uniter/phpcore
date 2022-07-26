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
    require('util'),
    require('../Value')
], function (
    _,
    util,
    Value
) {
    /**
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {number} value
     * @constructor
     */
    function IntegerValue(factory, referenceFactory, futureFactory, callStack, value) {
        Value.call(this, factory, referenceFactory, futureFactory, callStack, 'int', value);
    }

    util.inherits(IntegerValue, Value);

    _.extend(IntegerValue.prototype, {
        /**
         * {@inheritdoc}
         */
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

        coerceToString: function () {
            var value = this;

            return value.factory.createString(value.value.toString());
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
            var rightValue = this,
                boolean = rightValue.coerceToBoolean().getNative();

            return boolean ? -1 : 0;
        },

        /**
         * {@inheritdoc}
         */
        compareWithObject: function (leftValue) {
            var rightValue = this,
                leftInteger = leftValue.coerceToInteger().getNative(),
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
        compareWithPresent: function (rightValue) {
            return rightValue.compareWithInteger(this);
        },

        /**
         * {@inheritdoc}
         */
        compareWithResource: function (leftValue) {
            var rightValue = this,
                leftInteger = leftValue.getID(),
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
        compareWithString: function (leftValue) {
            var rightValue = this,
                leftNumber = leftValue.coerceToNumber().getNative(),
                rightInteger = rightValue.getNative();

            if (leftNumber < rightInteger) {
                return -1;
            }

            if (leftNumber > rightInteger) {
                return 1;
            }

            return 0;
        },

        /**
         * {@inheritdoc}
         */
        convertForBooleanType: function () {
            return this.coerceToBoolean();
        },

        /**
         * {@inheritdoc}
         */
        convertForFloatType: function () {
            return this.coerceToFloat();
        },

        /**
         * {@inheritdoc}
         */
        convertForStringType: function () {
            return this.coerceToString();
        },

        decrement: function () {
            var value = this;

            return value.factory.createInteger(value.value - 1);
        },

        formatAsString: function () {
            return this.value + '';
        },

        getElement: function () {
            // Array access on integers always returns null, no notice or warning is raised
            return this.factory.createNull();
        },

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfInteger(this);
        },

        /**
         * {@inheritdoc}
         */
        isCallable: function () {
            return this.futureFactory.createPresent(false);
        },

        /**
         * Determines whether this integer is classed as "empty" or not.
         * Only zero is classed as empty
         *
         * @returns {Future<boolean>}
         */
        isEmpty: function () {
            var value = this;

            return value.futureFactory.createPresent(value.value === 0);
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

        onesComplement: function () {
            /*jshint bitwise: false */
            return this.factory.createInteger(~this.value);
        }
    });

    return IntegerValue;
}, {strict: true});
