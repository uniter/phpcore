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
     * Provides a proxy for accessing all data/methods of an instance of a PHP-defined class.
     *
     * Objects that implement __call(), __get(), __set() or define a public property
     * anywhere along their class ancestry could benefit from being unwrapped to a PHPObject
     * as this will permit access to those from native JS code, at the expense of a more complex API.
     *
     * @param {ValueFactory} valueFactory
     * @param {NativeCaller} nativeCaller
     * @param {ObjectValue} objectValue
     * @constructor
     */
    function PHPObject(
        valueFactory,
        nativeCaller,
        objectValue
    ) {
        /**
         * @type {NativeCaller}
         */
        this.nativeCaller = nativeCaller;
        /**
         * @type {ObjectValue}
         */
        this.objectValue = objectValue;
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
         * @param {string} methodName
         * @returns {Promise<*>|*}
         */
        callMethod: function (methodName) {
            var phpObject = this,
                // Arguments will be from JS-land, so coerce any to internal PHP value objects
                args = _.map([].slice.call(arguments, 1), function (arg) {
                    return phpObject.valueFactory.coerce(arg);
                });

            return phpObject.nativeCaller.callMethod(phpObject.objectValue, methodName, args);
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
