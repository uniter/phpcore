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
 * @param {ScopeFactory} scopeFactory
 * @param {Namespace} namespace
 * @param {string|null} filePath
 * @param {boolean=} global
 * @constructor
 */
function Module(scopeFactory, namespace, filePath, global) {
    /**
     * @type {string|null}
     */
    this.filePath = filePath || null;
    /**
     * @type {boolean}
     */
    this.strictTypesMode = false;
    /**
     * @type {NamespaceScope}
     */
    this.topLevelNamespaceScope = scopeFactory.createNamespaceScope(namespace, this, global);
}

_.extend(Module.prototype, {
    /**
     * Enables strict-types mode for this module.
     */
    enableStrictTypes: function () {
        this.strictTypesMode = true;
    },

    /**
     * Fetches the path to the file this module is defined in, or null if none.
     *
     * @returns {string|null}
     */
    getFilePath: function () {
        return this.filePath;
    },

    /**
     * Fetches the top-level NamespaceScope for this module, with the global namespace.
     *
     * @returns {NamespaceScope}
     */
    getTopLevelNamespaceScope: function () {
        return this.topLevelNamespaceScope;
    },

    /**
     * Determines whether this module is in strict-types mode.
     *
     * @returns {boolean}
     */
    isStrictTypesMode: function () {
        return this.strictTypesMode;
    }
});

module.exports = Module;
