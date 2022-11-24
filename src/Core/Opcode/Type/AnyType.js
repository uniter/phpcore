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
 * such as an opcode parameter with no type specified.
 *
 * @constructor
 * @implements {TypeInterface}
 */
function AnyType() {

}

util.inherits(AnyType, TypeInterface);

_.extend(AnyType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsValue: function () {
        return true; // "Any" type allows any value.
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
        return 'any';
    }
});

module.exports = AnyType;
