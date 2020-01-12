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
    PHPError = phpCommon.PHPError,
    // Maps the error type PHP constant name to the internal PHPError type that should be raised
    ERROR_CONSTANT_NAME_TO_LEVEL = {
        'E_ERROR': PHPError.E_ERROR,
        'E_WARNING': PHPError.E_WARNING,
        'E_PARSE': PHPError.E_PARSE,
        'E_NOTICE': PHPError.E_NOTICE,
        'E_STRICT': PHPError.E_STRICT,
        'E_RECOVERABLE_ERROR': PHPError.E_RECOVERABLE_ERROR,
        'E_DEPRECATED': PHPError.E_DEPRECATED
    };

/**
 * Converts between Uniter error levels and the PHP constant error level values
 *
 * @param {Function} getConstant
 * @constructor
 */
function ErrorConverter(getConstant) {
    /**
     * @type {Function}
     */
    this.getConstant = getConstant;
}

_.extend(ErrorConverter.prototype, {
    /**
     * Converts from a Uniter error level string to the PHP integer value (E_* constant)
     *
     * @param {string} level
     * @returns {number}
     */
    errorLevelToBits: function (level) {
        var bits = null,
            converter = this;

        _.forOwn(ERROR_CONSTANT_NAME_TO_LEVEL, function (candidateLevel, constantName) {
            if (candidateLevel !== level) {
                return;
            }

            bits = converter.getConstant(constantName);

            return false;
        });

        if (bits === null) {
            throw new Error('Unknown error level "' + level + '"');
        }

        return bits;
    }
});

module.exports = ErrorConverter;
