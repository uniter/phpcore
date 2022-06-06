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
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception;

/**
 * Represents an independent call stack into PHP-land that can be suspended and later resumed.
 * Used for multitasking, non-preemptively by default.
 *
 * @param {CallStack} callStack
 * @constructor
 */
function Coroutine(callStack) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * Saved call stack frames for restoring.
     *
     * @type {Call[]|null}
     */
    this.savedCallStack = null;
}

_.extend(Coroutine.prototype, {
    /**
     * Resumes this coroutine, if it was previously suspended.
     */
    resume: function () {
        var coroutine = this,
            savedCallStack;

        if (coroutine.savedCallStack === null) {
            return;
        }

        savedCallStack = coroutine.savedCallStack;
        coroutine.savedCallStack = null;

        coroutine.callStack.restore(savedCallStack);
    },

    /**
     * Suspends this coroutine, for later resumption.
     */
    suspend: function () {
        var coroutine = this;

        if (coroutine.savedCallStack !== null) {
            throw new Exception('Coroutine.save() :: Invalid state - coroutine already suspended');
        }

        coroutine.savedCallStack = coroutine.callStack.save();

        // Clear the call stack at this point, unlike .save().
        coroutine.callStack.clear();
    }
});

module.exports = Coroutine;
