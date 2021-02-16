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
    PHPError = phpCommon.PHPError,
    UNDEFINED_METHOD = 'core.undefined_method';

module.exports = function (internals) {
    var callStack = internals.callStack;

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
        '__call': function __uniterOutboundStackMarker__(name, args) {
            var object = this,
                result;

            if (!_.isFunction(object[name])) {
                callStack.raiseTranslatedError(PHPError.E_ERROR, UNDEFINED_METHOD, {
                    className: 'JSObject',
                    methodName: name
                });
            }

            result = object[name].apply(object, args);

            return result;
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

            return result;
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

    internals.defineUnwrapper(function (nativeObject) {
        /*
         * JSObjects are objects that originate from JS-land and were subsequently passed into PHP-land -
         * when we want to unwrap them to pass back to JS-land, simply return the original native object
         */
        return nativeObject;
    });

    return JSObject;
};
