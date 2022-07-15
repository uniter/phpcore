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
    Exception = phpCommon.Exception,
    PHPError = phpCommon.PHPError,
    WeakMap = require('es6-weak-map'),
    UNDEFINED_METHOD = 'core.undefined_method';

module.exports = function (internals) {
    var callStack = internals.callStack,
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
        },
        throwMethodCallerExpected = function (methodName) {
            return function () {
                throw new Exception('JSObject->' + methodName + '(...) :: Should be handled by custom method caller');
            };
        };

    function JSObject() {

    }

    _.extend(JSObject.prototype, {
        '__call': throwMethodCallerExpected('__call'),

        '__get': throwMethodCallerExpected('__get'),

        '__invoke': throwMethodCallerExpected('__invoke'),

        '__set': throwMethodCallerExpected('__set'),

        '__unset': throwMethodCallerExpected('__unset')
    });

    internals.defineUnwrapper(function (objectValue) {
        /*
         * JSObjects are objects that originate from JS-land and were subsequently passed into PHP-land -
         * when we want to unwrap them to pass back to JS-land, simply return the original native object.
         */
        return objectValue.getObject();
    });

    /**
     * JSObject needs to implement its own way of calling out to native JS methods,
     * because the method property lookup needs to be case-sensitive, unlike PHP.
     */
    internals.defineMethodCaller(function __uniterOutboundStackMarker__(methodName, argValues) {
        // Coerce the argument Values to natives to pass to .apply(...).
        var unwrapArguments = function () {
                return argValues.map(function (argValue) {
                    return argValue.getNative();
                });
            },
            objectValue = this,
            nativeObject = objectValue.getObject();

        switch (methodName) {
            case '__call':
                // Calls a method of the native JS object.
                return coerce(objectValue.callMethod(methodName, argValues));
            case '__get':
                // Fetches a property from the native JS object.
                return coerce(nativeObject[argValues[0].getNative()]);
            case '__invoke':
                /**
                 * In JavaScript, objects cannot normally be made callable, only functions
                 * (and Proxies with the "apply" trap) -
                 * this magic method is implemented to allow imported JS functions to be callable.
                 */
                if (!_.isFunction(nativeObject)) {
                    throw new Error('Attempted to invoke a non-function JS object');
                }

                return coerce(nativeObject.apply(null, unwrapArguments()));
            case '__set':
                // Sets a property on the native JS object.
                nativeObject[argValues[0].getNative()] = argValues[1].getNative();
                break;
            case '__unset':
                // Deletes a property from the native JS object
                // when `unset($jsObject->prop)` is called from PHP-land.
                delete nativeObject[argValues[0].getNative()];
                break;
            default:
                if (!_.isFunction(nativeObject[methodName])) {
                    callStack.raiseTranslatedError(PHPError.E_ERROR, UNDEFINED_METHOD, {
                        className: 'JSObject',
                        methodName: methodName
                    });
                }

                return nativeObject[methodName].apply(nativeObject, unwrapArguments());
        }
    });

    internals.disableAutoCoercion();

    return JSObject;
};
