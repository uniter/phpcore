/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

/**
 * Creates proxying versions of PHP class members (methods and properties)
 *
 * @param {ValueFactory} valueFactory
 * @param {ValueStorage} valueStorage
 * @param {NativeCaller} nativeCaller
 * @constructor
 */
function ProxyMemberFactory(
    valueFactory,
    valueStorage,
    nativeCaller
) {
    /**
     * @type {NativeCaller}
     */
    this.nativeCaller = nativeCaller;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @type {ValueStorage}
     */
    this.valueStorage = valueStorage;
}

_.extend(ProxyMemberFactory.prototype, {
    /**
     * Creates a proxying method for the ProxyClass for a method of a PHP class
     *
     * @param {string} methodName
     * @returns {Function}
     */
    createProxyMethod: function (methodName) {
        var factory = this;

        return function __uniterInboundStackMarker__() {
            // Arguments will be from JS-land, so coerce any to internal PHP value objects
            var args = _.map(arguments, function (arg) {
                    return factory.valueFactory.coerce(arg);
                }),
                privates = factory.valueStorage.getPrivatesForNativeProxy(this),
                objectValue = privates.objectValue,
                useSyncApiAlthoughPsync = privates.useSyncApiAlthoughPsync;

            return factory.nativeCaller.callMethod(objectValue, methodName, args, useSyncApiAlthoughPsync);
        };
    }
});

module.exports = ProxyMemberFactory;
