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
    Trait = require('../Trait/Trait');

/**
 * @param {ValueFactory} valueFactory
 * @param {ValueProvider} valueProvider
 * @param {ReferenceFactory} referenceFactory
 * @param {FunctionFactory} functionFactory
 * @param {CallStack} callStack
 * @param {Flow} flow
 * @param {FutureFactory} futureFactory
 * @param {Userland} userland
 * @param {FFIFactory} ffiFactory
 * @constructor
 */
function TraitFactory(
    valueFactory,
    valueProvider,
    referenceFactory,
    functionFactory,
    callStack,
    flow,
    futureFactory,
    userland,
    ffiFactory
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
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

_.extend(TraitFactory.prototype, {
    /**
     * Creates a Trait, which is to be exposed to PHP-land.
     *
     * @param {string} name Class name relative to the namespace (i.e. not fully-qualified)
     * @param {Namespace} namespace
     * @param {NamespaceScope} namespaceScope
     * @param {Trait[]} traits
     * @param {Object.<string, Function>} constantToProviderMap
     * @param {Object} instanceProperties
     * @param {Object} staticProperties
     * @param {Object.<string, Function>} methods
     * @param {ValueCoercer} valueCoercer
     * @param {CallInstrumentation} instrumentation
     * @returns {Trait} Returns the internal Trait instance created
     */
    createTrait: function (
        name,
        namespace,
        namespaceScope,
        traits,
        constantToProviderMap,
        instanceProperties,
        staticProperties,
        methods,
        valueCoercer,
        instrumentation
    ) {
        var factory = this;

        return new Trait(
            factory.valueFactory,
            factory.referenceFactory,
            factory.functionFactory,
            factory.callStack,
            factory.flow,
            factory.futureFactory,
            factory.userland,
            name,
            traits,
            constantToProviderMap,
            instanceProperties,
            staticProperties,
            methods,
            namespaceScope,
            valueCoercer,
            factory.ffiFactory,
            instrumentation
        );
    }
});

module.exports = TraitFactory;
