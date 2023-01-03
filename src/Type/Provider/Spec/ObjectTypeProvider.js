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
 * Creates an ObjectType from a type spec.
 *
 * @param {TypeFactory} typeFactory
 * @constructor
 * @implements {NamedTypeProviderInterface}
 */
function ObjectTypeProvider(typeFactory) {
    /**
     * @type {TypeFactory}
     */
    this.typeFactory = typeFactory;
}

_.extend(ObjectTypeProvider.prototype, {
    /**
     * {@inheritdoc}
     */
    createType: function (typeSpecData, namespaceScope, nullable) {
        // Note that unlike ClassTypes, ObjectTypes accept any class of object.
        return this.typeFactory.createObjectType(nullable);
    },

    /**
     * {@inheritdoc}
     */
    getTypeName: function () {
        return 'object';
    }
});

module.exports = ObjectTypeProvider;
