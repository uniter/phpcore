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
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception;

/**
 * @param {string|null} filePath
 * @constructor
 */
function Module(filePath) {
    /**
     * @type {string|null}
     */
    this.filePath = filePath || null;
    /**
     * @type {ModuleScope|null}
     */
    this.scope = null;
}

_.extend(Module.prototype, {
    /**
     * Fetches the path to the file this module is defined in, or null if none
     *
     * @returns {string|null}
     */
    getFilePath: function () {
        return this.filePath;
    },

    /**
     * Fetches the ModuleScope
     *
     * @returns {ModuleScope}
     */
    getScope: function () {
        var module = this;

        if (!module.scope) {
            throw new Exception('Module has no ModuleScope set');
        }

        return module.scope;
    },

    /**
     * Sets the ModuleScope
     *
     * @param {ModuleScope} moduleScope
     */
    setScope: function (moduleScope) {
        this.scope = moduleScope;
    }
});

module.exports = Module;
