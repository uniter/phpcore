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
    phpCommon = require('phpcommon'),
    util = require('util'),
    OF_GENERIC_TYPE_EXPECTED = 'core.of_generic_type_expected',
    Exception = phpCommon.Exception,
    TypeInterface = require('./TypeInterface');

/**
 * Represents a type that accepts a value of the given type. If the calling scope is in strict-types mode,
 * then the value's type must match exactly. However, in weak type-checking mode, the type may be coerced.
 *
 * @param {FutureFactory} futureFactory
 * @param {string} scalarType Type name: "int", "string" etc.
 * @param {boolean} nullIsAllowed
 * @constructor
 */
function ScalarType(futureFactory, scalarType, nullIsAllowed) {
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * Note that whether a type is nullable is not directly to whether a parameter using that type is nullable -
     * if the default value is null then it will allow null, which is checked in the Parameter class.
     *
     * @type {boolean}
     */
    this.nullIsAllowed = nullIsAllowed;
    /**
     * @type {string}
     */
    this.scalarType = scalarType;
}

util.inherits(ScalarType, TypeInterface);

_.extend(ScalarType.prototype, {
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
        var typeObject = this,
            valueType = value.getType();

        if (valueType === 'boolean') {
            // Scalar types use the shortened form while the value type is the long form.
            valueType = 'bool';
        }

        return typeObject.futureFactory.createPresent(
            (valueType === typeObject.scalarType) ||
            (typeObject.allowsNull() && value.getType() === 'null')
        );
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        var typeObject = this,
            targetType = typeObject.scalarType;

        // Note that arrays will never be accepted by a scalar type,
        // and null is only allowed if the type is nullable.

        switch (targetType) {
            case 'bool':
                return value.convertForBooleanType();
            case 'float':
                return value.convertForFloatType();
            case 'int':
                return value.convertForIntegerType();
            case 'string':
                return value.convertForStringType();
            default:
                throw new Exception('Unknown scalar type "' + targetType + '"');
        }
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        return this.scalarType;
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
        return true;
    }
});

module.exports = ScalarType;
