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
    NoActiveOutputBufferException = require('../Exception/NoActiveOutputBufferException');

/**
 * @param {OutputFactory} factory
 * @param {StdoutBuffer} stdoutBuffer
 * @constructor
 */
function Output(factory, stdoutBuffer) {
    /**
     * @type {OutputBufferInterface}
     */
    this.currentOutputBuffer = stdoutBuffer;
    /**
     * @type {OutputFactory}
     */
    this.factory = factory;
    /**
     * @type {OutputBufferInterface[]}
     */
    this.outputBufferStack = [];
}

_.extend(Output.prototype, {
    /**
     * Discards the contents of the current buffer without flushing it through
     *
     * @returns {bool} Returns true on success, false otherwise
     */
    cleanCurrentBuffer: function () {
        return this.currentOutputBuffer.clean();
    },

    /**
     * Writes the contents of the current buffer through to the next buffer
     * and then discards them from this buffer
     *
     * @returns {bool} Returns true on success, false otherwise
     */
    flushCurrentBuffer: function () {
        return this.currentOutputBuffer.flush();
    },

    /**
     * Fetches the current contents of the current buffer if it is actually a buffering one
     *
     * @returns {string|null}
     */
    getCurrentBufferContents: function () {
        return this.currentOutputBuffer.getContents();
    },

    /**
     * Fetches the number of nested buffers that are currently active
     *
     * @returns {number}
     */
    getDepth: function () {
        return this.currentOutputBuffer.getDepth();
    },

    /**
     * Pops the current buffer off of the stack, returning to using the previous one
     */
    popBuffer: function () {
        var output = this;

        if (output.outputBufferStack.length === 0) {
            throw new NoActiveOutputBufferException();
        }

        output.currentOutputBuffer = output.outputBufferStack.pop();
    },

    /**
     * Pushes a new output buffer onto the stack
     *
     * @returns {OutputBuffer}
     */
    pushBuffer: function () {
        var output = this,
            newOutputBuffer = output.factory.createOutputBuffer(output.currentOutputBuffer);

        output.outputBufferStack.push(output.currentOutputBuffer);
        output.currentOutputBuffer = newOutputBuffer;

        return newOutputBuffer;
    },

    /**
     * Writes data to the current output buffer
     *
     * @param {string} data
     */
    write: function (data) {
        this.currentOutputBuffer.write(data);
    }
});

module.exports = Output;
