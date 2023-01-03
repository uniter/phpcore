/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

/**
 * Creates a ClassType from a type spec.
 *
 * @param {TypeFactory} typeFactory
 * @constructor
 * @implements {NamedTypeProviderInterface}
 */
function ClassTypeProvider(typeFactory) {
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
}

_.extend(ClassTypeProvider.prototype, {
    /**
     * {@inheritdoc}
     */
    createType: function (typeSpecData, namespaceScope, nullable) {
        // We must now resolve the class name given relative to the current namespace scope,
        // as it may be a relative class name that relies on the current namespace or a `use` import.
        var resolvedClass = namespaceScope.resolveClass(typeSpecData.className);

        return this.typeFactory.createClassType(
            resolvedClass.namespace.getPrefix() + resolvedClass.name,
            nullable
        );
    },

    /**
     * {@inheritdoc}
     */
    getTypeName: function () {
        return 'class';
    }
});

module.exports = ClassTypeProvider;
