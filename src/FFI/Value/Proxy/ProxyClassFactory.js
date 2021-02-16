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
            currentPrototype,
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
         * Iterate up the class hierarchy, proxying methods as we go. Note that
         * in most cases the first class' prototype chain is probably all we need
         * to process, however some classes in the hierarchy may have non-standard
         * native objects (eg. JSObject) and so we need to process each one's
         * prototype chain just in case.
         *
         * TODO: Remove the need for this duplication by handling the special JSObject case
         *       in that class alone.
         */
        while (currentClass) {
            currentPrototype = currentClass.getInternalClass().prototype;

            while (currentPrototype !== null && currentPrototype !== Object.prototype) {
                /*jshint loopfunc: true */
                _.forOwn(currentPrototype, function (property, propertyName) {
                    if (
                        // Only proxy methods
                        typeof property !== 'function' ||
                        // Only proxy each method once
                        methodNamesProxied[propertyName] === true
                    ) {
                        return;
                    }

                    defineProxyMethod(propertyName);

                    methodNamesProxied[propertyName] = true;
                });

                currentPrototype = Object.getPrototypeOf(currentPrototype);
            }

            currentClass = currentClass.getSuperClass();
        }

        return ProxyClass;
    }
});

module.exports = ProxyClassFactory;
