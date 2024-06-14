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
 * Creates a NullType from a type spec.
 *
 * @param {TypeFactory} typeFactory
 * @constructor
 * @implements {NamedTypeProviderInterface}
 */
function NullTypeProvider(typeFactory) {
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
}

_.extend(NullTypeProvider.prototype, {
    /**
     * {@inheritdoc}
     */
    createType: function () {
        return this.typeFactory.createNullType();
    },

    /**
     * {@inheritdoc}
     */
    getTypeName: function () {
        return 'null';
    }
});

module.exports = NullTypeProvider;
