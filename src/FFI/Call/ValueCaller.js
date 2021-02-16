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
    function ValueCaller(caller, mode) {
        /**
         * @type {Caller}
         */
        this.caller = caller;
        /**
         * @type {string}
         */
        this.mode = mode;
    }

    _.extend(ValueCaller.prototype, {
        /**
         * Encapsulates calling a PHP-land method from JS-land using the FFI API,
         * returning the result as a Value object
         *
         * @param {ObjectValue} objectValue
         * @param {string} methodName
         * @param {Value[]} args
         * @param {boolean=} useSyncApiAlthoughPsync
         * @returns {Promise<Value>|Value}
         */
        callMethod: function (objectValue, methodName, args, useSyncApiAlthoughPsync) {
            var valueCaller = this;

            // Push an FFI call onto the stack, representing the call from JavaScript-land
            valueCaller.caller.pushFFICall(args);

            if (valueCaller.mode === 'async') {
                // Unlike NativeCaller, do not coerce to native here
                return valueCaller.caller.callMethodAsync(objectValue, methodName, args);
            }

            // Otherwise we're in sync or psync mode
            return valueCaller.caller.callMethodSyncLike(objectValue, methodName, args, useSyncApiAlthoughPsync);
        }
    });

    return ValueCaller;
}, {strict: true});
