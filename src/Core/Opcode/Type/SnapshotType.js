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
    ReferenceSnapshot = require('../../../Reference/ReferenceSnapshot'),
    TypeInterface = require('./TypeInterface'),
    Variable = require('../../../Variable').sync();

/**
 * Represents a type where the given Reference, Variable or Value will be coerced to a Value
 * and wrapped in a ReferenceSnapshot if required.
 *
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @constructor
 * @implements {TypeInterface}
 */
function SnapshotType(
    valueFactory,
    referenceFactory
) {
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

util.inherits(SnapshotType, TypeInterface);

_.extend(SnapshotType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        var type = this;

        if (type.valueFactory.isValue(value)) {
            // Fastest case: a Value was given, there is no reference or variable to fetch it from.

            return true; // No need to wrap a plain Value in a ReferenceSnapshot.
        }

        if (value instanceof ReferenceSnapshot) {
            // Value is already a snapshot: nothing to do.
            return true;
        }

        if (
            value instanceof ReferenceElement ||
            value instanceof KeyReferencePair ||
            value instanceof KeyValuePair
        ) {
            // Value is an array literal element.
            return true;
        }

        // Otherwise value must be a reference or variable to be snapshotted.
        return (value instanceof Reference) || (value instanceof Variable);
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        var resolvedValue,
            type = this;

        if (type.valueFactory.isValue(value)) {
            // Fastest case: a Value was given, there is no reference or variable to fetch it from.

            return value; // No need to wrap a plain Value in a ReferenceSnapshot.
        }

        if (value instanceof ReferenceSnapshot) {
            // Value is already a snapshot: nothing to do.
            return value;
        }

        if (
            value instanceof ReferenceElement ||
            value instanceof KeyReferencePair ||
            value instanceof KeyValuePair
        ) {
            // Value is an array literal element.
            return value;
        }

        if ((value instanceof Reference) || (value instanceof Variable)) {
            resolvedValue = value.getValueOrNativeNull();

            if (resolvedValue === null) {
                // Undefined: return a ReferenceSnapshot that indicates this.
                return type.referenceFactory.createSnapshot(value);
            }

            return resolvedValue
                .next(function (presentValue) {
                    /*
                     * Wrap the result in a ReferenceSnapshot, so that we have access
                     * to the original Reference or Variable and the Value it resolved to at that point in time.
                     */
                    return type.referenceFactory.createSnapshot(value, presentValue);
                });
        }

        throw new Exception('Unexpected value provided for SnapshotType');
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        return 'snapshot';
    }
});

module.exports = SnapshotType;
