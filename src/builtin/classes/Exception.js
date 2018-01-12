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
    PHPError = phpCommon.PHPError;

module.exports = function (internals) {
    var callStack = internals.callStack,
        valueFactory = internals.valueFactory;

    /**
     * @param {Value} messageValue
     * @constructor
     */
    function Exception(messageValue) {
        /**
         * The internal `line` property is defined by the shadow constructor.
         *
         * If this class is extended but a parent constructor call is not used,
         * then no parent constructor will be called (even this native constructor function).
         *
         * To run code regardless of whether the parent constructor is called, we use
         * a "shadow constructor", defined below.
         */

        // The default exception message is the empty string
        this.setInternalProperty('messageValue', messageValue || valueFactory.createString(''));
    }

    Exception.shadowConstructor = function () {
        // Define these data properties here, so they are always defined for any derived class of Exception,
        // regardless of whether a parent constructor call is used or not. It will not be visible to PHP code
        // except for read-only via the ->getLine() method.
        this.setInternalProperty('file', callStack.getLastFilePath());
        this.setInternalProperty('line', callStack.getLastLine());
        // Unless overridden by calling the constructor defined above
        this.setInternalProperty('messageValue', valueFactory.createString(''));
        this.setInternalProperty('trace', callStack.getTrace());
    };

    util.inherits(Exception, PHPError);

    _.extend(Exception.prototype, {
        /**
         * Fetches the path to the file containing the line this exception was created from
         * (not the line it was thrown from, if it was thrown at all)
         *
         * @see {@link https://secure.php.net/manual/en/exception.getfile.php}
         *
         * @returns {StringValue}
         */
        getFile: function () {
            return valueFactory.createString(this.getInternalProperty('file'));
        },

        /**
         * Fetches the line number this exception was created on
         * (not the line it was thrown from, if it was thrown at all)
         *
         * @see {@link https://secure.php.net/manual/en/exception.getline.php}
         *
         * @returns {IntegerValue}
         */
        getLine: function () {
            return valueFactory.createInteger(this.getInternalProperty('line'));
        },

        /**
         * Fetches the message for the exception
         *
         * @see {@link https://secure.php.net/manual/en/exception.getmessage.php}
         *
         * @returns {StringValue}
         */
        getMessage: function () {
            return this.getInternalProperty('messageValue');
        },

        /**
         * Gets the stack trace as a string
         *
         * @see {@link https://secure.php.net/manual/en/exception.gettraceasstring.php}
         *
         * @returns {StringValue}
         */
        getTraceAsString: function () {
            var trace = this.getInternalProperty('trace'),
                traceStrings = [];

            trace.pop(); // Drop the current/most recent call, ->getTraceAsString() does not include it

            _.each(trace, function (callData) {
                // Convert arguments to a string representation
                var args = _.map(callData.args, function (argValue) {
                    return argValue.formatAsString();
                });

                traceStrings.push(
                    '#' + callData.index + ' ' + callData.file + '(' + callData.line + '): ' +
                    callData.func + '(' + args.join(', ') + ')'
                );
            });

            traceStrings.push('#' + trace.length + ' {main}');

            return valueFactory.createString(traceStrings.join('\n'));
        }
    });

    internals.disableAutoCoercion();

    return Exception;
};
