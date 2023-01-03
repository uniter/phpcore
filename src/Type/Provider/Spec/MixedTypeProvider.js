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
 * Creates a MixedType from a type spec.
 *
 * @param {TypeFactory} typeFactory
 * @constructor
 * @implements {NamedTypeProviderInterface}
 */
function MixedTypeProvider(typeFactory) {
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
}

_.extend(MixedTypeProvider.prototype, {
    /**
     * {@inheritdoc}
     */
    createType: function () {
        return this.typeFactory.createMixedType();
    },

    /**
     * {@inheritdoc}
     */
    getTypeName: function () {
        return 'mixed';
    }
});

module.exports = MixedTypeProvider;
