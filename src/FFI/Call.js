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
 * @param {Value[]} args
 * @constructor
 */
function Call(args) {
    /**
     * @type {Reference[]|Value[]|Variable[]}
     */
    this.args = args;
}

_.extend(Call.prototype, {
    /**
     * Fetches the current class for the call, if any
     *
     * @returns {Class|null}
     */
    getCurrentClass: function () {
        return null;
    },

    /**
     * Fetches the path to the file this call was made from
     *
     * @returns {string|null}
     */
    getFilePath: function () {
        return '(JavaScript code)';
    },

    /**
     * Fetches the Value objects passed as arguments to the called function
     *
     * @returns {Value[]}
     */
    getFunctionArgs: function () {
        return this.args;
    },

    /**
     * Fetches the name of the current function
     *
     * @returns {string}
     */
    getFunctionName: function () {
        return '(JavaScript function)';
    },

    /**
     * Fetches the number of the last line executed inside this call's scope
     *
     * @returns {number|null}
     */
    getLastLine: function () {
        return null;
    },

    /**
     * Fetches the scope inside the called function
     *
     * @returns {Scope}
     */
    getScope: function () {
        return null;
    },

    /**
     * Fetches the static class introduced by this call's scope. If null,
     * the call was a forwarding call, and so the parent call's static class should be used
     *
     * @returns {Class|null}
     */
    getStaticClass: function () {
        return null;
    },

    /**
     * Fetches the ObjectValue that is the current `$this` object, if any
     *
     * @returns {ObjectValue|null}
     */
    getThisObject: function () {
        return null;
    },

    /**
     * Fetches the path to the file this call was made from, suitable for stack traces (so without any eval context)
     *
     * @returns {string|null}
     */
    getTraceFilePath: function () {
        return '(JavaScript code)';
    },

    /**
     * Registers a finder for looking up the current/last line number inside the called function
     */
    instrument: function () {
        throw new Error('Unable to instrument an FFI Call');
    },

    /**
     * Determines whether this call is a userland call (from inside PHP-land) or not
     *
     * @returns {boolean}
     */
    isUserland: function () {
        return false;
    },

    /**
     * Determines whether all errors should be suppressed for this call
     *
     * @returns {boolean}
     */
    suppressesErrors: function () {
        return false;
    },

    /**
     * Determines whether own errors should be suppressed for this call
     *
     * @returns {boolean}
     */
    suppressesOwnErrors: function () {
        return false;
    }
});

module.exports = Call;
