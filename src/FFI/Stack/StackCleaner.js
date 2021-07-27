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
    STATE_JS_LAND = 'js land',
    STATE_PHP_LAND = 'php land';

/**
 * Handles the cleaning of JS/PHP mixed stack traces to remove PHPCore internal frames
 *
 * @constructor
 */
function StackCleaner() {

}

_.extend(StackCleaner.prototype, {
    /**
     * Removes all frames from the given stack trace that relate to PHPCore internals,
     * to produce a more useful and readable output, especially with tools such as Cypress.
     *
     * @param {string} stack
     * @param {number=} stackTraceLimit
     * @returns {string}
     */
    cleanStack: function (stack, stackTraceLimit) {
        var frameIndex,
            line,
            resultFrames = [],
            state = STATE_JS_LAND,
            stackLines = stack.split('\n');

        for (frameIndex = stackLines.length - 1; frameIndex >= 0; frameIndex--) {
            line = stackLines[frameIndex];

            // TODO: Define these special func names with Object.defineProperty(...)
            //       to accommodate minification
            if (/__uniterInboundStackMarker__/.test(line)) {
                state = STATE_PHP_LAND;
            } else if (/__uniterOutboundStackMarker__/.test(line)) {
                // We're now back out in JS land
                state = STATE_JS_LAND;
            } else if (state === STATE_JS_LAND || /__uniter(Module|Function)StackMarker__/.test(line)) {
                resultFrames.unshift(
                    line
                        // Tidy stack frames from top-level PHP modules
                        .replace(/\b__uniterModuleStackMarker__/g, '__uniter_php_module__')
                        // Remove stack markers from named PHP functions
                        .replace(/\B__uniterFunctionStackMarker__/g, '')
                        // Tidy stack frames from PHP closures
                        .replace(/\b__uniterFunctionStackMarker__/g, '__uniter_php_closure__')
                );
            }
        }

        if (typeof stackTraceLimit !== 'undefined' && isFinite(stackTraceLimit)) {
            resultFrames = resultFrames.slice(0, stackTraceLimit);
        }

        return resultFrames.join('\n');
    }
});

module.exports = StackCleaner;
