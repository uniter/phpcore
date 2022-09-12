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
 * Represents a type where the given Reference, Variable or Value will be coerced to a Value
 * and wrapped in a ReferenceSnapshot if required.
 *
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @constructor
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

        if ((value instanceof Reference) || (value instanceof Variable)) {
            resolvedValue = value.getValueOrNativeNull();

            if (resolvedValue === null) {
                // Undefined: return a ReferenceSnapshot that indicates this.
                return type.referenceFactory.createSnapshot(value);
            }

            return resolvedValue
                .asFuture()
                .next(function (presentValue) {
                    /*
                     * Wrap the result in a ReferenceSnapshot, so that we have access
                     * to the original Reference or Variable and the Value it resolved to at that point in time.
                     */
                    return type.referenceFactory.createSnapshot(value, presentValue);
                });
        }

        throw new Exception('Unexpected value provided for SnapshotType');
    }
});

module.exports = SnapshotType;
