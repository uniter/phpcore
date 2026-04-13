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
 * Creates the ProxyClass for a given PHP class
 *
 * @param {ValueStorage} valueStorage
 * @param {ProxyMemberFactory} proxyMemberFactory
 * @constructor
 */
function ProxyClassFactory(valueStorage, proxyMemberFactory) {
    /**
     * @type {ProxyMemberFactory}
     */
    this.proxyMemberFactory = proxyMemberFactory;
    /**
     * @type {ValueStorage}
     */
    this.valueStorage = valueStorage;
}

_.extend(ProxyClassFactory.prototype, {
    /**
     * Creates the ProxyClass for a given PHP class
     *
     * @param {Class} classObject
     * @returns {class}
     */
    create: function (classObject) {
        var currentClass,
            factory = this,
            methodNamesProxied = {};

        /**
         * @param {ObjectValue} objectValue Internal ObjectValue instance
         * @param {boolean} useSyncApiAlthoughPsync
         * @constructor
         */
        function ProxyClass(objectValue, useSyncApiAlthoughPsync) {
            /*
             * This data is stored in a WeakMap using this instance as the key, for multiple reasons:
             * a) To ensure there are no collisions with methods of the proxied class
             *    (ie. if we stored objectValue as a property of this object, but the proxied class
             *    happened to have a method called "objectValue" there would be an issue)
             * b) To more neatly allow the data to be extracted and funneled into a new instance
             *    in the scenario where we want a proxy with a synchronous API (see ValueHelper)
             */
            factory.valueStorage.setPrivatesForNativeProxy(this, {
                objectValue: objectValue,
                useSyncApiAlthoughPsync: Boolean(useSyncApiAlthoughPsync)
            });
        }
        ProxyClass.prototype = Object.create(classObject.getInternalClass().prototype);

        function defineProxyMethod(methodName) {
            ProxyClass.prototype[methodName] = factory.proxyMemberFactory.createProxyMethod(methodName);
        }

        currentClass = classObject;

        /*
         * Iterate up the class hierarchy, proxying methods as we go.
         */
        while (currentClass) {
            /*jshint loopfunc: true */
            _.forOwn(currentClass.getMethodCallables(), function (callable, methodName) {
                if (methodNamesProxied[methodName] === true) {
                    // Only proxy each method once.
                    return;
                }

                defineProxyMethod(methodName);

                methodNamesProxied[methodName] = true;
            });

            currentClass = currentClass.getSuperClass();
        }

        return ProxyClass;
    }
});

module.exports = ProxyClassFactory;
