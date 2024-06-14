/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var CacheInvalidator = require('../../Garbage/CacheInvalidator'),
    DestructibleObjectRepository = require('../../Garbage/DestructibleObjectRepository'),
    GarbageCollector = require('../../Garbage/GarbageCollector'),
    GarbageFactory = require('../../Garbage/GarbageFactory'),
    NullCacheInvalidator = require('../../Garbage/NullCacheInvalidator'),
    ObjectDestructor = require('../../Garbage/ObjectDestructor'),
    ReferenceCache = require('../../Garbage/ReferenceCache'),
    ReferenceTreeWalker = require('../../Garbage/ReferenceTreeWalker'),
    RootDiscoverer = require('../../Garbage/RootDiscoverer'),

    CACHE_INVALIDATOR = 'garbage.cache_invalidator',
    DESTRUCTIBLE_OBJECT_REPOSITORY = 'garbage.destructible_object_repository',
    FLOW = 'flow',
    GARBAGE_FACTORY = 'garbage.factory',
    GLOBAL_SCOPE = 'global_scope',
    OBJECT_DESTRUCTOR = 'garbage.object_destructor',
    REFERENCE_CACHE = 'garbage.reference_cache',
    REFERENCE_TREE_WALKER = 'garbage.reference_tree_walker',
    ROOT_DISCOVERER = 'garbage.root_discoverer';

/**
 * Provides services for handling of garbage collection.
 *
 * @param {ServiceInternals} internals
 */
module.exports = function (internals) {
    var get = internals.getServiceFetcher();

    return {
        'garbage.cache_invalidator': function () {
            var optionSet = get('option_set'),
                garbageCollectionEnabled = optionSet.getOption('garbageCollection') === true;

            return garbageCollectionEnabled ?
                new CacheInvalidator(get(REFERENCE_CACHE)) :
                new NullCacheInvalidator();
        },

        'garbage.destructible_object_repository': function () {
            return new DestructibleObjectRepository();
        },

        'garbage.collector': function () {
            return new GarbageCollector(
                get(ROOT_DISCOVERER),
                get(REFERENCE_TREE_WALKER),
                get(CACHE_INVALIDATOR),
                get(OBJECT_DESTRUCTOR)
            );
        },

        'garbage.factory': function () {
            return new GarbageFactory();
        },

        'garbage.object_destructor': function () {
            return new ObjectDestructor(
                get(DESTRUCTIBLE_OBJECT_REPOSITORY),
                get(REFERENCE_CACHE),
                get(FLOW)
            );
        },

        'garbage.reference_cache': function () {
            return new ReferenceCache();
        },

        'garbage.reference_tree_walker': function () {
            return new ReferenceTreeWalker(get(GARBAGE_FACTORY), get(REFERENCE_CACHE));
        },

        'garbage.root_discoverer': function () {
            return new RootDiscoverer(get(GLOBAL_SCOPE));
        }
    };
};
