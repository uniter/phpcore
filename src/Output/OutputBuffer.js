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
    util = require('util'),
    OutputBufferInterface = require('./OutputBufferInterface');

/**
 * @param {OutputBufferInterface} previousBuffer
 * @constructor
 */
function OutputBuffer(previousBuffer) {
    /**
     * @type {string}
     */
    this.bufferedData = '';
    /**
     * @type {OutputBufferInterface}
     */
    this.previousBuffer = previousBuffer;
}

util.inherits(OutputBuffer, OutputBufferInterface);

_.extend(OutputBuffer.prototype, {
    /**
     * {@inheritdoc}
     */
    clean: function () {
        this.bufferedData = '';

        return true; // Success
    },

    /**
     * {@inheritdoc}
     */
    flush: function () {
        var buffer = this;

        buffer.previousBuffer.write(buffer.bufferedData);
        buffer.bufferedData = '';

        return true; // Success
    },

    /**
     * {@inheritdoc}
     */
    getContents: function () {
        return this.bufferedData;
    },

    /**
     * {@inheritdoc}
     */
    getDepth: function () {
        return this.previousBuffer.getDepth() + 1;
    },

    /**
     * {@inheritdoc}
     */
    write: function (data) {
        this.bufferedData += data;
    }
});

module.exports = OutputBuffer;
