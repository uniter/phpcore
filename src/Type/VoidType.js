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
    Exception = phpCommon.Exception,
    TypeInterface = require('./TypeInterface');

/**
 * A special type that is only valid as a return type, indicating that the function
 * either contains no return statements at all or only returns void, i.e. "return;".
 *
 * The return behaviour checking is done at transpile time, see PHPToJS.
 *
 * @param {FutureFactory} futureFactory
 * @constructor
 */
function VoidType(futureFactory) {
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
}

util.inherits(VoidType, TypeInterface);

_.extend(VoidType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsNull: function () {
        throw new Exception('VoidType.allowsNull() :: Void can only be used as a return type');
    },

    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        // After coercion, the only valid value for a void return would be null.
        // Note that this is enforced at transpile time, see PHPToJS.
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
    createEmptyScalarValue: function () {
        return null;
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        return 'void';
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

module.exports = VoidType;
