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
 * Represents a type where a Value is required:
 *
 * - If one is passed, it will be left alone.
 * - If a Reference or Variable is provided, .getValue() will be called.
 * - Any other type will raise an error.
 *
 * @param {ValueFactory} valueFactory
 * @constructor
 */
function ValueType(valueFactory) {
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

util.inherits(ValueType, TypeInterface);

_.extend(ValueType.prototype, {
    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        var type = this;

        if (type.valueFactory.isValue(value)) {
            return value;
        }

        if ((value instanceof Reference) || (value instanceof Variable)) {
            return value.getValue(); // Note this may return a FutureValue.
        }

        throw new Exception('Unexpected value provided for ValueType');
    }
});

module.exports = ValueType;
