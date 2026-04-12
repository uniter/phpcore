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
 @param {Reference[]|Value[]|Variable[]} positionalArgs
 @param {Object.<string, Reference|Value|Variable>|null} namedArgs
 * @constructor
 */
function Call(positionalArgs, namedArgs) {
    /**
     * @type {Reference[]|Value[]|Variable[]}
     */
    this.args = positionalArgs;
    /**
     * @type {Object<string, Reference|Value|Variable>|null}
     */
    this.namedArgs = namedArgs;
}

_.extend(Call.prototype, {
    /**
     * FFI calls are always in weak type-checking mode.
     */
    enableStrictTypes: function () {
        throw new Exception('FFI calls cannot be switched into strict-types mode');
    },

    /**
     * Fetches the current class for the call, if any
     *
     * @returns {Class|null}
     */
    getCurrentClass: function () {
        return null;
    },

    /**
     * Fetches the current trait for the call, if any.
     *
     * @returns {Trait|null}
     */
    getCurrentTrait: function () {
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
     * Fetches the module this call occurred in
     *
     * @returns {Module|null}
     */
    getModule: function () {
        return null;
    },

    /**
     * Fetches the named arguments passed to the called function, or null if none.
     *
     * @returns {Object.<string, Value>|null}
     */
    getNamedArgs: function () {
        return this.namedArgs;
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
     * FFI calls are always in weak type-checking mode.
     *
     * @returns {boolean}
     */
    isStrictTypesMode: function () {
        return false;
    },

    /**
     * Determines whether this call is a userland call (from inside PHP-land) or not
     *
     * @returns {boolean}
     */
    isUserland: function () {
        return false;
    },

    resume: function () {
        // TODO: Confirm this should be empty rather than throw?
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
    },

    /**
     * Throws an error into a paused call's trace, which doesn't apply to FFI calls.
     */
    throwInto: function () {
        // TODO: Confirm this should be empty rather than throw?
    }
});

module.exports = Call;
