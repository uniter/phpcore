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
 * @param {string} name
 * @param {Namespace} namespace
 * @param {NamespaceScope} namespaceScope
 * @param {Trait[]} traits
 * @param {Object.<string, Function>} constants
 * @param {Object} instanceProperties
 * @param {Object} staticProperties
 * @param {Object.<string, {args: Array, isStatic: boolean, line: number, method: Function}>} methods
 * @param {ValueCoercer} valueCoercer
 * @param {CallInstrumentation|null} instrumentation
 * @constructor
 */
function TraitDefinition(
    name,
    namespace,
    namespaceScope,
    traits,
    constants,
    instanceProperties,
    staticProperties,
    methods,
    valueCoercer,
    instrumentation
) {
    /**
     * @type {Object<string, Function>}
     */
    this.constants = constants;
    /**
     * @type {Object}
     */
    this.instanceProperties = instanceProperties;
    /**
     * @type {CallInstrumentation|null}
     */
    this.instrumentation = instrumentation;
    /**
     * @type {Object<string, {args: Array, isStatic: boolean, line: number, method: Function}>}
     */
    this.methods = methods;
    /**
     * @type {string}
     */
    this.name = name;
    /**
     * @type {Namespace}
     */
    this.namespace = namespace;
    /**
     * @type {NamespaceScope}
     */
    this.namespaceScope = namespaceScope;
    /**
     * @type {Object}
     */
    this.staticProperties = staticProperties;
    /**
     * @type {Trait[]}
     */
    this.traits = traits;
    /**
     * @type {ValueCoercer}
     */
    this.valueCoercer = valueCoercer;
}

_.extend(TraitDefinition.prototype, {
    /**
     * Fetches the factory functions for all constants defined by this trait directly.
     *
     * @returns {Object<string, Function>}
     */
    getConstants: function () {
        return this.constants;
    },

    /**
     * Fetches the instance properties for the trait.
     *
     * @returns {Object}
     */
    getInstanceProperties: function () {
        return this.instanceProperties;
    },

    /**
     * Fetches the instrumentation (if any) to use for the trait.
     *
     * @returns {CallInstrumentation|null}
     */
    getInstrumentation: function () {
        return this.instrumentation;
    },

    /**
     * Fetches the interfaces to be implemented by the trait.
     *
     * @returns {Class[]}
     */
    getInterfaces: function () {
        return this.interfaces;
    },

    /**
     * Fetches the methods for the trait.
     *
     * @returns {Object<string, {args: Array, isStatic: boolean, line: number, method: Function}>}
     */
    getMethods: function () {
        return this.methods;
    },

    /**
     * Fetches the FQCN of the trait.
     *
     * @returns {string}
     */
    getName: function () {
        var definition = this;

        return definition.namespace.getPrefix() + definition.name;
    },

    /**
     * Fetches the namespace the trait is to be defined in.
     *
     * @returns {Namespace}
     */
    getNamespace: function () {
        return this.namespace;
    },

    /**
     * Fetches the namespace scope the trait is to be defined in.
     *
     * @returns {NamespaceScope}
     */
    getNamespaceScope: function () {
        return this.namespaceScope;
    },

    /**
     * Fetches the static properties for the trait.
     *
     * @returns {Object}
     */
    getStaticProperties: function () {
        return this.staticProperties;
    },

    /**
     * Fetches the traits that this trait itself uses.
     *
     * @returns {Trait[]}
     */
    getTraits: function () {
        return this.traits;
    },

    /**
     * Fetches the value coercer for the trait (dependent on coercion mode).
     *
     * @returns {ValueCoercer}
     */
    getValueCoercer: function () {
        return this.valueCoercer;
    }
});

module.exports = TraitDefinition;
