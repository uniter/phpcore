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
    WeakMap = require('es6-weak-map'),
    UNDEFINED_METHOD = 'core.undefined_method';

module.exports = function (internals) {
    var callStack = internals.callStack,
        flow = internals.flow,
        globalNamespace = internals.globalNamespace,
        valueFactory = internals.valueFactory,
        nativeArrayToObjectValueMap = new WeakMap(),
        coerce = function (value) {
            var arrayObjectValue;

            if (!_.isArray(value)) {
                return value;
            }

            // Native JS arrays must be boxed as JSArray instances in order to preserve JS semantics
            // (arrays passed by reference rather than copied on assignment).
            if (nativeArrayToObjectValueMap.has(value)) {
                arrayObjectValue = nativeArrayToObjectValueMap.get(value);
            } else {
                arrayObjectValue = valueFactory.createObject(
                    value,
                    globalNamespace.getClass('JSArray').yieldSync()
                );
                nativeArrayToObjectValueMap.set(value, arrayObjectValue);
            }

            return arrayObjectValue;
        };

    function JSObject() {

    }

    _.extend(JSObject.prototype, {
        /**
         * JSObject needs to implement its own way of calling out to native JS methods,
         * because the method property lookup needs to be case-sensitive, unlike PHP
         *
         * @param {Value} methodNameValue
         * @param {Value} argumentArrayValue An ArrayValue provided with method arguments
         * @returns {*}
         */
        '__call': function __uniterOutboundStackMarker__(methodNameValue, argumentArrayValue) {
            var nativeArguments,
                nativeObject = this.getObject(),
                methodName = methodNameValue.getNative(),
                result;

            if (!_.isFunction(nativeObject[methodName])) {
                callStack.raiseTranslatedError(PHPError.E_ERROR, UNDEFINED_METHOD, {
                    className: 'JSObject',
                    methodName: methodName
                });
            }

            // Coerce the ArrayValue of arguments to a native array to pass to .apply(...)
            nativeArguments = argumentArrayValue.getNative();

            result = nativeObject[methodName].apply(nativeObject, nativeArguments);

            return coerce(result);
        },

        /**
         * Fetches a property from the native JS object
         *
         * @param {Value} propertyNameValue
         * @returns {*}
         */
        '__get': function (propertyNameValue) {
            var nativeObject = this.getObject(),
                propertyName = propertyNameValue.getNative();

            return coerce(nativeObject[propertyName]);
        },

        /**
         * In JavaScript, objects cannot normally be made callable, only functions
         * (and Proxies with the "apply" trap) -
         * this magic method is implemented to allow imported JS functions to be callable.
         *
         * @returns {*}
         */
        '__invoke': function () {
            var nativeObject = this.getObject();

            if (!_.isFunction(nativeObject)) {
                throw new Error('Attempted to invoke a non-function JS object');
            }

            return flow.mapAsync(arguments, function (argument) {
                return argument.getValue()
                    .asFuture() // Don't re-box the native value extracted just below.
                    .next(function (value) {
                        return value.getNative();
                    });
            }).next(function (nativeArguments) {
                var result = nativeObject.apply(null, nativeArguments);

                return coerce(result);
            });
        },

        /**
         * Sets a property on the native JS object
         *
         * @param {Value} propertyNameValue
         * @param {Value} propertyValue
         */
        '__set': function (propertyNameValue, propertyValue) {
            var nativeObject = this.getObject(),
                propertyName = propertyNameValue.getNative();

            // Ensure we write the native value to properties on native JS objects
            nativeObject[propertyName] = propertyValue.getNative();
        },

        /**
         * Deletes a property from the native JS object when `unset($jsObject->prop)` is called from PHP-land
         *
         * @param {Value} propertyNameValue
         */
        '__unset': function (propertyNameValue) {
            var nativeObject = this.getObject(),
                propertyName = propertyNameValue.getNative();

            delete nativeObject[propertyName];
        }
    });

    internals.defineUnwrapper(function (objectValue) {
        /*
         * JSObjects are objects that originate from JS-land and were subsequently passed into PHP-land -
         * when we want to unwrap them to pass back to JS-land, simply return the original native object
         */
        return objectValue.getObject();
    });

    internals.disableAutoCoercion();

    return JSObject;
};
