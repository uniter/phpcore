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
 * @param {NamespaceScope} namespaceScope
 * @param {CallInstrumentation} instrumentation
 * @param {Class} classObject
 * @param {Trait|null} traitObject
 * @constructor
 */
function IsolatedScope(
    namespaceScope,
    instrumentation,
    classObject,
    traitObject
) {
    /**
     * @type {Class}
     */
    this.classObject = classObject;
    /**
     * @type {CallInstrumentation}
     */
    this.instrumentation = instrumentation;
    /**
     * @type {NamespaceScope}
     */
    this.namespaceScope = namespaceScope;
    /**
     * @type {Trait|null}
     */
    this.traitObject = traitObject;
}

_.extend(IsolatedScope.prototype, {
    /**
     * Fetches the class for this scope.
     *
     * @returns {Class}
     */
    getClass: function () {
        return this.classObject;
    },

    /**
     * Fetches the finder from the instrumentation for this scope.
     *
     * @returns {Function}
     */
    getFinder: function () {
        return this.instrumentation.getFinder();
    },

    /**
     * Fetches the instrumentation for this scope.
     *
     * @returns {CallInstrumentation}
     */
    getInstrumentation: function () {
        return this.instrumentation;
    },

    /**
     * Fetches the namespace scope for this scope.
     *
     * @returns {NamespaceScope}
     */
    getNamespaceScope: function () {
        return this.namespaceScope;
    },

    /**
     * Fetches the trait for this scope, if any.
     *
     * @returns {Trait|null}
     */
    getTrait: function () {
        return this.traitObject;
    }
});

module.exports = IsolatedScope;
