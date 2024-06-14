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
    hasOwn = {}.hasOwnProperty,
    slice = [].slice,
    util = require('util'),
    FLOAT_TYPE = 'float',
    INT_TYPE = 'int',
    OF_GENERIC_TYPE_EXPECTED = 'core.of_generic_type_expected',
    TypeInterface = require('./TypeInterface'),

    /**
     * Fetches the subtype of this union that allows the given value, or null if there is none.
     *
     * @param {UnionType} typeObject
     * @param {*} value
     * @returns {ChainableInterface<TypeInterface|null>}
     */
    getMatchingSubType = function (typeObject, value) {
        var matchingSubType = null,
            numericType,
            subTypesToSearch,
            valueType = value.getType();

        if (value.isScalar()) {
            if (hasOwn.call(typeObject.scalarSubTypesByValueType, valueType)) {
                // Fastest case, an exact match.
                return typeObject.futureFactory.createPresent(typeObject.scalarSubTypesByValueType[valueType]);
            }

            // TODO: At this point, if in strict mode return Future<null>.

            // Special case: if value is a string and both float and int are present in the union,
            // use the standard numeric string semantics to decide whether and how to coerce to number.
            if (
                valueType === 'string' &&
                hasOwn.call(typeObject.scalarSubTypesByValueType, FLOAT_TYPE) &&
                hasOwn.call(typeObject.scalarSubTypesByValueType, INT_TYPE)
            ) {
                numericType = value.getNumericType();

                if (numericType === FLOAT_TYPE) {
                    return typeObject.futureFactory.createPresent(typeObject.scalarSubTypesByValueType[FLOAT_TYPE]);
                }

                if (numericType === INT_TYPE) {
                    return typeObject.futureFactory.createPresent(typeObject.scalarSubTypesByValueType[INT_TYPE]);
                }
            }

            subTypesToSearch = typeObject.nonClassSubTypesByPriority;
        } else {
            subTypesToSearch = typeObject.allSubTypesByPriority;
        }

        return typeObject.flow
            .eachAsync(subTypesToSearch, function (subType) {
                // Coercion is performed first, which will have no effect if the type is not appropriate.
                return subType.coerceValue(value)
                    .next(function (coercedValue) {
                        return subType.allowsValue(coercedValue);
                    })
                    .next(function (allowsValue) {
                        if (allowsValue) {
                            matchingSubType = subType;

                            return false; // A subtype has matched, no need to check further subtypes.
                        }
                    });
            })
            .next(function () {
                return matchingSubType;
            });
    };

/**
 * Represents a type that accepts a value of multiple given subtypes.
 *
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @param {Object.<string, ScalarType>} scalarSubTypesByValueType
 * @param {ScalarType[]} scalarSubTypesByPriority
 * @param {ClassType[]} classSubTypes
 * @param {TypeInterface[]} otherSubTypes
 * @param {boolean} nullIsAllowed
 * @constructor
 */
function UnionType(
    futureFactory,
    flow,
    scalarSubTypesByValueType,
    scalarSubTypesByPriority,
    classSubTypes,
    otherSubTypes,
    nullIsAllowed
) {
    /**
     * Search order when the value is not a scalar.
     *
     * @type {TypeInterface[]}
     */
    this.allSubTypesByPriority = classSubTypes.concat(otherSubTypes, scalarSubTypesByPriority);
    /**
     * @type {ClassType[]}
     */
    this.classSubTypes = classSubTypes;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * Search order when the value is a scalar but there is no exact match.
     *
     * @type {TypeInterface[]}
     */
    this.nonClassSubTypesByPriority = otherSubTypes.concat(scalarSubTypesByPriority);
    /**
     * @type {boolean}
     */
    this.nullIsAllowed = nullIsAllowed;
    /**
     * @type {TypeInterface[]}
     */
    this.otherSubTypes = otherSubTypes;
    /**
     * @type {ScalarType[]}
     */
    this.scalarSubTypesByPriority = scalarSubTypesByPriority;
    /**
     * @type {Object<string, ScalarType>}
     */
    this.scalarSubTypesByValueType = scalarSubTypesByValueType;
}

util.inherits(UnionType, TypeInterface);

_.extend(UnionType.prototype, {
    /**
     * {@inheritdoc}
     */
    allowsNull: function () {
        return this.nullIsAllowed;
    },

    /**
     * {@inheritdoc}
     */
    allowsValue: function (value) {
        var typeObject = this;

        if (typeObject.nullIsAllowed && value.getType() === 'null') {
            // Null was provided and is allowed.
            return typeObject.futureFactory.createPresent(true);
        }

        return getMatchingSubType(typeObject, value)
            .next(function (matchingSubType) {
                return matchingSubType !== null;
            });
    },

    /**
     * {@inheritdoc}
     */
    coerceValue: function (value) {
        var typeObject = this;

        return getMatchingSubType(typeObject, value)
            .next(function (matchingSubType) {
                return matchingSubType !== null ?
                    matchingSubType.coerceValue(value) :
                    // Just return the value unchanged if no subtypes match,
                    // as a later stage will validate it separately.
                    value;
            });
    },

    /**
     * {@inheritdoc}
     */
    getDisplayName: function () {
        var displayName,
            typeNames,
            typeObject = this,
            otherSubTypes = slice.call(typeObject.otherSubTypes),
            scalarSubTypes = slice.call(typeObject.scalarSubTypesByPriority);

        otherSubTypes.sort(function (subTypeA, subTypeB) {
            return subTypeB.getDisplayName().localeCompare(subTypeA.getDisplayName());
        });

        scalarSubTypes.sort(function (subTypeA, subTypeB) {
            // Scalar subtypes are sorted in reverse alphabetical order.
            return subTypeB.getDisplayName().localeCompare(subTypeA.getDisplayName());
        });

        typeNames = typeObject.classSubTypes.concat(otherSubTypes, scalarSubTypes)
            .map(function (subType) {
                return subType.getDisplayName();
            });
        displayName = typeNames.join('|');

        if (typeObject.nullIsAllowed) {
            if (typeNames.length === 1) {
                displayName = '?' + displayName;
            } else {
                displayName += '|null';
            }
        }

        return displayName;
    },

    /**
     * {@inheritdoc}
     */
    getExpectedMessage: function (translator) {
        // FIXME: Is this correct?
        return translator.translate(OF_GENERIC_TYPE_EXPECTED, {
            expectedType: this.getDisplayName()
        });
    },

    /**
     * {@inheritdoc}
     */
    isScalar: function () {
        return false;
    }
});

module.exports = UnionType;
