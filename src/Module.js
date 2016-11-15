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
 * @param {string|null} filePath
 * @constructor
 */
function Module(filePath) {
    /**
     * @type {string|null}
     */
    this.filePath = filePath || null;
}

_.extend(Module.prototype, {
    /**
     * Fetches the path to the file this module is defined in, or null if none
     *
     * @returns {string|null}
     */
    getFilePath: function () {
        return this.filePath;
    }
});

module.exports = Module;
