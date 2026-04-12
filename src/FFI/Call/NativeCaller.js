/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash')
], function (
    _
) {
    /**
     * @param {Caller} caller
     * @param {string} mode
     * @constructor
     */
    function NativeCaller(caller, mode) {
        /**
         * @type {Caller}
         */
        this.caller = caller;
        /**
         * @type {string}
         */
        this.mode = mode;
    }

    _.extend(NativeCaller.prototype, {
        /**
         * Encapsulates calling a PHP-land method from JS-land using the FFI API,
         * unwrapping the result to a native value.
         *
         * @param {ObjectValue} objectValue
         * @param {string} methodName
         * @param {Reference[]|Value[]|Variable[]} positionalArgs
         * @param {Object.<string, Reference|Value|Variable>|null|boolean} namedArgs
         *        If a boolean is passed here it will be treated as useSyncApiAlthoughPsync.
         * @param {boolean=} useSyncApiAlthoughPsync
         * @returns {Promise<*>|*}
         */
        callMethod: function (objectValue, methodName, positionalArgs, namedArgs, useSyncApiAlthoughPsync) {
            var nativeCaller = this,
                result;

            // Support calling with signature (objectValue, methodName, positionalArgs, useSyncApiAlthoughPsync)
            if (typeof namedArgs === 'boolean') {
                useSyncApiAlthoughPsync = namedArgs;
                namedArgs = null;
            }

            // Push an FFI call onto the stack, representing the call from JavaScript-land.
            nativeCaller.caller.pushFFICall(positionalArgs, namedArgs);

            if (nativeCaller.mode === 'async') {
                return nativeCaller.caller.callMethodAsync(objectValue, methodName, positionalArgs, namedArgs)
                    .then(function (resultValue) {
                        return resultValue.getNative();
                    });
            }

            // Otherwise we're in sync or psync mode.
            result = nativeCaller.caller.callMethodSyncLike(objectValue, methodName, positionalArgs, namedArgs, useSyncApiAlthoughPsync);

            return nativeCaller.mode === 'psync' && !useSyncApiAlthoughPsync ?
                result.then(function (resultValue) {
                    return resultValue.getNative();
                }) :
                result.getNative();
        }
    });

    return NativeCaller;
}, {strict: true});
