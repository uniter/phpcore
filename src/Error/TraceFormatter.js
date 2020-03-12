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
    UNKNOWN = 'core.unknown';

/**
 * Standard way to convert a call stack trace (returned by CallStack.getTrace())
 * to a printable formatted form. Used by Error::getTraceAsString(), Exception::getTraceAsString()
 * and when an uncaught fatal error is written to stdout/stderr.
 *
 * @param {Translator} translator
 * @constructor
 */
function TraceFormatter(translator) {
    /**
     * @type {Translator}
     */
    this.translator = translator;
}

_.extend(TraceFormatter.prototype, {
    /**
     * Formats a call stack trace to a string
     *
     * @param {{index: number, file: string, line: number, func: Function, args: *[]}[]} trace
     * @returns {string}
     */
    format: function (trace) {
        var formatter = this,
            traceStrings = [];

        _.each(trace, function (callData) {
            // Convert arguments to a string representation
            var args = _.map(callData.args, function (argValue) {
                return argValue.formatAsString();
            }),
                line = callData.line || formatter.translator.translate(UNKNOWN);

            traceStrings.push(
                '#' + callData.index + ' ' + callData.file + '(' + line + '): ' +
                callData.func + '(' + args.join(', ') + ')'
            );
        });

        traceStrings.push('#' + trace.length + ' {main}');

        return traceStrings.join('\n');
    }
});

module.exports = TraceFormatter;
