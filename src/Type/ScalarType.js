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
 * then the value's type must match exactly. However, in loose-types mode, the type may be coerced.
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
        var typeObject = this;

        return typeObject.futureFactory.createPresent(
            (value.getType() === typeObject.scalarType) ||
            (typeObject.allowsNull() && value.getType() === 'null')
        );
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        var typeObject = this,
            targetType = typeObject.scalarType,
            actualType = value.getType();

        if (actualType === 'array') {
            // Don't attempt to coerce arrays, which in other places (like casting) is more lax.
            return value;
        }

        try {
            switch (targetType) {
                case 'boolean':
                    return value.coerceToBoolean();
                case 'float':
                    return value.coerceToFloat();
                case 'int':
                    return value.coerceToInteger();
                case 'string':
                    return value.coerceToString();
            }
        } catch (error) {
            // Coercion failed; just return the value unchanged. If this was a parameter argument,
            // the validation stage will then fail with the correct error.
            return value;
        }

        throw new Exception('Unknown scalar type "' + typeObject.scalarType + '"');
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
