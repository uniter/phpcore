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
    throwUnimplemented = function (functionName) {
        return function () {
            throw new Error(functionName + '() :: Not implemented');
        };
    };

/**
 * @interface
 */
function OutputBufferInterface() {
    throw new Error('OutputBufferInterface cannot be instantiated');
}

_.extend(OutputBufferInterface.prototype, {
    /**
     * Discards the contents of this buffer without flushing it through
     *
     * @returns {bool} Returns true on success, false otherwise
     */
    clean: throwUnimplemented('clean'),

    /**
     * Writes the contents of this buffer through to the next buffer and then discards them from this buffer
     *
     * @returns {bool} Returns true on success, false otherwise
     */
    flush: throwUnimplemented('flush'),

    /**
     * Fetches the current contents of this buffer if it is actually a buffering one
     *
     * @returns {string|null}
     */
    getContents: throwUnimplemented('getContents'),

    /**
     * Fetches the depth of this buffer
     *
     * @returns {number}
     */
    getDepth: throwUnimplemented('getDepth'),

    /**
     * Writes data to this buffer, storing it for future use
     *
     * @param {string} data
     */
    write: throwUnimplemented('write')
});

module.exports = OutputBufferInterface;
