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
 * Creates a ScalarType from a type spec.
 *
 * @param {TypeFactory} typeFactory
 * @constructor
 * @implements {NamedTypeProviderInterface}
 */
function ScalarTypeProvider(typeFactory) {
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
}

_.extend(ScalarTypeProvider.prototype, {
    /**
     * {@inheritdoc}
     */
    createType: function (typeSpecData, namespaceScope, nullable) {
        return this.typeFactory.createScalarType(typeSpecData.scalarType, nullable);
    },

    /**
     * {@inheritdoc}
     */
    getTypeName: function () {
        return 'scalar';
    }
});

module.exports = ScalarTypeProvider;
