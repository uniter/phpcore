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
     * @param {Resumable} pausable
     * @param {ValueFactory} valueFactory
     * @param {ObjectValue} objectValue
     * @constructor
     */
    function PHPObject(pausable, valueFactory, objectValue) {
        /**
         * @type {ObjectValue}
         */
        this.objectValue = objectValue;
        /**
         * @type {Resumable}
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
         * @returns {Promise}
         */
        callMethod: function (name) {
            var phpObject = this,
                args = [].slice.call(arguments, 1);

            // Arguments will be from JS-land, so coerce any to wrapped PHP value objects
            args = _.map(args, function (arg) {
                return phpObject.valueFactory.coerce(arg);
            });

            if (phpObject.pausable) {
                return new Promise(function (resolve, reject) {
                    // Call the method via Pausable to allow for blocking operation
                    phpObject.pausable.call(
                        phpObject.objectValue.callMethod,
                        [name, args],
                        phpObject.objectValue
                    )
                        .then(
                            function (resultValue) {
                                resolve(resultValue.getNative());
                            },
                            function (error) {
                                if (error instanceof ObjectValue) {
                                    // Method threw a PHP Exception, so throw a native JS error for it
                                    reject(error.coerceToNativeError());
                                    return;
                                }

                                // Normal error: just pass it up to the caller
                                reject(error);
                            }
                        );
                });
            }

            // Pausable is unavailable (non-blocking mode)
            try {
                return phpObject.objectValue.callMethod(name, args).getNative();
            } catch (error) {
                if (error instanceof ObjectValue) {
                    // Method threw a PHP Exception, so throw a native JS error for it
                    throw error.coerceToNativeError();
                }

                throw error;
            }
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
