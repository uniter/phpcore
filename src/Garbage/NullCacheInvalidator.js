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
 * A null implementation of CacheInvalidator for use either to disable caching
 * or when disabling garbage collection entirely.
 *
 * @constructor
 */
function NullCacheInvalidator() {

}

_.extend(NullCacheInvalidator.prototype, {
    /**
     * Invalidates all values marked for invalidation.
     */
    invalidate: function () {
        // Nothing to do.
    },

    /**
     * Marks the given value for invalidation.
     *
     * @param {Value} value
     */
    markValueForInvalidation: function (/* value */) {
        // Nothing to do.
    }
});

module.exports = NullCacheInvalidator;
