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
     * @constructor
     */
    function NullValue(factory, referenceFactory, futureFactory, callStack) {
        Value.call(this, factory, referenceFactory, futureFactory, callStack, 'null', null);
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

        coerceToBoolean: function () {
            return this.factory.createBoolean(false);
        },

        coerceToKey: function () {
            return this.factory.createString('');
        },

        coerceToString: function () {
            return this.factory.createString('');
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
        }
    });

    return NullValue;
}, {strict: true});
