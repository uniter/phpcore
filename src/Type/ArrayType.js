/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    util = require('util'),
    OF_GENERIC_TYPE_EXPECTED = 'core.of_generic_type_expected',
    TypeInterface = require('./TypeInterface');

/**
 * Represents a type that can only accept an array value
 *
 * @param {FutureFactory} futureFactory
 * @param {boolean} nullIsAllowed
 * @constructor
 */
function ArrayType(futureFactory, nullIsAllowed) {
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * Note that whether a type is nullable is not directly related to whether a parameter using that type is nullable -
     * if the default value is null then it will allow null, which is checked in the Parameter class.
     *
     * @type {boolean}
     */
    this.nullIsAllowed = nullIsAllowed;
}

util.inherits(ArrayType, TypeInterface);

_.extend(ArrayType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsNull: function () {
        var typeObject = this;

        return typeObject.nullIsAllowed;
    },

    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        var typeObject = this;

        return typeObject.futureFactory.createPresent(
            value.getType() === 'array' ||
            (typeObject.allowsNull() && value.getType() === 'null')
        );
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        return value; // No special coercion to perform.
    },

    /**
     * {@inheritdoc}
     */
    createEmptyScalarValue: function () {
        return null;
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        return 'array';
    },

    /**
     * {@inheritdoc}
     */
    getExpectedMessage: function (translator) {
        return translator.translate(OF_GENERIC_TYPE_EXPECTED, {
            expectedType: this.getDisplayName()
        });
    },

    /**
     * {@inheritdoc}
     */
    isScalar: function () {
        return false; // This is not a scalar type hint
    }
});

module.exports = ArrayType;
