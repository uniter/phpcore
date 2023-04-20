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
 * Represents the instrumentation for a call.
 *
 * @param {Function|null} finder
 * @constructor
 */
function CallInstrumentation(finder) {
    /**
     * @type {Function|null}
     */
    this.finder = finder;
}

_.extend(CallInstrumentation.prototype, {
    /**
     * Fetches the finder instrument, if any.
     *
     * @returns {Function|null}
     */
    getFinder: function () {
        return this.finder;
    }
});

module.exports = CallInstrumentation;
