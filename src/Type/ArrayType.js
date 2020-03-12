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
 * @param {boolean} nullIsAllowed
 * @constructor
 */
function ArrayType(nullIsAllowed) {
    /**
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
        return value.getType() === 'array' ||
            (this.allowsNull() && value.getType() === 'null');
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
