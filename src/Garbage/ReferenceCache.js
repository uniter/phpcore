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
 * Holds cache structures for the garbage collection mechanism.
 *
 * @constructor
 */
function ReferenceCache() {
    /**
     * @type {WeakMap<Value, MarkRoot>}
     */
    this.gcRootToMarkRootMap = new WeakMap();
    /**
     * @type {WeakMap<Value, MarkRoot>}
     */
    this.reachableValueToMarkRootMap = new WeakMap();
}

_.extend(ReferenceCache.prototype, {
    /**
     * Fetches the map from GC roots to MarkRoots.
     *
     * @return {WeakMap<Value, MarkRoot>}
     */
    getGcRootToMarkRootMap: function () {
        return this.gcRootToMarkRootMap;
    },

    /**
     * Fetches the map from reachable structured values to MarkRoots.
     *
     * @return {WeakMap<Value, MarkRoot>}
     */
    getReachableValueToMarkRootMap: function () {
        return this.reachableValueToMarkRootMap;
    }
});

module.exports = ReferenceCache;
