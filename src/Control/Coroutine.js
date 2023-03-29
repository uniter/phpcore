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
 * @param {NamespaceContext} namespaceContext
 * @constructor
 */
function Coroutine(callStack, namespaceContext) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {NamespaceContext}
     */
    this.namespaceContext = namespaceContext;
    /**
     * Saved call stack frames for restoring.
     *
     * @type {Call[]|null}
     */
    this.savedCallStack = null;
    /**
     * Saved NamespaceContext state for restoring.
     *
     * @type {Object|null}
     */
    this.savedNamespaceContextState = null;
    /**
     * Whether this coroutine is currently suspended.
     *
     * @type {boolean}
     */
    this.suspended = false;
}

_.extend(Coroutine.prototype, {
    /**
     * Resumes this coroutine, if it was previously suspended.
     */
    resume: function () {
        var coroutine = this;

        if (!coroutine.suspended) {
            return;
        }

        coroutine.callStack.restore(coroutine.savedCallStack);
        coroutine.namespaceContext.restore(coroutine.savedNamespaceContextState);

        coroutine.savedNamespaceContextState = null;
        coroutine.savedCallStack = null;
        coroutine.suspended = false;
    },

    /**
     * Suspends this coroutine, for later resumption.
     */
    suspend: function () {
        var coroutine = this;

        if (coroutine.suspended) {
            throw new Exception('Coroutine.suspend() :: Invalid state - coroutine already suspended');
        }

        coroutine.savedNamespaceContextState = coroutine.namespaceContext.save();
        coroutine.savedCallStack = coroutine.callStack.save();

        // Clear the call stack at this point, unlike .save().
        coroutine.callStack.clear();

        coroutine.suspended = true;
    }
});

module.exports = Coroutine;
