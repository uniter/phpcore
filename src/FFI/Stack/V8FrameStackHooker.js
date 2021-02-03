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
 * Handles the hooking of native JS error stack traces for a specific window/frame in V8,
 * where we can use the Stack Trace API (https://v8.dev/docs/stack-trace-api)
 *
 * @param {StackCleaner} stackCleaner
 * @constructor
 */
function V8FrameStackHooker(stackCleaner) {
    /**
     * @type {StackCleaner}
     */
    this.stackCleaner = stackCleaner;
}

_.extend(V8FrameStackHooker.prototype, {
    /**
     * Hooks native JS error stack traces for a specific window/frame
     *
     * @param {Window} frame
     */
    hook: function (frame) {
        var hooker = this,
            NativeError = frame.Error,

            // On init, take note of the current limit so we can continue to apply it until/unless changed
            // via the setter on the overriding CustomError we define below
            stackTraceLimit = NativeError.stackTraceLimit;

        // Hook the creation of error stack traces in V8 using the Stack Trace API
        NativeError.prepareStackTrace = function (error/*, structuredStackTrace*/) {
            var cleanedStack = hooker.stackCleaner.cleanStack(
                error.stack,
                // Allow one extra line for the error message
                stackTraceLimit + 1
            );

            // For older versions of V8 we need to write to the .stack property,
            // as the return value from .prepareStackTrace(...) is not always respected
            error.stack = cleanedStack;

            return cleanedStack;
        };

        /**
         * Capture all stack frames so that we can correctly clean the stack. Note that
         * Error.stackTraceLimit may still be set elsewhere (to give its "visible" value),
         * which will use the accessor property that shadows this one below.
         *
         * Once a stack has been cleaned it will be truncated to the limit set.
         */
        NativeError.stackTraceLimit = Infinity;

        /**
         * Custom Error class that allows hooking static .stackTraceLimit so we can apply it post-cleaning
         *
         * @param {string} message
         * @constructor
         */
        function CustomError(message) {
            this.message = message;

            // Unlike the native Error class that we're overriding, we need to explicitly capture .stack
            NativeError.captureStackTrace(this, CustomError);
        }

        // Define the Error.* V8 Stack Trace API static members
        Object.defineProperties(CustomError, {
            captureStackTrace: {
                configurable: true,
                enumerable: true,
                value: NativeError.captureStackTrace,
                writable: true
            },

            // Name this class as the native Error
            name: {
                configurable: true,
                enumerable: false,
                value: 'Error'
            },

            // Shadow the native preparer we set above.
            prepareStackTrace: {
                configurable: true,
                enumerable: true,

                get: function () {
                    return undefined;
                },

                set: function () {
                    // TODO: Support this by also cleaning structuredStackTrace
                    //       so that it may be passed on to the next preparer in the chain
                    throw new Error('Uniter: Stacking of Error.prepareStackTrace not yet supported');
                }
            },

            /**
             * Allow Error.stackTraceLimit to be get and set, always returning the correct current value.
             * However, internally we need to set the limit differently in order to capture enough frames
             * to correctly clean the stack.
             *
             * NB: Attempting to simply redefine this property as an accessor on the native Error class
             *     seems to result in the V8 Stack Trace API being disabled, hence this custom Error class.
             */
            stackTraceLimit: {
                configurable: true,
                enumerable: true,

                /**
                 * Fetches the current (visible) Error.stackTraceLimit
                 *
                 * @returns {number}
                 */
                get: function () {
                    return stackTraceLimit;
                },

                /**
                 * Handles a new (visible) Error.stackTraceLimit being set
                 *
                 * @param {number} newLimit
                 */
                set: function (newLimit) {
                    stackTraceLimit = newLimit;
                }
            }
        });

        // Use the native Error.prototype so that we implement any other properties
        // and so that instanceof will still work correctly.
        CustomError.prototype = NativeError.prototype;

        frame.Error = CustomError;
    }
});

module.exports = V8FrameStackHooker;
