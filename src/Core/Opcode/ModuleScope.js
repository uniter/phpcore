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
 * @param {ValueFactory} valueFactory
 * @param {ScopeFactory} scopeFactory
 * @param {Namespace} globalNamespace
 * @param {Module} module
 * @param {NamespaceScope} topLevelNamespaceScope
 * @param {Environment} environment
 * @constructor
 */
function ModuleScope(
    valueFactory,
    scopeFactory,
    globalNamespace,
    module,
    topLevelNamespaceScope,
    environment
) {
    /**
     * Use the top-level NamespaceScope as the current one initially
     *
     * @type {NamespaceScope}
     */
    this.currentNamespaceScope = topLevelNamespaceScope;
    /**
     * @type {Environment}
     */
    this.environment = environment;
    /**
     * @type {Namespace}
     */
    this.globalNamespace = globalNamespace;
    /**
     * @type {Module}
     */
    this.module = module;
    /**
     * @type {ScopeFactory}
     */
    this.scopeFactory = scopeFactory;
    /**
     * @type {NamespaceScope}
     */
    this.topLevelNamespaceScope = topLevelNamespaceScope;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(ModuleScope.prototype, {
    /**
     * Fetches the current NamespaceScope
     *
     * @returns {NamespaceScope}
     */
    getCurrentNamespaceScope: function () {
        return this.currentNamespaceScope;
    },

    /**
     * Fetches this module's Environment
     *
     * @returns {Environment}
     */
    getEnvironment: function () {
        return this.environment;
    },

    /**
     * Fetches this module
     *
     * @returns {Module}
     */
    getModule: function () {
        return this.module;
    },

    /**
     * Fetches a human-readable string representing the path to the current script file
     *
     * @returns {string}
     */
    getNormalisedPath: function () {
        var path = this.currentNamespaceScope.getFilePath();

        return path !== null ? path : '(program)';
    },

    getTopLevelNamespaceScope: function () {
        return this.topLevelNamespaceScope;
    },

    /**
     * Creates a NamespaceScope for the given descendant namespace of this one, switching to it
     *
     * @param {string} name
     * @returns {NamespaceScope}
     */
    useDescendantNamespaceScope: function (name) {
        var scope = this,
            descendantNamespaceScope = scope.topLevelNamespaceScope.getDescendant(name);

        scope.currentNamespaceScope = descendantNamespaceScope;

        return descendantNamespaceScope;
    },

    /**
     * Creates a NamespaceScope for the global namespace, switching to it
     */
    useGlobalNamespaceScope: function () {
        var scope = this,
            namespaceScope = scope.scopeFactory.createNamespaceScope(
                scope.globalNamespace,
                scope.globalNamespace,
                scope.module
            );

        scope.currentNamespaceScope = namespaceScope;

        return namespaceScope;
    }
});

module.exports = ModuleScope;
