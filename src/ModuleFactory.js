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
 * @constructor
 */
function ModuleFactory(Module) {
    /**
     * @type {class}
     */
    this.Module = Module;
}

_.extend(ModuleFactory.prototype, {
    /**
     * Creates a new Module
     *
     * @param {string|null} filePath Path to the PHP file this module is defined in, or null if none
     * @returns {Module}
     */
    create: function (filePath) {
        return new this.Module(filePath);
    }
});

module.exports = ModuleFactory;
