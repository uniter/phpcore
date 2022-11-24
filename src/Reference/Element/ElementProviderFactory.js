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
    ElementHookCollection = require('./ElementHookCollection'),
    ElementProvider = require('./ElementProvider'),
    HookableElementProvider = require('./HookableElementProvider');

/**
 * Creates element providers and objects related to them.
 *
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @constructor
 */
function ElementProviderFactory(referenceFactory, futureFactory, flow) {
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
}

_.extend(ElementProviderFactory.prototype, {
    /**
     * Creates a new ElementHookCollection to be passed to a HookableElementProvider
     *
     * @returns {ElementHookCollection}
     */
    createElementHookCollection: function () {
        return new ElementHookCollection();
    },

    /**
     * Creates a new HookableElementProvider.
     *
     * @param {ElementProvider} baseElementProvider
     * @param {ElementHookCollection} elementHookCollection
     * @returns {HookableElementProvider}
     */
    createHookableProvider: function (baseElementProvider, elementHookCollection) {
        var factory = this;

        return new HookableElementProvider(
            factory.referenceFactory,
            factory.futureFactory,
            factory.flow,
            baseElementProvider,
            elementHookCollection
        );
    },

    /**
     * Creates a new ElementProvider
     *
     * @returns {ElementProvider}
     */
    createProvider: function () {
        var factory = this;

        return new ElementProvider(factory.referenceFactory);
    }
});

module.exports = ElementProviderFactory;
