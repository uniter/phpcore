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
        /**
         * {@inheritdoc}
         */
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
                rightFloat = rightValue.getNative();

            if (leftFloat < rightFloat) {
                return -1;
            }

            if (leftFloat > rightFloat) {
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
                rightFloat = rightValue.getNative();

            if (leftInteger < rightFloat) {
                return -1;
            }

            if (leftInteger > rightFloat) {
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
                leftFloat = leftValue.coerceToFloat().getNative(),
                rightFloat = rightValue.getNative();

            if (leftFloat < rightFloat) {
                return -1;
            }

            if (leftFloat > rightFloat) {
                return 1;
            }

            return 0;
        },

        /**
         * {@inheritdoc}
         */
        compareWithPresent: function (rightValue) {
            return rightValue.compareWithFloat(this);
        },

        /**
         * {@inheritdoc}
         */
        compareWithResource: function (leftValue) {
            var rightValue = this,
                leftInteger = leftValue.getID(),
                rightFloat = rightValue.getNative();

            if (leftInteger < rightFloat) {
                return -1;
            }

            if (leftInteger > rightFloat) {
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
                rightFloat = rightValue.getNative();

            if (leftNumber < rightFloat) {
                return -1;
            }

            if (leftNumber > rightFloat) {
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
        convertForIntegerType: function () {
            return this.coerceToInteger();
        },

        /**
         * {@inheritdoc}
         */
        convertForStringType: function () {
            return this.coerceToString();
        },

        /**
         * {@inheritdoc}
         */
        decrement: function () {
            var value = this;

            return value.factory.createFloat(value.getNative() - 1);
        },

        formatAsString: function () {
            return this.value + '';
        },

        getElement: function () {
            // Array access on floats always returns null, no notice or warning is raised
            return this.factory.createNull();
        },

        /**
         * {@inheritdoc}
         */
        increment: function () {
            var value = this;

            return value.factory.createFloat(value.getNative() + 1);
        },

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfFloat(this);
        },

        /**
         * {@inheritdoc}
         */
        isCallable: function () {
            return this.futureFactory.createPresent(false);
        },

        /**
         * Determines whether this float is classed as "empty" or not.
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
