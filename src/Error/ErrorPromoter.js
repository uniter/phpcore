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
    PHPError = phpCommon.PHPError;

/**
 * Handles taking an ObjectValue containing an Error instance, raises it via the ErrorReporting mechanism
 * and then returns a native error constructed from its contents
 *
 * @param {ErrorReporting} errorReporting
 * @constructor
 */
function ErrorPromoter(errorReporting) {
    /**
     * @type {ErrorReporting}
     */
    this.errorReporting = errorReporting;
}

_.extend(ErrorPromoter.prototype, {
    /**
     * Reports the specified error message to stdout, stderr, both or neither
     * depending on its level and the current error_reporting level/display_errors configured
     *
     * @param {ObjectValue} errorValue
     * @returns {Error}
     */
    promote: function (errorValue) {
        var nativeError = errorValue.coerceToNativeError(),
            promoter = this,
            trace = errorValue.getInternalProperty('trace');

        if (errorValue.classIs('ParseError')) {
            // ParseErrors are special - when they reach the top level scope,
            // if nothing has caught them then they are displayed as
            // "PHP Parse error: ..." rather than "PHP Fatal error: Uncaught ParseError ..."
            promoter.errorReporting.reportError(
                PHPError.E_PARSE,
                errorValue.getProperty('message').getNative(),
                errorValue.getProperty('file').getNative(),
                errorValue.getProperty('line').getNative(),
                trace,
                false
            );
        } else {
            promoter.errorReporting.reportError(
                PHPError.E_ERROR,
                nativeError.getMessage(),
                errorValue.getProperty('file').getNative(),
                errorValue.getProperty('line').getNative(),
                trace,
                errorValue.getInternalProperty('reportsOwnContext')
            );
        }

        return nativeError;
    }
});

module.exports = ErrorPromoter;
