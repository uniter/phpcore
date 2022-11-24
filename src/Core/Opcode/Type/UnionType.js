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
    TypeInterface = require('./TypeInterface'),

    /**
     * Fetches the subtype of this union that allows the given value, or null if there is none.
     *
     * @param {UnionType} type
     * @param {*} value
     * @returns {TypeInterface|null}
     */
    getMatchingSubType = function (type, value) {
        var matchingSubType = null;

        _.each(type.subTypes, function (subType) {
            if (subType.allowsValue(value)) {
                matchingSubType = subType;
                return false; // A subtype has matched, no need to check further subtypes.
            }
        });

        return matchingSubType;
    };

/**
 * Represents a type composed of multiple possible subtypes.
 *
 * @param {TypeInterface[]} subTypes
 * @constructor
 * @implements {TypeInterface}
 */
function UnionType(subTypes) {
    /**
     * @type {TypeInterface[]}
     */
    this.subTypes = subTypes;
}

util.inherits(UnionType, TypeInterface);

_.extend(UnionType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        return getMatchingSubType(this, value) !== null;
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        var type = this,
            matchingSubType = getMatchingSubType(this, value);

        if (matchingSubType !== null) {
            return matchingSubType.coerceValue(value);
        }

        throw new Exception(
            'Unexpected value provided for UnionType<' + type.getDisplayName() + '>'
        );
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        var type = this;

        return type.subTypes
            .map(function (subType) {
                return subType.getDisplayName();
            })
            .join('|');
    }
});

module.exports = UnionType;
