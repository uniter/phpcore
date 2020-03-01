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

    ERROR_WITH_CONTEXT_AND_TRACE = 'core.error_with_context_and_trace',
    ERROR_WITHOUT_CONTEXT_BUT_WITH_TRACE = 'core.error_without_context_but_with_trace',
    ERROR_WITHOUT_TRACE = 'core.error_without_trace',
    UNKNOWN = 'core.unknown';

/**
 * Handles the final output of error messages to the standard streams,
 * based on the current configuration
 *
 * @param {ErrorConfiguration} errorConfiguration
 * @param {ErrorConverter} errorConverter
 * @param {TraceFormatter} traceFormatter
 * @param {Translator} translator
 * @param {Stream} stdout
 * @param {Stream} stderr
 * @constructor
 */
function ErrorReporting(
    errorConfiguration,
    errorConverter,
    traceFormatter,
    translator,
    stdout,
    stderr
) {
    /**
     * @type {ErrorConfiguration}
     */
    this.errorConfiguration = errorConfiguration;
    /**
     * @type {ErrorConverter}
     */
    this.errorConverter = errorConverter;
    /**
     * @type {Stream}
     */
    this.stderr = stderr;
    /**
     * @type {Stream}
     */
    this.stdout = stdout;
    /**
     * @type {TraceFormatter}
     */
    this.traceFormatter = traceFormatter;
    /**
     * @type {Translator}
     */
    this.translator = translator;
}

_.extend(ErrorReporting.prototype, {
    /**
     * Reports the specified error message to stdout, stderr, both or neither
     * depending on its level and the current error_reporting level/display_errors configured
     *
     * @param {string} level
     * @param {string} message
     * @param {string|null=} filePath
     * @param {number|null=} lineNumber
     * @param {{index: number, file: string, line: number, func: Function, args: *[]}[]=} trace
     * @param {boolean} reportsOwnContext Whether the error handles reporting its own file/line context
     */
    reportError: function (level, message, filePath, lineNumber, trace, reportsOwnContext) {
        var errorReporting = this,
            displayErrors = errorReporting.errorConfiguration.getDisplayErrors(),
            allowedErrorBitmask = errorReporting.errorConfiguration.getErrorReportingLevel(),
            levelBits = errorReporting.errorConverter.errorLevelToBits(level),
            formattedTrace,
            normalisedLineNumber = lineNumber || errorReporting.translator.translate(UNKNOWN),
            normalisedFilePath = filePath || errorReporting.translator.translate(UNKNOWN),
            suffix;

        /*jshint bitwise: false */
        if ((allowedErrorBitmask & levelBits) === 0) {
            // This error level is not enabled for reporting: do nothing
            return;
        }

        // When written to one of the standard streams, the file/line combo is provided
        // in a colon-separated format rather than the verbose "in ... on line ..."

        if (level === PHPError.E_ERROR && trace) {
            formattedTrace = trace ? errorReporting.traceFormatter.format(trace) : null;

            if (reportsOwnContext) {
                suffix = errorReporting.translator.translate(ERROR_WITHOUT_CONTEXT_BUT_WITH_TRACE, {
                    filePath: normalisedFilePath,
                    line: normalisedLineNumber,
                    formattedTrace: formattedTrace
                });
            } else {
                suffix = errorReporting.translator.translate(ERROR_WITH_CONTEXT_AND_TRACE, {
                    filePath: normalisedFilePath,
                    line: normalisedLineNumber,
                    formattedTrace: formattedTrace
                });
            }
        } else {
            if (reportsOwnContext) {
                suffix = '';
            } else {
                suffix = errorReporting.translator.translate(ERROR_WITHOUT_TRACE, {
                    filePath: normalisedFilePath,
                    line: normalisedLineNumber
                });
            }
        }

        // NB: The double-space after colon is intentional, to match the reference implementation
        errorReporting.stderr.write('PHP ' + level + ':  ' + message + suffix + '\n');

        if (displayErrors) {
            errorReporting.stdout.write('\n' + level + ': ' + message + suffix + '\n');
        }
    }
});

module.exports = ErrorReporting;
