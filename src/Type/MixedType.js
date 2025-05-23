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
 * Represents an unspecified type, where any value is allowed,
 * such as a function parameter with no type specified
 *
 * @param {FutureFactory} futureFactory
 * @constructor
 */
function MixedType(futureFactory) {
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
}

util.inherits(MixedType, TypeInterface);

_.extend(MixedType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsNull: function () {
        return true; // When no type is specified, null is always allowed
    },

    /**
     * {@inheritdoc}
     */
    allowsValue: function () {
        return this.futureFactory.createPresent(true); // When no type is specified, any value is allowed
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
        return 'mixed';
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

module.exports = MixedType;
