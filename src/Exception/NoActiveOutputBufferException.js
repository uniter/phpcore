/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var phpCommon = require('phpcommon'),
    util = require('util'),
    Exception = phpCommon.Exception;

/**
 * Represents an attempt to fetch or pop the active output buffer when none is active
 *
 * @constructor
 */
function NoActiveOutputBufferException() {
    Exception.call(this, 'No output buffer is active');
}

util.inherits(NoActiveOutputBufferException, Exception);

module.exports = NoActiveOutputBufferException;
