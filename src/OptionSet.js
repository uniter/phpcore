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
 * Represents a set of options for a running PHP application
 *
 * @param {object} options
 * @constructor
 */
function OptionSet(options) {
    /**
     * @type {Object}
     */
    this.options = options;
}

_.extend(OptionSet.prototype, {
    /**
     * Fetches the value of a single option by its name
     *
     * @param {string} name
     * @returns {*}
     */
    getOption: function (name) {
        var optionSet = this;

        return hasOwn.call(optionSet.options, name) ? optionSet.options[name] : null;
    },

    /**
     * Fetches all defined options
     *
     * @returns {Object}
     */
    getOptions: function () {
        return this.options;
    }
});

module.exports = OptionSet;
