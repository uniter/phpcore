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
    Reference = require('../../../Reference/Reference'),
    TypeInterface = require('./TypeInterface'),
    Variable = require('../../../Variable').sync();

/**
 * Represents a type where a Reference or Variable is required:
 *
 * - If one is passed it will be left alone.
 * - Any other type, including a Value, will raise an error.
 *
 * @constructor
 * @implements {TypeInterface}
 */
function ReferenceType() {

}

util.inherits(ReferenceType, TypeInterface);

_.extend(ReferenceType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        return (value instanceof Reference) || (value instanceof Variable);
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        if (this.allowsValue(value)) {
            return value;
        }

        throw new Exception('Unexpected value provided for ReferenceType');
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        return 'ref';
    }
});

module.exports = ReferenceType;
