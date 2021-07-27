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
 * @constructor
 */
function ControlScope() {
    /**
     * @type {Pause|null}
     */
    this.currentPause = null;
}

_.extend(ControlScope.prototype, {
    /**
     * Determines whether we are currently in the process of pausing (a Pause has been created and thrown,
     * but it has not yet fully unwound the call stack inside the runtime)
     *
     * @returns {boolean}
     */
    isPausing: function () {
        return this.currentPause !== null;
    },

    /**
     * Mark that the given current pause has finished being handled
     *
     * @param {Pause} pause
     */
    markPaused: function (pause) {
        var scope = this;

        if (scope.currentPause === null) {
            throw new Error('ControlScope.markPaused() :: Invalid state - no pause is currently taking effect');
        }

        if (pause !== scope.currentPause) {
            throw new Error('ControlScope.markPaused() :: Invalid state - wrong pause');
        }

        scope.currentPause = null;
    },

    /**
     * Mark that a pause is taking effect
     *
     * @param {Pause} pause
     */
    markPausing: function (pause) {
        var scope = this;

        if (scope.currentPause !== null) {
            throw new Error('ControlScope.markPausing() :: Invalid state - a pause is already taking effect');
        }

        scope.currentPause = pause;
    }
});

module.exports = ControlScope;
