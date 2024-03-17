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
    Exception = phpCommon.Exception,
    provideSingleType = function (provider, typeName) {
        switch (typeName) {
            case 'any':
                return provider.typeFactory.createAnyType();
            case 'element':
                return provider.typeFactory.createElementType();
            case 'list':
                return provider.typeFactory.createListType();
            case 'ref':
                return provider.typeFactory.createReferenceType();
            case 'slot':
                return provider.typeFactory.createSlotType();
            case 'snapshot':
                return provider.typeFactory.createSnapshotType();
            case 'bool':
                return provider.typeFactory.createNativeType('boolean');
            case 'null':
            case 'number':
            case 'string':
            case 'undefined':
                return provider.typeFactory.createNativeType(typeName);
            case 'val':
                return provider.typeFactory.createValueType();
            // Provide "void" as a shorthand for "undefined" to shrink compiled bundle size.
            case 'void':
                return provider.typeFactory.createVoidType();
            default:
                throw new Exception('Unsupported type "' + typeName + '"');
        }
    };

/**
 * Creates type objects for opcodes.
 *
 * TODO: Cache these?
 *
 * @param {TypeFactory} typeFactory
 * @constructor
 */
function TypeProvider(typeFactory) {
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
}

_.extend(TypeProvider.prototype, {
    /**
     * A shorthand for creating AnyTypes.
     *
     * @returns {AnyType}
     */
    provideAnyType: function () {
        return this.provideType('any');
    },

    /**
     * Creates a Type of the given type name. Note that if multiple types are given,
     * separated by a pipe character "|", a UnionType will be returned.
     *
     * @param {string} typeName
     * @returns {TypeInterface}
     */
    provideType: function (typeName) {
        var provider = this,
            subTypes;

        subTypes = typeName.split('|').map(function (subTypeName) {
            return provideSingleType(provider, subTypeName);
        });

        return subTypes.length === 1 ? subTypes[0] : provider.typeFactory.createUnionType(subTypes);
    }
});

module.exports = TypeProvider;
