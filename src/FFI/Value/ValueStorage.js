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
 * @constructor
 */
function ValueStorage() {
    /**
     * @type {WeakMap<Object|*, ObjectValue>}
     */
    this.exportToObjectValueMap = new WeakMap();
    /**
     * @type {WeakMap<ObjectValue, Object|*>}
     */
    this.objectValueToExportMap = new WeakMap();
    /**
     * @type {WeakMap<object, {objectValue: ObjectValue, useSyncApiAlthoughPsync: boolean}>}
     */
    this.proxyPrivatesMap = new WeakMap();
}

_.extend(ValueStorage.prototype, {
    /**
     * Fetches the cached export for the given object value
     * (cached both for identity and to save on memory usage)
     *
     * @param {ObjectValue} objectValue
     * @returns {Object|*}
     */
    getExportForObjectValue: function (objectValue) {
        return this.objectValueToExportMap.get(objectValue);
    },

    /**
     * Fetches the original ObjectValue that was exported
     *
     * @param {Object|*} exportedValue
     * @returns {ObjectValue}
     */
    getObjectValueForExport: function (exportedValue) {
        return this.exportToObjectValueMap.get(exportedValue);
    },

    /**
     * Fetches the private data for the given native proxy
     *
     * @param {ProxyClass} proxy
     * @returns {{objectValue: ObjectValue, useSyncApiAlthoughPsync: boolean}}
     */
    getPrivatesForNativeProxy: function (proxy) {
        return this.proxyPrivatesMap.get(proxy);
    },

    /**
     * Determines whether we have a cached export for an object value
     * (cached both for identity and to save on memory usage)
     *
     * @param {ObjectValue} objectValue
     * @returns {boolean}
     */
    hasExportForObjectValue: function (objectValue) {
        return this.objectValueToExportMap.has(objectValue);
    },

    /**
     * Determines whether we have an original ObjectValue for the given export value
     *
     * @param {Object} exportedValue
     * @returns {boolean}
     */
    hasObjectValueForExport: function (exportedValue) {
        return this.exportToObjectValueMap.has(exportedValue);
    },

    /**
     * Determines whether there is private data for the given native proxy
     * (ie. whether it is actually a valid native proxy)
     *
     * @param {ProxyClass} proxy
     * @returns {boolean}
     */
    hasPrivatesForNativeProxy: function (proxy) {
        return this.proxyPrivatesMap.has(proxy);
    },

    /**
     * Stores the given export for the specified object value
     *
     * @param {ObjectValue} objectValue
     * @param {Object|*} exportedValue
     */
    setExportForObjectValue: function (objectValue, exportedValue) {
        var storage = this;

        storage.objectValueToExportMap.set(objectValue, exportedValue);
    },

    /**
     * Stores an export for an object value (note that an object value may be unwrapped
     * to several exports, eg. for psync mode, both an async and a sync API proxy)
     *
     * @param {Object|*} exportedValue
     * @param {ObjectValue} objectValue
     */
    setObjectValueForExport: function (exportedValue, objectValue) {
        this.exportToObjectValueMap.set(exportedValue, objectValue);
    },

    /**
     * Stores the private data for the given native proxy
     *
     * @param {ProxyClass} proxy
     * @param {{objectValue: ObjectValue, useSyncApiAlthoughPsync: boolean}} privates
     */
    setPrivatesForNativeProxy: function (proxy, privates) {
        var storage = this;

        if (storage.proxyPrivatesMap.has(proxy)) {
            throw new Error('Proxy already has privates set');
        }

        storage.proxyPrivatesMap.set(proxy, privates);
    }
});

module.exports = ValueStorage;
