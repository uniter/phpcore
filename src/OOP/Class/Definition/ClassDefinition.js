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
    hasOwn = {}.hasOwnProperty,
    MAGIC_DESTRUCT = '__destruct';

/**
 * @param {string} name
 * @param {Namespace} namespace
 * @param {NamespaceScope} namespaceScope
 * @param {Class|null} superClass
 * @param {Class[]} interfaces
 * @param {Trait[]} traits
 * @param {Object} constants
 * @param {string|null} constructorName
 * @param {Function} InternalClass
 * @param {Object} methodData
 * @param {Object.<string, {args: Array, isStatic: boolean, line: number, method: Function}>} methods
 * @param {Object} rootInternalPrototype
 * @param {Object} instanceProperties
 * @param {Object} staticProperties
 * @param {ValueCoercer} valueCoercer
 * @param {Function|null} methodCaller Custom method call handler
 * @param {CallInstrumentation|null} instrumentation
 * @constructor
 */
function ClassDefinition(
    name,
    namespace,
    namespaceScope,
    superClass,
    interfaces,
    traits,
    constants,
    constructorName,
    InternalClass,
    methodData,
    methods,
    rootInternalPrototype,
    instanceProperties,
    staticProperties,
    valueCoercer,
    methodCaller,
    instrumentation
) {
    /**
     * @type {Object<string, Function>}
     */
    this.constants = constants;
    /**
     * @type {string|null}
     */
    this.constructorName = constructorName;
    /**
     * @type {Object}
     */
    this.instanceProperties = instanceProperties;
    /**
     * @type {CallInstrumentation|null}
     */
    this.instrumentation = instrumentation;
    /**
     * @type {Class[]}
     */
    this.interfaces = interfaces;
    /**
     * @type {Function}
     */
    this.InternalClass = InternalClass;
    /**
     * @type {Function|null}
     */
    this.methodCaller = methodCaller;
    /**
     * @type {Object}
     */
    this.methodData = methodData;
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
    this.rootInternalPrototype = rootInternalPrototype;
    /**
     * @type {Object}
     */
    this.staticProperties = staticProperties;
    /**
     * @type {Class|null}
     */
    this.superClass = superClass;
    /**
     * @type {Trait[]}
     */
    this.traits = traits;
    /**
     * @type {ValueCoercer}
     */
    this.valueCoercer = valueCoercer;
}

_.extend(ClassDefinition.prototype, {
    /**
     * Fetches the factory functions for all constants defined by this class directly
     *
     * @returns {Object<string, Function>}
     */
    getConstants: function () {
        return this.constants;
    },

    /**
     * Fetches the constructor name to use (the same as the class name or __construct),
     * or null if no constructor is defined
     *
     * @returns {string|null}
     */
    getConstructorName: function () {
        return this.constructorName;
    },

    /**
     * Fetches the instance properties for the class.
     *
     * @returns {Object}
     */
    getInstanceProperties: function () {
        return this.instanceProperties;
    },

    /**
     * Fetches the instrumentation (if any) to use for the class.
     *
     * @returns {CallInstrumentation|null}
     */
    getInstrumentation: function () {
        return this.instrumentation;
    },

    /**
     * Fetches the interfaces to be implemented by the class
     *
     * @returns {Class[]}
     */
    getInterfaces: function () {
        return this.interfaces;
    },

    /**
     * Fetches the internal, native JS function-class for the PHP class
     *
     * @returns {Function}
     */
    getInternalClass: function () {
        return this.InternalClass;
    },

    /**
     * Fetches the custom method call handler defined for the class, if any.
     *
     * @returns {Function|null}
     */
    getMethodCaller: function () {
        return this.methodCaller;
    },

    /**
     * Fetches the shared method data
     *
     * @todo Remove this - see note in MethodPromoter.
     *
     * @returns {Object}
     */
    getMethodData: function () {
        return this.methodData;
    },

    /**
     * Fetches the methods for the class
     *
     * @returns {Object<string, {args: Array, isStatic: boolean, line: number, method: Function}>}
     */
    getMethods: function () {
        return this.methods;
    },

    /**
     * Fetches the FQCN of the class
     *
     * @returns {string}
     */
    getName: function () {
        var definition = this;

        return definition.namespace.getPrefix() + definition.name;
    },

    /**
     * Fetches the namespace the class is to be defined in
     *
     * @returns {Namespace}
     */
    getNamespace: function () {
        return this.namespace;
    },

    /**
     * Fetches the namespace scope the class is to be defined in
     *
     * @returns {NamespaceScope}
     */
    getNamespaceScope: function () {
        return this.namespaceScope;
    },

    /**
     * Fetches the root prototype object for the class (which may differ from InternalClass.prototype)
     *
     * @returns {Object}
     */
    getRootInternalPrototype: function () {
        return this.rootInternalPrototype;
    },

    /**
     * Fetches the static properties for the class
     *
     * @returns {Object}
     */
    getStaticProperties: function () {
        return this.staticProperties;
    },

    /**
     * Fetches the parent class for the class to be defined, if any
     *
     * @returns {Class|null}
     */
    getSuperClass: function () {
        return this.superClass;
    },

    /**
     * Fetches the traits to be used by the class.
     *
     * @returns {Trait[]}
     */
    getTraits: function () {
        return this.traits;
    },

    /**
     * Fetches the value coercer for the class (dependent on coercion mode)
     *
     * @returns {ValueCoercer}
     */
    getValueCoercer: function () {
        return this.valueCoercer;
    },

    /**
     * Determines whether this class defines a destructor.
     *
     * @returns {boolean}
     */
    hasDestructor: function () {
        return hasOwn.call(this.methods, MAGIC_DESTRUCT);
    }
});

module.exports = ClassDefinition;
