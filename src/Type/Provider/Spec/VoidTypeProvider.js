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
 * Creates a VoidType from a type spec. Note that void can only be used as a return type.
 *
 * @param {TypeFactory} typeFactory
 * @constructor
 * @implements {NamedTypeProviderInterface}
 */
function VoidTypeProvider(typeFactory) {
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
}

_.extend(VoidTypeProvider.prototype, {
    /**
     * {@inheritdoc}
     */
    createType: function () {
        return this.typeFactory.createVoidType();
    },

    /**
     * {@inheritdoc}
     */
    getTypeName: function () {
        return 'void';
    }
});

module.exports = VoidTypeProvider;
