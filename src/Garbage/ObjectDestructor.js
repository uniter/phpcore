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
    MAGIC_DESTRUCT = '__destruct';

/**
 * Calls the destructor of all destructible objects (implementing ->__destruct())
 * that have not been marked as reachable by the mark phase.
 *
 * @param {DestructibleObjectRepository} destructibleObjectRepository
 * @param {ReferenceCache} referenceCache
 * @param {Flow} flow
 * @constructor
 */
function ObjectDestructor(
    destructibleObjectRepository,
    referenceCache,
    flow
) {
    /**
     * @type {DestructibleObjectRepository}
     */
    this.destructibleObjectRepository = destructibleObjectRepository;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {ReferenceCache}
     */
    this.referenceCache = referenceCache;
}

_.extend(ObjectDestructor.prototype, {
    /**
     * Calls the destructor for all destructible ObjectValues that are no longer reachable.
     *
     * @returns {ChainableInterface<number>} Returns the number of values collected
     *                                       (->__destruct()-ible objects destructed).
     */
    sweep: function () {
        var destructor = this,
            destructedObjectCount = 0,
            reachableValueToMarkRootMap = destructor.referenceCache.getReachableValueToMarkRootMap();

        // FIXME: Needs to handle different coroutines. Perhaps if a GC is already in progress
        //        in a different coroutine, this one should be skipped?
        return destructor.flow
            .eachAsync(
                destructor.destructibleObjectRepository.getObjectValues(),
                function (objectValue) {
                    var markRoot = reachableValueToMarkRootMap.get(objectValue);

                    if (markRoot && markRoot.isValid()) {
                        // ObjectValue is reachable, so we must not yet call its destructor.
                        return;
                    }

                    destructedObjectCount++;

                    // FIXME: Remove ObjectValue from the repository so it is not destructed again
                    //        assuming a reference hasn't been added somewhere in the destructor (?)
                    destructor.destructibleObjectRepository.unregisterValue(objectValue);

                    return objectValue.callMethod(MAGIC_DESTRUCT);
                }
            )
            .next(function () {
                return destructedObjectCount;
            });
    }
});

module.exports = ObjectDestructor;
