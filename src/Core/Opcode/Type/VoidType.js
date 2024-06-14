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
 * Represents a type where no value is to be returned.
 *
 * @constructor
 * @implements {TypeInterface}
 */
function VoidType() {

}

util.inherits(VoidType, TypeInterface);

_.extend(VoidType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        return typeof value === 'undefined';
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
            '" provided for VoidType'
        );
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        return 'void';
    }
});

module.exports = VoidType;
