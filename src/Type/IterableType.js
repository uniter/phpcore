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
 * Represents a type that can only accept an iterable value:
 * - An array
 * - An object implementing Traversable
 *
 * @param {boolean} nullIsAllowed
 * @constructor
 */
function IterableType(nullIsAllowed) {
    /**
     * @type {boolean}
     */
    this.nullIsAllowed = nullIsAllowed;
}

util.inherits(IterableType, TypeInterface);

_.extend(IterableType.prototype, {
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
        return value.isIterable() ||
            (this.allowsNull() && value.getType() === 'null');
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        return 'iterable';
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
        return false; // This is not a scalar type hint
    }
});

module.exports = IterableType;
