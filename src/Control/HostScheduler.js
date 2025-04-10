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
    queueMacrotask = function (callback) {
        setTimeout(callback, 0);
    },
    queueMicrotask = require('core-js-pure/actual/queue-microtask');

/**
 * Abstraction for host JavaScript environment event loop scheduling.
 *
 * TODO: Use me everywhere we currently use queueM[ai]crotask().
 *
 * @constructor
 */
function HostScheduler() {

}

_.extend(HostScheduler.prototype, {
    /**
     * Schedules a callback to run asynchronously in a macrotask
     * (macrotasks wait for the _next_ event loop tick, allowing DOM events to fire etc.).
     *
     * @param {Function} callback
     */
    queueMacrotask: function (callback) {
        return queueMacrotask(callback);
    },

    /**
     * Schedules a callback to run asynchronously in a microtask
     * (microtasks are called at the end of the _current_ event loop tick, so any DOM events etc.
     * will not be fired in between).
     *
     * @param {Function} callback
     */
    queueMicrotask: function (callback) {
        return queueMicrotask(callback);
    }
});

module.exports = HostScheduler;
