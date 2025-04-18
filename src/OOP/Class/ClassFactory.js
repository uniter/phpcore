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
    Class = require('../../Class').sync();

/**
 * @param {ValueFactory} valueFactory
 * @param {ValueProvider} valueProvider
 * @param {ReferenceFactory} referenceFactory
 * @param {FunctionFactory} functionFactory
 * @param {CallStack} callStack
 * @param {Flow} flow
 * @param {FutureFactory} futureFactory
 * @param {Userland} userland
 * @param {ExportRepository} exportRepository
 * @param {FFIFactory} ffiFactory
 * @param {DestructibleObjectRepository} destructibleObjectRepository
 * @constructor
 */
function ClassFactory(
    valueFactory,
    valueProvider,
    referenceFactory,
    functionFactory,
    callStack,
    flow,
    futureFactory,
    userland,
    exportRepository,
    ffiFactory,
    destructibleObjectRepository
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {DestructibleObjectRepository}
     */
    this.destructibleObjectRepository = destructibleObjectRepository;
    /**
     * @type {ExportRepository}
     */
    this.exportRepository = exportRepository;
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
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
    /**
     * @type {Userland}
     */
    this.userland = userland;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @type {ValueProvider}
     */
    this.valueProvider = valueProvider;
}

_.extend(ClassFactory.prototype, {
    /**
     * Creates a Class, which is to be exposed to PHP-land.
     *
     * @param {string} name Class name relative to the namespace (i.e. not fully-qualified)
     * @param {Namespace} namespace
     * @param {NamespaceScope} namespaceScope
     * @param {string} constructorName
     * @param {boolean} hasDestructor
     * @param {Function} InternalClass
     * @param {Object} rootInternalPrototype
     * @param {Object} instanceProperties
     * @param {Object} staticProperties
     * @param {Object} constants
     * @param {Class|null} superClass Parent class, if any
     * @param {Class[]} interfaces Interfaces implemented by this class
     * @param {ValueCoercer} valueCoercer
     * @param {Function|null} methodCaller Custom method call handler
     * @param {CallInstrumentation} instrumentation
     * @returns {Class} Returns the internal Class instance created
     */
    createClass: function (
        name,
        namespace,
        namespaceScope,
        constructorName,
        hasDestructor,
        InternalClass,
        rootInternalPrototype,
        instanceProperties,
        staticProperties,
        constants,
        superClass,
        interfaces,
        valueCoercer,
        methodCaller,
        instrumentation
    ) {
        var factory = this;

        return new Class(
            factory.valueFactory,
            factory.valueProvider,
            factory.referenceFactory,
            factory.functionFactory,
            factory.callStack,
            factory.flow,
            factory.futureFactory,
            factory.userland,
            name,
            constructorName,
            hasDestructor,
            InternalClass,
            rootInternalPrototype,
            instanceProperties,
            staticProperties,
            constants,
            superClass,
            interfaces,
            namespaceScope,
            factory.exportRepository,
            valueCoercer,
            factory.ffiFactory,
            methodCaller,
            instrumentation,
            factory.destructibleObjectRepository
        );
    }
});

module.exports = ClassFactory;
