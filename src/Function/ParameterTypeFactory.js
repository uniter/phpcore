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
 * Creates the correct Type from a function, closure or method parameter spec
 *
 * @param {TypeFactory} typeFactory
 * @constructor
 */
function ParameterTypeFactory(typeFactory) {
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
}

_.extend(ParameterTypeFactory.prototype, {
    /**
     * Creates the correct Type from a function, closure or method parameter spec
     *
     * @param {Object} parameterSpecData
     * @param {NamespaceScope} namespaceScope
     * @returns {TypeInterface}
     */
    createParameterType: function (parameterSpecData, namespaceScope) {
        var factory = this,
            resolvedClass;

        switch (parameterSpecData.type) {
            case 'array':
                return factory.typeFactory.createArrayType();
            case 'callable':
                return factory.typeFactory.createCallableType(namespaceScope);
            case 'class':
                // We must now resolve the class name given relative to the current namespace scope,
                // as it may be a relative class name that relies on the current namespace or a `use` import
                resolvedClass = namespaceScope.resolveClass(parameterSpecData.className);

                return factory.typeFactory.createClassType(resolvedClass.namespace.getPrefix() + resolvedClass.name);
            case 'iterable':
                return factory.typeFactory.createIterableType();
            case undefined:
                return factory.typeFactory.createMixedType();
            default:
                throw new Error('Unsupported parameter type "' + parameterSpecData.type + '"');
        }
    }
});

module.exports = ParameterTypeFactory;
