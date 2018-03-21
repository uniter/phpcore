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
     * Base class for all user Exceptions
     *
     * @see {@link https://secure.php.net/manual/en/class.exception.php}
     * @see {@link https://secure.php.net/manual/en/exception.construct.php}
     *
     * @param {Value} messageValue
     * @constructor
     */
    function Exception(messageValue) {
        /**
         * The internal `trace` property is defined by the shadow constructor.
         *
         * If this class is extended but a parent constructor call is not used,
         * then no parent constructor will be called (even this native constructor function).
         *
         * To run code regardless of whether the parent constructor is called, we use
         * a "shadow constructor", defined below.
         */

        // The default exception message is the empty string
        this.setProperty('message', messageValue || valueFactory.createString(''));
    }

    Exception.shadowConstructor = function () {
        // Define these data properties here, so they are always defined for any derived class of Exception,
        // regardless of whether a parent constructor call is used or not

        /**
         * The file the exception was created inside
         *
         * @see {@link https://secure.php.net/manual/en/class.exception.php#exception.props.file}
         */
        this.setProperty('file', valueFactory.createString(callStack.getLastFilePath()));

        /**
         * The line the exception was created on
         *
         * @see {@link https://secure.php.net/manual/en/class.exception.php#exception.props.line}
         */
        this.setProperty('line', valueFactory.createInteger(callStack.getLastLine()));

        /**
         * A message describing the exception
         *
         * (Default to empty here - unless overridden by calling the constructor defined above
         * or overridden by a subclass)
         *
         * @see {@link https://secure.php.net/manual/en/class.exception.php#exception.props.message}
         */
        this.setProperty('message', valueFactory.createString(''));

        // This internal trace prop will not be visible to PHP code
        // except for read-only via the ->getTraceAsString() method.
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
            return this.getProperty('file');
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
            return this.getProperty('line');
        },

        /**
         * Fetches the message for the exception
         *
         * @see {@link https://secure.php.net/manual/en/exception.getmessage.php}
         *
         * @returns {StringValue}
         */
        getMessage: function () {
            return this.getProperty('message');
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
