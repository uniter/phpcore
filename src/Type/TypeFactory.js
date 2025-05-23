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
    ArrayType = require('./ArrayType'),
    CallableType = require('./CallableType'),
    ClassType = require('./ClassType'),
    IterableType = require('./IterableType'),
    MixedType = require('./MixedType'),
    NullType = require('./NullType'),
    ObjectType = require('./ObjectType'),
    ScalarType = require('./ScalarType'),
    UnionType = require('./UnionType'),
    VoidType = require('./VoidType');

/**
 * Creates objects related to Types.
 *
 * @param {ValueFactory} valueFactory
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @constructor
 */
function TypeFactory(valueFactory, futureFactory, flow) {
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(TypeFactory.prototype, {
    /**
     * Creates a new ArrayType.
     *
     * @param {boolean=} nullIsAllowed
     * @returns {ArrayType}
     */
    createArrayType: function (nullIsAllowed) {
        return new ArrayType(this.futureFactory, Boolean(nullIsAllowed));
    },

    /**
     * Creates a new CallableType.
     *
     * @param {NamespaceScope} namespaceScope
     * @param {boolean=} nullIsAllowed
     * @returns {CallableType}
     */
    createCallableType: function (namespaceScope, nullIsAllowed) {
        return new CallableType(namespaceScope, Boolean(nullIsAllowed));
    },

    /**
     * Creates a new ClassType.
     *
     * @param {string} className
     * @param {boolean=} nullIsAllowed
     * @returns {ClassType}
     */
    createClassType: function (className, nullIsAllowed) {
        return new ClassType(this.futureFactory, className, Boolean(nullIsAllowed));
    },

    /**
     * Creates a new IterableType.
     *
     * @param {boolean=} nullIsAllowed
     * @returns {IterableType}
     */
    createIterableType: function (nullIsAllowed) {
        return new IterableType(this.futureFactory, Boolean(nullIsAllowed));
    },

    /**
     * Creates a new MixedType.
     *
     * @returns {MixedType}
     */
    createMixedType: function () {
        return new MixedType(this.futureFactory);
    },

    /**
     * Creates a new NullType.
     *
     * @returns {NullType}
     */
    createNullType: function () {
        return new NullType(this.futureFactory);
    },

    /**
     * Creates a new ObjectType.
     *
     * @param {boolean=} nullIsAllowed
     * @returns {ObjectType}
     */
    createObjectType: function (nullIsAllowed) {
        return new ObjectType(this.futureFactory, Boolean(nullIsAllowed));
    },

    /**
     * Creates a new ScalarType.
     *
     * @param {string} scalarType
     * @param {boolean=} nullIsAllowed
     * @returns {ScalarType}
     */
    createScalarType: function (scalarType, nullIsAllowed) {
        return new ScalarType(this.valueFactory, this.futureFactory, scalarType, Boolean(nullIsAllowed));
    },

    /**
     * Creates a new UnionType.
     *
     * @param {Object.<string, ScalarType>} scalarSubTypesByValueType
     * @param {ScalarType[]} scalarSubTypesByPriority
     * @param {ClassType[]} classSubTypes
     * @param {TypeInterface[]} otherSubTypes
     * @param {boolean=} nullIsAllowed
     * @returns {UnionType}
     */
    createUnionType: function (
        scalarSubTypesByValueType,
        scalarSubTypesByPriority,
        classSubTypes,
        otherSubTypes,
        nullIsAllowed
    ) {
        var factory = this;

        return new UnionType(
            factory.futureFactory,
            factory.flow,
            scalarSubTypesByValueType,
            scalarSubTypesByPriority,
            classSubTypes,
            otherSubTypes,
            Boolean(nullIsAllowed)
        );
    },

    /**
     * Creates a new VoidType.
     *
     * @returns {VoidType}
     */
    createVoidType: function () {
        return new VoidType(this.futureFactory);
    }
});

module.exports = TypeFactory;
