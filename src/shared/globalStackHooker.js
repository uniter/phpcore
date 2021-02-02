/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

/**
 * GlobalStackHooker shared service.
 *
 * Allows current & future class dependencies to be added in a single place.
 */

'use strict';

var usingV8StackTraceAPI = typeof Error.captureStackTrace === 'function' &&
        Function.prototype.toString.call(Error.captureStackTrace).indexOf('[native code]') > -1,
    GlobalStackHooker = require('../FFI/Stack/GlobalStackHooker'),
    NonV8FrameStackHooker = require('../FFI/Stack/NonV8FrameStackHooker'),
    StackCleaner = require('../FFI/Stack/StackCleaner'),
    V8FrameStackHooker = require('../FFI/Stack/V8FrameStackHooker'),
    stackCleaner = new StackCleaner(),
    frameStackHooker = usingV8StackTraceAPI ?
        new V8FrameStackHooker(stackCleaner) :
        new NonV8FrameStackHooker(stackCleaner);

module.exports = new GlobalStackHooker(frameStackHooker, global);
