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
    require('microdash'),
    require('phpcommon'),
    require('../Call'),
    require('lie'),
    require('../../Value')
], function (
    _,
    phpCommon,
    FFICall,
    Promise,
    Value
) {
    var Exception = phpCommon.Exception;

    /**
     * Encapsulates calling a PHP-land method from JS-land using the FFI API
     *
     * @param {CallFactory} callFactory
     * @param {CallStack} callStack
     * @param {ErrorPromoter} errorPromoter
     * @param {Flow} flow
     * @param {string} mode
     * @constructor
     */
    function Caller(
        callFactory,
        callStack,
        errorPromoter,
        flow,
        mode
    ) {
        /**
         * @type {CallFactory}
         */
        this.callFactory = callFactory;
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {ErrorPromoter}
         */
        this.errorPromoter = errorPromoter;
        /**
         * @type {Flow}
         */
        this.flow = flow;
        /**
         * @type {string}
         */
        this.mode = mode;
    }

    _.extend(Caller.prototype, {
        /**
         * Calls a method in asynchronous mode
         *
         * @param {ObjectValue} objectValue
         * @param {string} methodName
         * @param {Value[]} args
         * @returns {Promise<Value>}
         */
        callMethodAsync: function (objectValue, methodName, args) {
            var caller = this;

            if (caller.mode !== 'async') {
                throw new Exception('Caller.callMethodAsync() :: Must be in async mode');
            }

            // Call the method via Flow to allow for blocking operation
            return caller.flow
                .callAsync(objectValue.callMethod.bind(objectValue), [methodName, args])
                // Pop the call off the stack _before_ returning, to mirror sync mode's behaviour
                .finally(caller.popFFICall.bind(caller))
                .catch(function (error) {
                    if (error instanceof Value && error.getType() === 'object') {
                        // Method threw a PHP Exception, so throw a native JS error for it
                        throw caller.errorPromoter.promote(error);
                    }

                    // Normal error: just pass it up to the caller
                    throw error;
                });
        },

        /**
         * Calls a method in either Promise-synchronous (psync) or synchronous (sync) mode.
         * If in psync mode, useSyncApiAlthoughPsync may be passed as true, in which case
         * the API will be presented in a synchronous fashion without Promises.
         *
         * @param {ObjectValue} objectValue
         * @param {string} methodName
         * @param {Value[]} args
         * @param {boolean=} useSyncApiAlthoughPsync
         * @returns {Promise<Value>|Value}
         */
        callMethodSyncLike: function (objectValue, methodName, args, useSyncApiAlthoughPsync) {
            var caller = this;

            if (caller.mode === 'async') {
                throw new Exception('callMethodSyncLike() :: Cannot call in async mode');
            }

            function invoke() {
                try {
                    return objectValue.callMethod(methodName, args).yieldSync();
                } catch (error) {
                    if (error instanceof Value && error.getType() === 'object') {
                        // Method threw a PHP Exception, so throw a native JS error for it
                        throw caller.errorPromoter.promote(error);
                    }

                    throw error;
                } finally {
                    caller.popFFICall();
                }
            }

            if (caller.mode === 'psync' && !useSyncApiAlthoughPsync) {
                // For Promise-synchronous mode, we need to return a promise
                // even though the actual invocation must return synchronously
                return new Promise(function (resolve, reject) {
                    try {
                        resolve(invoke());
                    } catch (error) {
                        reject(error);
                    }
                });
            }

            // Otherwise we're in sync mode (or psync mode with sync API explicitly requested)
            return invoke();
        },

        /**
         * Pushes an FFI call onto the call stack
         *
         * @param {Value[]} args
         */
        pushFFICall: function (args) {
            var caller = this;

            // Push an FFI call onto the stack, representing the call from JavaScript-land
            caller.callStack.push(caller.callFactory.createFFICall(args));
        },

        /**
         * Pops the FFI call off of the call stack
         */
        popFFICall: function () {
            var caller = this;

            if (!(caller.callStack.getCurrent() instanceof FFICall)) {
                throw new Exception('Caller.popFFICall() :: Current call is not an FFI call');
            }

            caller.callStack.pop();
        }
    });

    return Caller;
}, {strict: true});
