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
 * Creates an ArrayType from a type spec.
 *
 * @param {TypeFactory} typeFactory
 * @constructor
 * @implements {NamedTypeProviderInterface}
 */
function ArrayTypeProvider(typeFactory) {
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
}

_.extend(ArrayTypeProvider.prototype, {
    /**
     * {@inheritdoc}
     */
    createType: function (typeSpecData, namespaceScope, nullable) {
        return this.typeFactory.createArrayType(nullable);
    },

    /**
     * {@inheritdoc}
     */
    getTypeName: function () {
        return 'array';
    }
});

module.exports = ArrayTypeProvider;
