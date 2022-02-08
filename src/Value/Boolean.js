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
    var UNSUPPORTED_OPERAND_TYPES = 'core.unsupported_operand_types',
        PHPError = phpCommon.PHPError;

    /**
     * Represents a PHP boolean value
     *
     * @param {ValueFactory} factory
     * @param {ReferenceFactory} referenceFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @param {boolean} value
     * @constructor
     */
    function BooleanValue(
        factory,
        referenceFactory,
        futureFactory,
        callStack,
        value
    ) {
        Value.call(this, factory, referenceFactory, futureFactory, callStack, 'boolean', !!value);
    }

    util.inherits(BooleanValue, Value);

    _.extend(BooleanValue.prototype, {
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

        coerceToString: function () {
            var value = this;

            return value.factory.createString(value.value ? '1' : '');
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
            // NB: This is the expected behaviour, vs. subtracting one from a boolean explicitly.
            return this;
        },

        formatAsString: function () {
            return this.value ? 'true' : 'false';
        },

        getElement: function () {
            // Array access on booleans always returns null, no notice or warning is raised
            return this.factory.createNull();
        },

        /**
         * {@inheritdoc}
         */
        increment: function () {
            // NB: This is the expected behaviour, vs. adding one to a boolean explicitly.
            return this;
        },

        isAnInstanceOf: function (classNameValue) {
            return classNameValue.isTheClassOfBoolean(this);
        },

        /**
         * {@inheritdoc}
         */
        isCallable: function () {
            return this.futureFactory.createPresent(false);
        },

        /**
         * Determines whether this boolean is classed as "empty" or not.
         * Only false is classed as empty
         *
         * @returns {Future<boolean>}
         */
        isEmpty: function () {
            var value = this;

            return value.futureFactory.createPresent(value.value === false);
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
         * {@inheritdoc}
         */
        isIterable: function () {
            return false;
        },

        /**
         * Booleans are never numeric: always returns false
         *
         * @returns {boolean}
         */
        isNumeric: function () {
            return false;
        },

        /**
         * Calculates the ones' complement of this value
         */
        onesComplement: function () {
            this.callStack.raiseTranslatedError(PHPError.E_ERROR, UNSUPPORTED_OPERAND_TYPES);
        }
    });

    return BooleanValue;
}, {strict: true});
