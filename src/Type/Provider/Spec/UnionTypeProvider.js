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
    SCALAR_TYPES_BY_PRIORITY = [
        'int',
        'float',
        'string',
        'bool'
    ];

/**
 * Creates a UnionType from a type spec.
 *
 * @param {TypeFactory} typeFactory
 * @param {SpecTypeProviderInterface} specTypeProvider
 * @constructor
 * @implements {NamedTypeProviderInterface}
 */
function UnionTypeProvider(typeFactory, specTypeProvider) {
    /**
     * @type {SpecTypeProviderInterface}
     */
    this.specTypeProvider = specTypeProvider;
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
}

_.extend(UnionTypeProvider.prototype, {
    /**
     * {@inheritdoc}
     */
    createType: function (typeSpecData, namespaceScope, nullable) {
        var classSubTypes = [],
            otherSubTypes = [],
            provider = this,
            scalarSubTypesByValueType = {},
            scalarSubTypesByPriority = [];

        _.each(typeSpecData.types, function (subTypeSpecData) {
            var scalarValueTypeName,
                subType = provider.specTypeProvider.createType(subTypeSpecData, namespaceScope);

            if (subTypeSpecData.type === 'scalar') {
                scalarValueTypeName = subType.getScalarValueType();

                scalarSubTypesByValueType[scalarValueTypeName] = subType;
                scalarSubTypesByPriority.push(subType);
            } else if (subTypeSpecData.type === 'class') {
                classSubTypes.push(subType);
            } else {
                otherSubTypes.push(subType);
            }
        });

        scalarSubTypesByPriority.sort(function (subTypeA, subTypeB) {
            return SCALAR_TYPES_BY_PRIORITY.indexOf(subTypeA.getDisplayName()) -
                SCALAR_TYPES_BY_PRIORITY.indexOf(subTypeB.getDisplayName());
        });

        return provider.typeFactory.createUnionType(
            scalarSubTypesByValueType,
            scalarSubTypesByPriority,
            classSubTypes,
            otherSubTypes,
            nullable
        );
    },

    /**
     * {@inheritdoc}
     */
    getTypeName: function () {
        return 'union';
    }
});

module.exports = UnionTypeProvider;
