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
    require('./Value/Object'),
    require('lie')
], function (
    _,
    ObjectValue,
    Promise
) {
    /**
     * Provides a proxy for accessing all data/methods of an instance of a PHP-defined class.
     *
     * Objects that implement __call(), __get(), __set() or define a public property
     * anywhere along their class ancestry could benefit from being unwrapped to a PHPObject
     * as this will permit access to those from native JS code, at the expense of a more complex API.
     *
     * @param {CallFactory} callFactory
     * @param {CallStack} callStack
     * @param {ErrorPromoter} errorPromoter
     * @param {Resumable|null} pausable
     * @param {string} mode
     * @param {ValueFactory} valueFactory
     * @param {ObjectValue} objectValue
     * @constructor
     */
    function PHPObject(
        callFactory,
        callStack,
        errorPromoter,
        pausable,
        mode,
        valueFactory,
        objectValue
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
         * @type {string}
         */
        this.mode = mode;
        /**
         * @type {ObjectValue}
         */
        this.objectValue = objectValue;
        /**
         * @type {Resumable|null}
         */
        this.pausable = pausable;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(PHPObject.prototype, {
        /**
         * Calls the specified method of the wrapped ObjectValue, returning a Promise.
         * Allows JS-land code to call objects exported/returned from PHP-land,
         * where asynchronous (blocking) operation is possible.
         *
         * @param {string} name
         * @returns {Promise|Value}
         */
        callMethod: function (name) {
            var phpObject = this,
                args = [].slice.call(arguments, 1);

            // Arguments will be from JS-land, so coerce any to wrapped PHP value objects
            args = _.map(args, function (arg) {
                return phpObject.valueFactory.coerce(arg);
            });

            // Push an FFI call onto the stack, representing the call from JavaScript-land
            phpObject.callStack.push(phpObject.callFactory.createFFICall([].slice.call(arguments)));

            function popFFICall() {
                phpObject.callStack.pop();
            }

            if (phpObject.mode === 'async') {
                return new Promise(function (resolve, reject) {
                    // Call the method via Pausable to allow for blocking operation
                    phpObject.pausable.call(
                        phpObject.objectValue.callMethod,
                        [name, args],
                        phpObject.objectValue
                    )
                        // Pop the call off the stack _before_ returning, to mirror sync mode's behaviour
                        .finally(popFFICall)
                        .then(
                            function (resultValue) {
                                resolve(resultValue.getNative());
                            },
                            function (error) {
                                if (error instanceof ObjectValue) {
                                    // Method threw a PHP Exception, so throw a native JS error for it
                                    reject(phpObject.errorPromoter.promote(error));
                                    return;
                                }

                                // Normal error: just pass it up to the caller
                                reject(error);
                            }
                        );
                });
            }

            function invoke() {
                try {
                    return phpObject.objectValue.callMethod(name, args).getNative();
                } catch (error) {
                    if (error instanceof ObjectValue) {
                        // Method threw a PHP Exception, so throw a native JS error for it
                        throw phpObject.errorPromoter.promote(error);
                    }

                    throw error;
                } finally {
                    popFFICall();
                }
            }

            if (phpObject.mode === 'psync') {
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

            // Otherwise we're in sync mode
            return invoke();
        },

        /**
         * Fetches the unwrapped ObjectValue that this PHPObject was created from
         *
         * @returns {ObjectValue}
         */
        getObjectValue: function () {
            return this.objectValue;
        }
    });

    return PHPObject;
}, {strict: true});
