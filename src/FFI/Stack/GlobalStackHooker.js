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
 * @param {NonV8FrameStackHooker|V8FrameStackHooker} frameStackHooker
 * @param {Global} global
 * @constructor
 */
function GlobalStackHooker(frameStackHooker, global) {
    /**
     * @type {NonV8FrameStackHooker|V8FrameStackHooker}
     */
    this.frameStackHooker = frameStackHooker;
    /**
     * @type {Global}
     */
    this.global = global;
}

_.extend(GlobalStackHooker.prototype, {
    /**
     * Hooks error stack handling for all frames/global contexts accessible from the current one.
     */
    hook: function () {
        var hooker = this,
            hookErrorStacksForAllSubFrames = function (frame) {
                try {
                    hooker.frameStackHooker.hook(frame);
                } catch (e) {
                    // Unable to access the context.
                }

                try {
                    _.each(frame.frames, function (frame) {
                        hookErrorStacksForAllSubFrames(frame);
                    });
                } catch (e) {
                    // Unable to access the context.
                }
            };

        if (hooker.global.top !== hooker.global) {
            // We're not the top context, so attempt to hook from there recursively.
            // Note that due to same-origin policy this may not be feasible.
            hookErrorStacksForAllSubFrames(hooker.global.top);
        }

        hookErrorStacksForAllSubFrames(hooker.global);
    }
});

module.exports = GlobalStackHooker;
