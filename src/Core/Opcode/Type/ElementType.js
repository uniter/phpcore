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
    KeyReferencePair = require('../../../KeyReferencePair'),
    KeyValuePair = require('../../../KeyValuePair'),
    Reference = require('../../../Reference/Reference'),
    ReferenceElement = require('../../../Element/ReferenceElement'),
    TypeInterface = require('./TypeInterface'),
    Variable = require('../../../Variable').sync();

/**
 * Represents a type of KeyReferencePair, KeyValuePair, Reference, ReferenceElement, Value or Variable
 * that may be used as the elements of an array literal.
 *
 * @param {ValueFactory} valueFactory
 * @constructor
 * @implements {TypeInterface}
 */
function ElementType(valueFactory) {
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

util.inherits(ElementType, TypeInterface);

_.extend(ElementType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        var type = this;

        return (
            type.valueFactory.isValue(value) ||
            value instanceof ReferenceElement ||
            value instanceof KeyReferencePair ||
            value instanceof KeyValuePair ||
            value instanceof Reference || // Including ReferenceSnapshot.
            value instanceof Variable
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

        throw new Exception('Unexpected value provided for ElementType');
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        return 'element';
    }
});

module.exports = ElementType;
