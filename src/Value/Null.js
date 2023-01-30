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

    /**
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {Flow} flow
     * @constructor
     */
    function NullValue(factory, referenceFactory, futureFactory, callStack, flow) {
        Value.call(this, factory, referenceFactory, futureFactory, callStack, flow, 'null', null);
    }

    util.inherits(NullValue, Value);

    _.extend(NullValue.prototype, {
        /**
         * Overrides the implementation in Value, just returning an empty array
         *
         * @returns {ArrayValue}
         */
        coerceToArray: function () {
            // Null just casts to an empty array
            return this.factory.createArray();
        },

        /**
         * {@inheritdoc}
         */
        coerceToBoolean: function () {
            return this.factory.createBoolean(false);
        },

        /**
         * Null always coerces to int 0.
         *
         * @returns {IntegerValue}
         */
        coerceToInteger: function () {
            return this.factory.createInteger(0);
        },

        coerceToKey: function () {
            return this.factory.createString('');
        },

        /**
         * Null always coerces to int 0.
         *
         * @returns {IntegerValue}
         */
        coerceToNumber: function () {
            return this.coerceToInteger();
        },

        coerceToString: function () {
            return this.factory.createString('');
        },

        /**
         * {@inheritdoc}
         */
        compareWith: function (rightValue) {
            var value = this;

            return value.futureFactory.createPresent(rightValue.compareWithNull(value));
        },

        /**
         * {@inheritdoc}
         */
        compareWithArray: function (leftValue) {
            var arrayLength = leftValue.getLength();

            // Empty arrays are equal to null.
            return this.futureFactory.createPresent(arrayLength > 0 ? 1 : 0);
        },

        /**
         * {@inheritdoc}
         */
        compareWithBoolean: function (leftValue) {
            var leftBoolean = leftValue.getNative();

            // False is equal to null, true is greater.
            return leftBoolean ? 1 : 0;
        },

        /**
         * {@inheritdoc}
         */
        compareWithFloat: function (leftValue) {
            var leftFloatIsEmpty = leftValue.getNative() === 0;

            // Zero is equal to null, any negative or positive float is greater.
            return leftFloatIsEmpty ? 0 : 1;
        },

        /**
         * {@inheritdoc}
         */
        compareWithInteger: function (leftValue) {
            var leftIntegerIsEmpty = leftValue.getNative() === 0;

            // Zero is equal to null, any negative or positive integer is greater.
            return leftIntegerIsEmpty ? 0 : 1;
        },

        /**
         * {@inheritdoc}
         */
        compareWithNull: function () {
            return 0; // Null is equal to itself.
        },

        /**
         * {@inheritdoc}
         */
        compareWithObject: function () {
            // Objects (even empty ones) are always greater than null.
            return this.futureFactory.createPresent(1);
        },

        /**
         * {@inheritdoc}
         */
        compareWithResource: function () {
            return 1; // Resources (even closed ones) are always greater than null.
        },

        /**
         * {@inheritdoc}
         */
        compareWithString: function (leftValue) {
            var leftStringIsEmpty = leftValue.getNative() === '';

            // The empty string is equal to null, any other string is greater.
            return this.futureFactory.createPresent(leftStringIsEmpty ? 0 : 1);
        },

        /**
         * {@inheritdoc}
         */
        decrement: function () {
            return this.factory.createNull();
        },

        formatAsString: function () {
            return 'NULL';
        },

        /**
         * {@inheritdoc}
         */
        getInstancePropertyByName: function () {
            var value = this;

            value.callStack.raiseError(
                PHPError.E_NOTICE,
                'Trying to get property of non-object'
            );

            return value.referenceFactory.createNull();
        },

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfNull(this);
        },

        /**
         * {@inheritdoc}
         */
        isCallable: function () {
            return this.futureFactory.createPresent(false);
        },

        /**
         * Null is always classed as empty
         *
         * @returns {ChainableInterface<boolean>}
         */
        isEmpty: function () {
            return this.futureFactory.createPresent(true);
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

        /**
         * {@inheritdoc}
         */
        isSet: function () {
            return this.futureFactory.createPresent(false);
        }
    });

    return NullValue;
}, {strict: true});
