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
    ReferenceSnapshot = require('../../../Reference/ReferenceSnapshot'),
    TypeInterface = require('./TypeInterface'),
    Variable = require('../../../Variable').sync();

/**
 * Represents a type where the given value must be a ReferenceSnapshot
 * or a reference that can be snapshotted.
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
        return value instanceof Reference || // Including ReferenceSnapshot.
            value instanceof Variable;
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        var resolvedValue,
            type = this;

        if (value instanceof ReferenceSnapshot) {
            // Fastest case: value is already a snapshot.

            return value;
        }

        if (type.valueFactory.isValue(value)) {
            throw new Exception('SnapshotType cannot accept Values');
        }

        if ((value instanceof Reference) || (value instanceof Variable)) {
            resolvedValue = value.getValueOrNativeNull();

            if (resolvedValue === null) {
                // Undefined: return a ReferenceSnapshot that indicates this.
                return type.referenceFactory.createSnapshot(value);
            }

            // Resolve the value of the reference so that it is accessible synchronously within the opcode handler.
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
