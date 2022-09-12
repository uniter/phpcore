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
    coerceValue: function (value) {
        var type = this,
            givenType = typeof value;

        if (givenType === type.nativeType) {
            return value;
        }

        throw new Exception(
            'Unexpected value of type "' +
            givenType +
            '" provided for NativeType<' + type.nativeType + '>'
        );
    }
});

module.exports = NativeType;
