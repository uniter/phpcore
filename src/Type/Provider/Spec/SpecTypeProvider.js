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
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception;

/**
 * Creates the correct Type from a type spec by delegating to a registered provider.
 *
 * @param {TypeFactory} typeFactory
 * @constructor
 * @implements {SpecTypeProviderInterface}
 */
function SpecTypeProvider(typeFactory) {
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
    /**
     * @type {Object.<string, TypeProviderInterface>}
     */
    this.typeNameToProviderMap = {};
}

_.extend(SpecTypeProvider.prototype, {
    /**
     * {@inheritdoc}
     */
    addNamedProvider: function (namedProvider) {
        var provider = this,
            typeName = namedProvider.getTypeName();

        if (hasOwn.call(provider.typeNameToProviderMap, typeName)) {
            throw new Exception(
                'SpecTypeProvider.addNamedProvider() :: Type "' + typeName + '" is already registered'
            );
        }

        provider.typeNameToProviderMap[typeName] = namedProvider;
    },

    /**
     * {@inheritdoc}
     */
    createType: function (typeSpecData, namespaceScope) {
        var provider = this,
            nullable = typeSpecData.nullable,
            typeName = typeSpecData.type;

        if (typeof typeName === 'undefined') {
            // Default/omitted "mixed" type is represented as undefined
            // to save on bundle size.
            typeName = 'mixed';
        }

        if (!hasOwn.call(provider.typeNameToProviderMap, typeName)) {
            throw new Exception(
                'SpecTypeProvider.createType() :: No provider is registered for type "' + typeName + '"'
            );
        }

        return provider.typeNameToProviderMap[typeName].createType(typeSpecData, namespaceScope, nullable);
    }
});

module.exports = SpecTypeProvider;
