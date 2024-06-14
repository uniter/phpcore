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
 * Walks the PHP value heap from the given GC roots, marking reachable values.
 *
 * @param {GarbageFactory} garbageFactory
 * @param {ReferenceCache} referenceCache
 * @constructor
 */
function ReferenceTreeWalker(
    garbageFactory,
    referenceCache
) {
    /**
     * @type {GarbageFactory}
     */
    this.garbageFactory = garbageFactory;
    /**
     * @type {ReferenceCache}
     */
    this.referenceCache = referenceCache;
}

_.extend(ReferenceTreeWalker.prototype, {
    /**
     * Walks the given GC roots, updating the caches with reachable ArrayValues and ObjectValues
     * and from those values back to all GC roots able to reach them.
     *
     * @param {Value[]} gcRoots
     */
    mark: function (gcRoots) {
        var walker = this,
            gcRootToMarkRootMap = walker.referenceCache.getGcRootToMarkRootMap(),
            reachableValueSetForGcRoot = new Set(),
            reachableValueToMarkRootMap = walker.referenceCache.getReachableValueToMarkRootMap();

        // As we populate the reachable value WeakMap, we can use it to ensure we don't recurse infinitely.

        _.each(gcRoots, function (gcRoot) {
            var index,
                linkedMarkRoot,
                markRoot,
                markTree = null,
                outgoingValue,
                outgoingValues,
                length,
                previousMarkRoot = gcRootToMarkRootMap.get(gcRoot),
                subOutgoingValues;

            if (previousMarkRoot && previousMarkRoot.isValid()) {
                // Fast case: GC root is already in cache, meaning nothing happened since the previous GC
                // that would result in additional reachable values from this root, so there is nothing to do.
                return;
            }

            if (reachableValueToMarkRootMap.has(gcRoot)) {
                markRoot = reachableValueToMarkRootMap.get(gcRoot);

                if (markRoot.isValid()) {
                    markTree = markRoot.getTree();
                }
            }

            if (!markTree) {
                markTree = walker.garbageFactory.createMarkTree();
                markRoot = walker.garbageFactory.createMarkRoot(gcRoot, markTree);

                reachableValueToMarkRootMap.set(gcRoot, markRoot);
            }

            gcRootToMarkRootMap.set(gcRoot, markRoot);

            // Reuse this set for every GC root to reduce host heap/GC pressure.
            reachableValueSetForGcRoot.clear();

            outgoingValues = gcRoot.getOutgoingValues();
            length = outgoingValues.length;

            // Mark this GC root value itself first.
            reachableValueSetForGcRoot.add(gcRoot);

            for (index = 0; index < length; index++) {
                outgoingValue = outgoingValues[index];

                if (reachableValueSetForGcRoot.has(outgoingValue)) {
                    /*
                     * We've already handled this value for this particular GC root,
                     * skip it to avoid recursing infinitely
                     * or unnecessarily performing the validation & adoption logic just below.
                     */
                    continue;
                }

                reachableValueSetForGcRoot.add(outgoingValue);

                if (reachableValueToMarkRootMap.has(outgoingValue)) {
                    linkedMarkRoot = reachableValueToMarkRootMap.get(outgoingValue);

                    if (linkedMarkRoot.isValid()) {
                        // Merge the discovered MarkTree with this one.
                        linkedMarkRoot.adoptTree(markTree);

                        continue;
                    }
                }

                /**
                 * This map both limits recursion here and is used when invalidating
                 * the GC root->destructible object cache.
                 */
                reachableValueToMarkRootMap.set(outgoingValue, markRoot);

                subOutgoingValues = outgoingValue.getOutgoingValues();

                // Unroll recursion so that we don't blow the host JS stack even for deeply nested heaps.
                [].push.apply(outgoingValues, subOutgoingValues);
                length = outgoingValues.length;
            }
        });
    }
});

module.exports = ReferenceTreeWalker;
