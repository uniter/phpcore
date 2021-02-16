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
    WeakMap = require('es6-weak-map');

/**
 * @param {ProxyFactory} proxyFactory
 * @param {FFIFactory} ffiFactory
 * @param {ValueStorage} valueStorage
 * @param {string} mode
 * @constructor
 */
function ValueHelper(proxyFactory, ffiFactory, valueStorage, mode) {
    /**
     * @type {FFIFactory}
     */
    this.ffiFactory = ffiFactory;
    /**
     * @type {string}
     */
    this.mode = mode;
    /**
     * @type {ProxyFactory}
     */
    this.proxyFactory = proxyFactory;
    /**
     * Used for mapping native objects that have previously been re-proxied
     * with a synchronous API to the re-proxied object
     *
     * @type {WeakMap}
     */
    this.proxyToSyncApiProxy = new WeakMap();
    /**
     * @type {ValueStorage}
     */
    this.valueStorage = valueStorage;
}

_.extend(ValueHelper.prototype, {
    /**
     * Takes the given proxy and returns a new one with a synchronous API,
     * even in Promise-synchronous mode. Note that an error will be thrown
     * if in async mode as synchronous operation is then impossible.
     *
     * @param {ProxyClass} proxy
     * @return {ProxyClass}
     */
    toNativeWithSyncApi: function (proxy) {
        var helper = this,
            objectValue,
            privates,
            reproxy;

        if (helper.mode === 'sync') {
            // In sync mode, the original proxy will use a synchronous API,
            // so there is nothing to do, just return it unchanged
            return proxy;
        }

        if (helper.mode === 'async') {
            // Sanity check
            throw new Error(
                'ValueHelper.toNativeWithSyncApi() :: Unable to provide a synchronous API in async mode'
            );
        }

        if (helper.proxyToSyncApiProxy.has(proxy)) {
            // We already have a re-proxied object with a sync API, so reuse it
            // both for speed and identity
            return helper.proxyToSyncApiProxy.get(proxy);
        }

        if (!helper.valueStorage.hasPrivatesForNativeProxy(proxy)) {
            throw new Error('ValueHelper.toNativeWithSyncApi() :: Invalid proxy instance given');
        }

        privates = helper.valueStorage.getPrivatesForNativeProxy(proxy);
        objectValue = privates.objectValue;

        reproxy = helper.proxyFactory.create(objectValue, true);

        // Store this conversion so we can reuse the reproxied object as mentioned above
        helper.proxyToSyncApiProxy.set(proxy, reproxy);
        // Also map the reproxied object to itself
        helper.proxyToSyncApiProxy.set(reproxy, reproxy);

        // Ensure the reproxied object may also be mapped back to the original object value
        // (eg. in the scenario where an object is exported to JS-land, reproxied for a sync API
        // and then the reproxied object is passed back into PHP-land)
        helper.valueStorage.setObjectValueForExport(reproxy, objectValue);

        return reproxy;
    },

    /**
     * Takes the given ObjectValue and returns a special AsyncObjectValue that wraps it,
     * providing the same API but with Promises returned when relevant methods are called,
     * to avoid the caller having to be Pausable-aware
     *
     * @param {ObjectValue} objectValue
     * @returns {AsyncObjectValue}
     */
    toValueWithAsyncApi: function (objectValue) {
        var helper = this;

        return helper.ffiFactory.createAsyncObjectValue(objectValue);
    }
});

module.exports = ValueHelper;
