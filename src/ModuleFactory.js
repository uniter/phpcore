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
 * @param {class} Module
 * @param {ScopeFactory} scopeFactory
 * @constructor
 */
function ModuleFactory(Module, scopeFactory) {
    /**
     * @type {class}
     */
    this.Module = Module;
    /**
     * @type {ScopeFactory}
     */
    this.scopeFactory = scopeFactory;
}

_.extend(ModuleFactory.prototype, {
    /**
     * Creates a new Module.
     *
     * @param {Namespace} namespace
     * @param {string|null} filePath Path to the PHP file this module is defined in, or null if none
     * @returns {Module}
     */
    create: function (namespace, filePath) {
        var factory = this;

        return new factory.Module(factory.scopeFactory, namespace, filePath);
    },

    /**
     * Creates the global Module.
     *
     * @param {Namespace} namespace
     * @returns {Module}
     */
    createGlobal: function (namespace) {
        var factory = this;

        return new factory.Module(factory.scopeFactory, namespace, null, true);
    }
});

module.exports = ModuleFactory;
