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
 * @constructor
 */
function ControlScope() {
    /**
     * @type {CoroutineFactory}
     */
    this.coroutineFactory = null;
    /**
     * @type {Coroutine|null}
     */
    this.currentCoroutine = null;
    /**
     * @type {Pause|null}
     */
    this.currentPause = null;
    /**
     * @type {boolean}
     */
    this.nestNextCoroutine = false;
}

_.extend(ControlScope.prototype, {
    /**
     * Enters a new coroutine, or continues the current one if we are nesting.
     *
     * @returns {Coroutine}
     */
    enterCoroutine: function () {
        var scope = this,
            newCoroutine;

        if (scope.nestNextCoroutine) {
            scope.nestNextCoroutine = false;

            if (scope.currentCoroutine === null) {
                throw new Exception('ControlScope.enterCoroutine() :: Unable to nest - no coroutine is active');
            }

            return scope.currentCoroutine;
        }

        newCoroutine = scope.coroutineFactory.createCoroutine();

        if (scope.currentCoroutine !== null) {
            scope.currentCoroutine.suspend();
        }

        scope.currentCoroutine = newCoroutine;

        return scope.currentCoroutine;
    },

    /**
     * Fetches the current coroutine.
     *
     * @returns {Coroutine}
     */
    getCoroutine: function () {
        var scope = this;

        if (scope.currentCoroutine === null) {
            throw new Exception('ControlScope.getCoroutine() :: Invalid state - no coroutine is active');
        }

        return scope.currentCoroutine;
    },

    /**
     * Fetches whether there is a current coroutine.
     *
     * @returns {boolean}
     */
    inCoroutine: function () {
        return this.currentCoroutine !== null;
    },

    /**
     * Fetches whether the next coroutine has been marked as nested.
     *
     * @returns {boolean}
     */
    isNestingCoroutine: function () {
        return this.nestNextCoroutine;
    },

    /**
     * Determines whether we are currently in the process of pausing (a Pause has been created and thrown,
     * but it has not yet fully unwound the call stack inside the runtime).
     *
     * @returns {boolean}
     */
    isPausing: function () {
        return this.currentPause !== null;
    },

    /**
     * Mark that the given current pause has finished being handled.
     *
     * @param {Pause} pause
     */
    markPaused: function (pause) {
        var scope = this;

        if (scope.currentPause === null) {
            throw new Exception('ControlScope.markPaused() :: Invalid state - no pause is currently taking effect');
        }

        if (pause !== scope.currentPause) {
            throw new Exception('ControlScope.markPaused() :: Invalid state - wrong pause');
        }

        scope.currentPause = null;
    },

    /**
     * Mark that a pause is taking effect.
     *
     * @param {Pause} pause
     */
    markPausing: function (pause) {
        var scope = this;

        if (scope.currentPause !== null) {
            /*
             * Note that this does not preclude another pause from occurring while a pause is in effect -
             * it ensures that a pause has fully taken effect (by unwinding the JS call stack)
             * before another can begin.
             */
            throw new Exception('ControlScope.markPausing() :: Invalid state - a pause is already taking effect');
        }

        scope.currentPause = pause;
    },

    /**
     * Marks the next coroutine as nested. For now this means the same one will be kept
     * on next entry, i.e. no new coroutine will be created.
     */
    nestCoroutine: function () {
        var scope = this;

        if (scope.nestNextCoroutine) {
            throw new Exception('ControlScope.nestCoroutine() :: Invalid state - already marked for nesting');
        }

        scope.nestNextCoroutine = true;
    },

    /**
     * Restores a previously suspended or saved coroutine.
     *
     * @param {Coroutine} coroutine
     */
    resumeCoroutine: function (coroutine) {
        var scope = this;

        if (scope.currentPause !== null) {
            throw new Exception('ControlScope.resumeCoroutine() :: Invalid state - a pause is currently taking effect');
        }

        if (scope.currentCoroutine !== coroutine) {
            // Coroutine was not the current one, so suspend that one first.

            if (scope.currentCoroutine !== null) {
                scope.currentCoroutine.suspend();
            }

            scope.currentCoroutine = coroutine;
        }

        scope.currentCoroutine.resume();
    },

    /**
     * Injects the CoroutineFactory service. Required to work around a circular dependency.
     *
     * @param {CoroutineFactory} coroutineFactory
     */
    setCoroutineFactory: function (coroutineFactory) {
        this.coroutineFactory = coroutineFactory;
    }
});

module.exports = ControlScope;
