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
 * Creates an IterableType from a type spec.
 *
 * @param {TypeFactory} typeFactory
 * @constructor
 * @implements {NamedTypeProviderInterface}
 */
function IterableTypeProvider(typeFactory) {
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
}

_.extend(IterableTypeProvider.prototype, {
    /**
     * {@inheritdoc}
     */
    createType: function (typeSpecData, namespaceScope, nullable) {
        return this.typeFactory.createIterableType(nullable);
    },

    /**
     * {@inheritdoc}
     */
    getTypeName: function () {
        return 'iterable';
    }
});

module.exports = IterableTypeProvider;
