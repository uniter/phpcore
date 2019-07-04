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
 * Creates element providers and objects related to them
 *
 * @constructor
 */
function ElementProviderFactory() {

}

_.extend(ElementProviderFactory.prototype, {
    /**
     * Creates a new ElementHookCollection to be passed to a HookableElementProvider
     *
     * @return {ElementHookCollection}
     */
    createElementHookCollection: function () {
        return new ElementHookCollection();
    },

    /**
     * Creates a new HookableElementProvider
     *
     * @param {ElementProvider} baseElementProvider
     * @param {ElementHookCollection} elementHookCollection
     * @return {HookableElementProvider}
     */
    createHookableProvider: function (baseElementProvider, elementHookCollection) {
        return new HookableElementProvider(baseElementProvider, elementHookCollection);
    },

    /**
     * Creates a new ElementProvider
     *
     * @return {ElementProvider}
     */
    createProvider: function () {
        return new ElementProvider();
    }
});

module.exports = ElementProviderFactory;
