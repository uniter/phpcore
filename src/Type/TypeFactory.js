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
    MixedType = require('./MixedType');

/**
 * Creates objects related to Types
 *
 * @param {FutureFactory} futureFactory
 * @constructor
 */
function TypeFactory(futureFactory) {
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
}

_.extend(TypeFactory.prototype, {
    /**
     * Creates a new ArrayType
     *
     * @param {boolean=} nullIsAllowed
     * @returns {ArrayType}
     */
    createArrayType: function (nullIsAllowed) {
        return new ArrayType(this.futureFactory, Boolean(nullIsAllowed));
    },

    /**
     * Creates a new CallableType
     *
     * @param {NamespaceScope} namespaceScope
     * @param {boolean=} nullIsAllowed
     * @returns {CallableType}
     */
    createCallableType: function (namespaceScope, nullIsAllowed) {
        return new CallableType(namespaceScope, Boolean(nullIsAllowed));
    },

    /**
     * Creates a new ClassType
     *
     * @param {string} className
     * @param {boolean=} nullIsAllowed
     * @returns {ClassType}
     */
    createClassType: function (className, nullIsAllowed) {
        return new ClassType(this.futureFactory, className, Boolean(nullIsAllowed));
    },

    /**
     * Creates a new IterableType
     *
     * @param {boolean=} nullIsAllowed
     * @returns {IterableType}
     */
    createIterableType: function (nullIsAllowed) {
        return new IterableType(this.futureFactory, Boolean(nullIsAllowed));
    },

    /**
     * Creates a new MixedType
     *
     * @returns {MixedType}
     */
    createMixedType: function () {
        return new MixedType(this.futureFactory);
    }
});

module.exports = TypeFactory;
