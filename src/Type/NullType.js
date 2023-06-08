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
    TypeInterface = require('./TypeInterface');

/**
 * Represents a type that accepts null. Usually used as part of a union type,
 * but may be used alone.
 *
 * @param {FutureFactory} futureFactory
 * @constructor
 */
function NullType(futureFactory) {
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
}

util.inherits(NullType, TypeInterface);

_.extend(NullType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsNull: function () {
        return true; // Null allows null.
    },

    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        return this.futureFactory.createPresent(value.getType() === 'null');
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
    getDisplayName: function () {
        return 'null';
    },

    /**
     * {@inheritdoc}
     */
    getExpectedMessage: function () {
        return this.getDisplayName();
    },

    /**
     * {@inheritdoc}
     */
    isScalar: function () {
        return false; // This is not a scalar type hint.
    }
});

module.exports = NullType;
