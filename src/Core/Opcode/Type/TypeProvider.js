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
    Exception = phpCommon.Exception;

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
     * Creates a Type of the given type name.
     *
     * @param {string} typeName
     * @returns {TypeInterface}
     */
    provideType: function (typeName) {
        var provider = this;

        switch (typeName) {
            case 'any':
                return provider.typeFactory.createAnyType();
            case 'ref':
                return provider.typeFactory.createReferenceType();
            case 'snapshot':
                return provider.typeFactory.createSnapshotType();
            case 'bool':
                return provider.typeFactory.createNativeType('boolean');
            case 'number':
            case 'string':
                return provider.typeFactory.createNativeType(typeName);
            case 'val':
                return provider.typeFactory.createValueType();
            default:
                throw new Exception('Unsupported type "' + typeName + '"');
        }
    }
});

module.exports = TypeProvider;
