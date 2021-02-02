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
 * Handles the hooking of native JS error stack traces for a specific window/frame
 * in environments where <Error>.stack is defined as an accessor property, eg. Firefox/SpiderMonkey
 *
 * @param {StackCleaner} stackCleaner
 * @constructor
 */
function NonV8FrameStackHooker(stackCleaner) {
    /**
     * @type {StackCleaner}
     */
    this.stackCleaner = stackCleaner;
}

_.extend(NonV8FrameStackHooker.prototype, {
    /**
     * Hooks native JS error stack traces for a specific window/frame
     *
     * @param {Window} frame
     */
    hook: function (frame) {
        var hooker = this,
            NativeError = frame.Error,
            originalDescriptor = Object.getOwnPropertyDescriptor(NativeError.prototype, 'stack');

        if (originalDescriptor !== null && originalDescriptor.get && originalDescriptor.set) {
            Object.defineProperty(NativeError.prototype, 'stack', {
                configurable: true,
                enumerable: false,
                get: function () {
                    // Fetch the stack via the native mechanism before running it through our cleaning routine
                    return hooker.stackCleaner.cleanStack(originalDescriptor.get.call(this));
                },
                set: function (stackTrace) {
                    // Use the native .stack property value assignment logic for simplicity
                    originalDescriptor.set.call(this, stackTrace);
                }
            });
        }
    }
});

module.exports = NonV8FrameStackHooker;
