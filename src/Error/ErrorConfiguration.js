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
 * Handles the configuration for error handling in PHP-land
 *
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
     * Determines whether errors should be displayed
     *
     * @returns {boolean}
     */
    getDisplayErrors: function () {
        var iniOption = this.iniState.get('display_errors');

        return String(iniOption).toLowerCase() !== 'off' && !!iniOption;
    },

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
