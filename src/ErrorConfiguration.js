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
 * @param {INIState} iniState
 * @constructor
 */
function ErrorConfiguration(iniState) {
    /**
     * @type {INIState}
     */
    this.iniState = iniState;
}

_.extend(ErrorConfiguration.prototype, {
    /**
     * Fetches a bitmask of which error levels to report
     * (set by the error_reporting(...) builtin function and "error_reporting" INI option)
     *
     * @returns {number}
     */
    getErrorReportingLevel: function () {
        return parseInt(this.iniState.get('error_reporting'), 10);
    },

    /**
     * Sets the error reporting level (may be a non-integer even though only integer is valid)
     *
     * @param {number|*} level
     */
    setErrorReportingLevel: function (level) {
        this.iniState.set('error_reporting', level);
    }
});

module.exports = ErrorConfiguration;
