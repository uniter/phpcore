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
    phpCommon = require('phpcommon'),
    util = require('util'),
    Exception = phpCommon.Exception;

/**
 * Represents a failed load operation. Loads may be made by an include/require or an eval(...)
 *
 * @param {Error} previousError
 * @constructor
 */
function LoadFailedException(previousError) {
    Exception.call(this, 'Load failed' + (previousError ? ' :: ' + previousError.message : ''));

    /**
     * @type {Error}
     */
    this.previousError = previousError;
}

util.inherits(LoadFailedException, Exception);

_.extend(LoadFailedException.prototype, {
    /**
     * Fetches the previous error or exception that caused the load to fail
     *
     * @returns {Error}
     */
    getPreviousError: function () {
        return this.previousError;
    }
});

module.exports = LoadFailedException;
