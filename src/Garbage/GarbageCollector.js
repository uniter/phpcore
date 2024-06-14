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
 * Top-level facade that performs garbage collection.
 *
 * Note that FinalizationRegistry cannot be used, because it invokes the finaliser
 * _after_ the value has been destroyed, whereas PHP destructors must be called just before,
 * as the object is accessible via `$this`.
 *
 * @param {RootDiscoverer} rootDiscoverer
 * @param {ReferenceTreeWalker} referenceTreeWalker
 * @param {CacheInvalidator} cacheInvalidator
 * @param {ObjectDestructor} objectDestructor
 * @constructor
 */
function GarbageCollector(
    rootDiscoverer,
    referenceTreeWalker,
    cacheInvalidator,
    objectDestructor
) {
    /**
     * @type {CacheInvalidator}
     */
    this.cacheInvalidator = cacheInvalidator;
    /**
     * @type {ObjectDestructor}
     */
    this.objectDestructor = objectDestructor;
    /**
     * @type {ReferenceTreeWalker}
     */
    this.referenceTreeWalker = referenceTreeWalker;
    /**
     * @type {RootDiscoverer}
     */
    this.rootDiscoverer = rootDiscoverer;
}

_.extend(GarbageCollector.prototype, {
    /**
     * Performs a mark & sweep garbage collection.
     *
     * - Mark phase uses cached results of previous collections where possible.
     * - Sweep phase will call ->__destruct() on any identified unreachable
     *   destructible ObjectValues (of classes implementing ->__destruct()).
     *
     * @returns {ChainableInterface<number>} Returns the number of values collected
     *                                       (->__destruct()-ible objects destructed).
     */
    collect: function () {
        var collector = this;

        collector.cacheInvalidator.invalidate();
        collector.referenceTreeWalker.mark(collector.rootDiscoverer.discoverRoots());

        return collector.objectDestructor.sweep();
    }
});

module.exports = GarbageCollector;
