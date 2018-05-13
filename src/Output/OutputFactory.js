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
 * @param {class} OutputBuffer
 * @constructor
 */
function OutputFactory(OutputBuffer) {
    /**
     * @type {class}
     */
    this.OutputBuffer = OutputBuffer;
}

_.extend(OutputFactory.prototype, {
    /**
     * Creates a new OutputBuffer
     *
     * @param {OutputBufferInterface} previousBuffer
     * @returns {OutputBuffer}
     */
    createOutputBuffer: function (previousBuffer) {
        return new this.OutputBuffer(previousBuffer);
    }
});

module.exports = OutputFactory;
