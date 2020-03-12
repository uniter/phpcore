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
    hasOwn = {}.hasOwnProperty;

/**
 * Contains all INI options at runtime
 *
 * @constructor
 */
function INIState() {
    /**
     * @type {Object.<string, *>}
     */
    this.settings = {
        'include_path': '.'
    };
}

_.extend(INIState.prototype, {
    /**
     * Fetches an INI option, returning null if it is not defined
     *
     * @param {string} name
     * @returns {*}
     */
    get: function (name) {
        return hasOwn.call(this.settings, name) ?
            this.settings[name] :
            null;
    },

    /**
     * Sets the value of an INI option
     *
     * @param {string} name
     * @param {*} value
     */
    set: function (name, value) {
        this.settings[name] = value;
    }
});

module.exports = INIState;
