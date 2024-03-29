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
     * @param {Flow} flow
     * @param {number} value
     * @constructor
     */
    function FloatValue(
        factory,
        referenceFactory,
        futureFactory,
        callStack,
        flow,
        value
    ) {
        Value.call(this, factory, referenceFactory, futureFactory, callStack, flow, 'float', value);
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
         * Floats should stay unchanged.
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
        compareWith: function (rightValue) {
            var value = this;

            return value.futureFactory.createPresent(rightValue.compareWithFloat(value));
        },

        /**
         * {@inheritdoc}
         */
        compareWithArray: function () {
            // Arrays (even empty ones) are always greater (except for objects).
            return this.futureFactory.createPresent(1);
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
                return rightValue.futureFactory.createPresent(-1);
            }

            if (leftFloat > rightFloat) {
                return rightValue.futureFactory.createPresent(1);
            }

            return rightValue.futureFactory.createPresent(0);
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
                leftNumber = leftValue.coerceToFloat().getNative(),
                rightFloat = rightValue.getNative();

            if (leftNumber < rightFloat) {
                return rightValue.futureFactory.createPresent(-1);
            }

            if (leftNumber > rightFloat) {
                return rightValue.futureFactory.createPresent(1);
            }

            return rightValue.futureFactory.createPresent(0);
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
         * @returns {ChainableInterface<boolean>}
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

        /**
         * {@inheritdoc}
         */
        isScalar: function () {
            return true;
        },

        /**
         * {@inheritdoc}
         */
        onesComplement: function () {
            var value = this;

            /*jshint bitwise: false */
            return value.factory.createInteger(~value.value); // Note that the result is an integer and not a float.
        }
    });

    return FloatValue;
}, {strict: true});
