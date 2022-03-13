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
 * Creates the correct Type from a type spec.
 *
 * @param {TypeFactory} typeFactory
 * @constructor
 */
function SpecTypeProvider(typeFactory) {
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
}

_.extend(SpecTypeProvider.prototype, {
    /**
     * Creates the correct Type from a type spec.
     *
     * @param {Object} typeSpecData
     * @param {NamespaceScope} namespaceScope
     * @returns {TypeInterface}
     */
    createType: function (typeSpecData, namespaceScope) {
        var factory = this,
            nullable = typeSpecData.nullable,
            resolvedClass;

        switch (typeSpecData.type) {
            case 'array':
                return factory.typeFactory.createArrayType(nullable);
            case 'callable':
                return factory.typeFactory.createCallableType(namespaceScope, nullable);
            case 'class':
                // We must now resolve the class name given relative to the current namespace scope,
                // as it may be a relative class name that relies on the current namespace or a `use` import
                resolvedClass = namespaceScope.resolveClass(typeSpecData.className);

                return factory.typeFactory.createClassType(
                    resolvedClass.namespace.getPrefix() + resolvedClass.name,
                    nullable
                );
            case 'iterable':
                return factory.typeFactory.createIterableType(nullable);
            case 'object':
                // Note that unlike ClassTypes, ObjectTypes accept any class of object.
                return factory.typeFactory.createObjectType(nullable);
            case 'scalar':
                return factory.typeFactory.createScalarType(typeSpecData.scalarType, nullable);
            case undefined:
                return factory.typeFactory.createMixedType();
            default:
                throw new Exception('Unsupported type "' + typeSpecData.type + '"');
        }
    }
});

module.exports = SpecTypeProvider;
