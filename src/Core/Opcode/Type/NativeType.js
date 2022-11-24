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
 * Represents a type where a native value is required:
 *
 * - If one is passed, it will be left alone.
 * - Any other type, including an appropriate Value object, will raise an error.
 *
 * @param {string} nativeType
 * @constructor
 * @implements {TypeInterface}
 */
function NativeType(nativeType) {
    /**
     * @type {string}
     */
    this.nativeType = nativeType;
}

util.inherits(NativeType, TypeInterface);

_.extend(NativeType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        var type = this,
            givenType;

        if (type.nativeType === 'null') {
            return (value === null);
        }

        givenType = typeof value;

        return givenType === type.nativeType;
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        var type = this,
            givenType = typeof value;

        if (type.allowsValue(value)) {
            return value;
        }

        throw new Exception(
            'Unexpected value of type "' +
            givenType +
            '" provided for NativeType<' + type.nativeType + '>'
        );
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        var nativeType = this.nativeType;

        return nativeType === 'boolean' ? 'bool' : nativeType;
    }
});

module.exports = NativeType;
