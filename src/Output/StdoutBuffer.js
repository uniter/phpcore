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
 * @param {Stream} stdout
 * @constructor
 */
function StdoutBuffer(stdout) {
    /**
     * @type {Stream}
     */
    this.stdout = stdout;
}

util.inherits(StdoutBuffer, OutputBufferInterface);

_.extend(StdoutBuffer.prototype, {
    /**
     * {@inheritdoc}
     */
    clean: function () {
        return false; // This buffer does not actually buffer
    },

    /**
     * {@inheritdoc}
     */
    flush: function () {
        return false; // This buffer does not actually buffer
    },

    /**
     * {@inheritdoc}
     */
    getContents: function () {
        return null; // This buffer does not actually buffer
    },

    /**
     * {@inheritdoc}
     */
    getDepth: function () {
        return 0; // This buffer does not actually buffer
    },

    /**
     * {@inheritdoc}
     */
    write: function (data) {
        this.stdout.write(data);
    }
});

module.exports = StdoutBuffer;
