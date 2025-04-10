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
 * Represents a trait exposed to PHP-land.
 *
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {FunctionFactory} functionFactory
 * @param {CallStack} callStack
 * @param {Flow} flow
 * @param {FutureFactory} futureFactory
 * @param {Userland} userland
 * @param {string} name Fully-qualified class name (FQCN)
 * @param {Class[]} traits Traits used by this class itself
 * @param {Object} constants
 * @param {Object} instancePropertiesData
 * @param {Object} staticPropertiesData
 * @param {Object} methods
 * @param {NamespaceScope} namespaceScope
 * @param {ValueCoercer} valueCoercer Value coercer configured specifically for this class
 * @param {FFIFactory} ffiFactory
 * @param {CallInstrumentation} instrumentation
 * @constructor
 */
function Trait(
    valueFactory,
    referenceFactory,
    functionFactory,
    callStack,
    flow,
    futureFactory,
    userland,
    name,
    traits,
    constants,
    instancePropertiesData,
    staticPropertiesData,
    methods,
    namespaceScope,
    valueCoercer,
    ffiFactory,
    instrumentation
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {Object}
     */
    this.constants = constants;
    /**
     * @type {FFIFactory}
     */
    this.ffiFactory = ffiFactory;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {FunctionFactory}
     */
    this.functionFactory = functionFactory;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {Object}
     */
    this.instancePropertiesData = instancePropertiesData;
    /**
     * @type {CallInstrumentation}
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
     * @type {NamespaceScope}
     */
    this.namespaceScope = namespaceScope;
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
    /**
     * @type {Object}
     */
    this.staticPropertiesData = staticPropertiesData;
    /**
     * @type {Trait[]}
     */
    this.traits = traits;
    /**
     * @type {Userland}
     */
    this.userland = userland;
    /**
     * @type {ValueCoercer}
     */
    this.valueCoercer = valueCoercer;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(Trait.prototype, {
    /**
     * Fetches the trait's constant definitions.
     *
     * @returns {Object}
     */
    getConstants: function () {
        var constants = {},
            traitObject = this;

        // Merge in the constants from any traits used by this trait.
        _.each(traitObject.traits, function (usedTraitObject) {
            Object.assign(constants, usedTraitObject.getConstants());
        });

        _.forOwn(traitObject.constants, function (constantData, constantName) {
            constants[constantName] = Object.assign({traitObject: traitObject}, constantData);
        });

        return constants;
    },

    /**
     * Fetches the trait's instance property definitions.
     *
     * @returns {Object}
     */
    getInstanceProperties: function () {
        var properties = {},
            traitObject = this;

        // Merge in the properties from any traits used by this trait.
        _.each(traitObject.traits, function (usedTraitObject) {
            Object.assign(properties, usedTraitObject.getInstanceProperties());
        });

        _.forOwn(this.instancePropertiesData, function (propertyData, propertyName) {
            properties[propertyName] = Object.assign({traitObject: traitObject}, propertyData);
        });

        return properties;
    },

    /**
     * Fetches the trait's method definitions.
     *
     * @returns {Object<string, {args: Array, isStatic: boolean, line: number, method: Function}>}
     */
    getMethods: function () {
        var methods = {},
            traitObject = this;

        // Merge in the methods from any traits used by this trait.
        _.each(traitObject.traits, function (usedTraitObject) {
            Object.assign(methods, usedTraitObject.getMethods());
        });

        Object.assign(methods, traitObject.methods);

        return methods;
    },

    /**
     * Fetches the FQCN (Fully-Qualified Class Name) of this trait.
     * If the namespace prefix is not wanted, see .getUnprefixedName().
     *
     * @returns {string}
     */
    getName: function () {
        return this.name;
    },

    /**
     * Fetches the trait's static property definitions.
     *
     * @returns {Object}
     */
    getStaticProperties: function () {
        var properties = {},
            traitObject = this;

        // Merge in the properties from any traits used by this trait.
        _.each(traitObject.traits, function (usedTraitObject) {
            Object.assign(properties, usedTraitObject.getStaticProperties());
        });

        _.forOwn(traitObject.staticPropertiesData, function (propertyData, propertyName) {
            properties[propertyName] = Object.assign({traitObject: traitObject}, propertyData);
        });

        return properties;
    },

    /**
     * Fetches the traits used by this trait.
     *
     * @returns {Trait[]}
     */
    getTraits: function () {
        return this.traits;
    },

    /**
     * Fetches the name of this trait with any namespace prefix removed,
     * e.g.:
     *     trait with FQCN: My\Stuff\AwesomeTrait
     *     unprefixed name: AwesomeTrait
     *
     * @returns {string}
     */
    getUnprefixedName: function () {
        return this.name.replace(/^.*\\/, '');
    }
});

module.exports = Trait;
