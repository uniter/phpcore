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
 * Represents a storage slot, which can be a Reference (including ReferenceSnapshot), Variable or Value.
 *
 * @param {ValueFactory} valueFactory
 * @constructor
 * @implements {TypeInterface}
 */
function SlotType(valueFactory) {
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

util.inherits(SlotType, TypeInterface);

_.extend(SlotType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        var type = this;

        return (
            type.valueFactory.isValue(value) ||
            (value instanceof Reference) || // Including ReferenceSnapshot.
            (value instanceof Variable)
        );
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        var type = this;

        if (type.allowsValue(value)) {
            // Fastest case: value is allowed.

            return value;
        }

        throw new Exception('Unexpected value provided for SlotType');
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        return 'slot';
    }
});

module.exports = SlotType;
