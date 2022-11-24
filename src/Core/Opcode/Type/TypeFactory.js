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
    AnyType = require('./AnyType'),
    ListType = require('./ListType'),
    NativeType = require('./NativeType'),
    ReferenceType = require('./ReferenceType'),
    SnapshotType = require('./SnapshotType'),
    UnionType = require('./UnionType'),
    ValueType = require('./ValueType');

/**
 * Creates type objects for opcodes.
 *
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @constructor
 */
function TypeFactory(
    valueFactory,
    referenceFactory
) {
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(TypeFactory.prototype, {
    /**
     * Creates a new AnyType.
     *
     * @returns {AnyType}
     */
    createAnyType: function () {
        return new AnyType();
    },

    /**
     * Creates a new ListType.
     *
     * @returns {ListType}
     */
    createListType: function () {
        return new ListType();
    },

    /**
     * Creates a new NativeType.
     *
     * @param {string} nativeType
     * @returns {NativeType}
     */
    createNativeType: function (nativeType) {
        return new NativeType(nativeType);
    },

    /**
     * Creates a new ReferenceType.
     *
     * @returns {ReferenceType}
     */
    createReferenceType: function () {
        return new ReferenceType();
    },

    /**
     * Creates a new SnapshotType.
     *
     * @returns {SnapshotType}
     */
    createSnapshotType: function () {
        var factory = this;

        return new SnapshotType(factory.valueFactory, factory.referenceFactory);
    },

    /**
     * Creates a new UnionType.
     *
     * @param {TypeInterface[]} subTypes
     * @returns {UnionType}
     */
    createUnionType: function (subTypes) {
        return new UnionType(subTypes);
    },

    /**
     * Creates a new ValueType.
     *
     * @returns {ValueType}
     */
    createValueType: function () {
        return new ValueType(this.valueFactory);
    }
});

module.exports = TypeFactory;
