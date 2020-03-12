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
    FFIResult = require('../../FFI/Result'),
    PHPError = phpCommon.PHPError,
    UNDEFINED_METHOD = 'core.undefined_method';

module.exports = function (internals) {
    var callStack = internals.callStack,
        pausable = internals.pausable,
        /**
         * Checks whether the returned result is an FFI Result and if so,
         * if we are in async mode, it pauses PHP execution until the promise
         * returned from the async fetcher is resolved or rejected
         *
         * @param {*} result
         */
        handleFFIResult = function (result) {
            var pause;

            if (!(result instanceof FFIResult)) {
                // A non-FFI Result was returned: nothing special to do
                return result;
            }

            if (!pausable) {
                // We're in sync mode - use the synchronous fetcher as we are unable
                // to wait for an asynchronous operation to complete
                return result.getSync();
            }

            pause = pausable.createPause();

            // Wait for the returned promise to resolve or reject before continuing
            result.getAsync().then(function (resultValue) {
                pause.resume(resultValue);
            }, function (error) {
                pause.throw(error);
            });

            return pause.now();
        };

    function JSObject() {

    }

    _.extend(JSObject.prototype, {
        /**
         * JSObject needs to implement its own way of calling out to native JS methods,
         * because the method property lookup needs to be case-sensitive, unlike PHP
         *
         * @param {string} name
         * @param {*[]} args
         * @returns {*}
         */
        '__call': function (name, args) {
            var object = this,
                result;

            if (!_.isFunction(object[name])) {
                callStack.raiseTranslatedError(PHPError.E_ERROR, UNDEFINED_METHOD, {
                    className: 'JSObject',
                    methodName: name
                });
            }

            result = object[name].apply(object, args);

            // A promise may be returned from the method, in which case
            // we need to block PHP execution until it is resolved or rejected
            return handleFFIResult(result);
        },

        /**
         * Fetches a property from the native JS object
         *
         * @param {string} propertyName
         * @returns {*}
         */
        '__get': function (propertyName) {
            return this[propertyName];
        },

        /**
         * In JavaScript, objects cannot normally be made callable, only functions
         * (and Proxies with the "apply" trap) -
         * this magic method is implemented to allow imported JS functions to be callable.
         *
         * @returns {*}
         */
        '__invoke': function () {
            var object = this,
                result;

            if (!_.isFunction(object)) {
                throw new Error('Attempted to invoke a non-function JS object');
            }

            result = object.apply(null, arguments);

            // A promise may be returned from the function, in which case
            // we need to block PHP execution until it is resolved or rejected
            return handleFFIResult(result);
        },

        /**
         * Sets a property on the native JS object
         *
         * @param {string} propertyName
         * @param {*} nativeValue
         */
        '__set': function (propertyName, nativeValue) {
            // Ensure we write the native value to properties on native JS objects -
            // as JSObject is auto-coercing we already have it
            this[propertyName] = nativeValue;
        },

        /**
         * Deletes a property from the native JS object when `unset($jsObject->prop)` is called from PHP-land
         *
         * @param {string} propertyName
         */
        '__unset': function (propertyName) {
            delete this[propertyName];
        }
    });

    return JSObject;
};
