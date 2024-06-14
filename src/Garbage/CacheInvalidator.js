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
    Set = require('core-js-pure/actual/set');

/**
 * Invalidates PHP heap values that have been marked for invalidation due to being modified
 * or because they were removed from a reference that referred to them.
 *
 * @param {ReferenceCache} referenceCache
 * @constructor
 */
function CacheInvalidator(referenceCache) {
    /**
     * @type {Set<Value>}
     */
    this.invalidatedSet = new Set();
    /**
     * @type {ReferenceCache}
     */
    this.referenceCache = referenceCache;
}

_.extend(CacheInvalidator.prototype, {
    /**
     * Invalidates all values marked for invalidation.
     */
    invalidate: function () {
        var invalidator = this,
            gcRootToMarkRootMap = invalidator.referenceCache.getGcRootToMarkRootMap(),
            reachableValueToMarkRootMap = invalidator.referenceCache.getReachableValueToMarkRootMap();

        invalidator.invalidatedSet.forEach(function (invalidatedValue) {
            var markRoot = reachableValueToMarkRootMap.get(invalidatedValue);

            if (!markRoot || !markRoot.isValid()) {
                // No cache entry for invalidated value: nothing to do.
                return;
            }

            gcRootToMarkRootMap.delete(markRoot.getGcRoot());
            markRoot.invalidate();
            reachableValueToMarkRootMap.delete(invalidatedValue);
        });

        invalidator.invalidatedSet.clear();
    },

    /**
     * Marks the given value for invalidation.
     *
     * @param {Value} value
     */
    markValueForInvalidation: function (value) {
        this.invalidatedSet.add(value);
    }
});

module.exports = CacheInvalidator;
