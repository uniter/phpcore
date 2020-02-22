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

module.exports = function (internals) {
    var callStack = internals.callStack,
        traceFormatter = internals.traceFormatter,
        valueFactory = internals.valueFactory;

    /**
     * Base class for all internal non-warning/non-notice Errors
     *
     * @see {@link https://secure.php.net/manual/en/class.error.php}
     * @see {@link https://secure.php.net/manual/en/error.construct.php}
     *
     * @param {Reference|Value|Variable=} messageReference
     * @constructor
     */
    function Error(messageReference) {
        var messageValue = messageReference ?
                messageReference.getValue() :
                valueFactory.createString('');

        /**
         * The internal `line` property is defined by the shadow constructor.
         *
         * If this class is extended but a parent constructor call is not used,
         * then no parent constructor will be called (even this native constructor function).
         *
         * To run code regardless of whether the parent constructor is called, we use
         * a "shadow constructor", defined below.
         */

        /**
         * A message describing the error
         *
         * (Default to empty here - unless overridden by calling the constructor defined above
         * or overridden by a subclass)
         *
         * @see {@link https://secure.php.net/manual/en/class.error.php#error.props.message}
         */
        this.setProperty('message', messageValue);
    }

    Error.shadowConstructor = function () {
        // Define these data properties here, so they are always defined for any derived class of error,
        // regardless of whether a parent constructor call is used or not

        /**
         * The file the error was created inside
         *
         * @see {@link https://secure.php.net/manual/en/class.error.php#error.props.file}
         */
        this.setProperty('file', valueFactory.coerce(callStack.getLastFilePath()));

        /**
         * The line the error was created on
         *
         * @see {@link https://secure.php.net/manual/en/class.error.php#error.props.line}
         */
        this.setProperty('line', valueFactory.coerce(callStack.getLastLine()));

        /**
         * A message describing the error
         *
         * (Default to empty here - unless overridden by calling the constructor defined above
         * or overridden by a subclass)
         *
         * @see {@link https://secure.php.net/manual/en/class.error.php#error.props.message}
         */
        this.setProperty('message', valueFactory.createString(''));

        this.setInternalProperty('reportsOwnContext', false);

        // This internal trace prop will not be visible to PHP code
        // except for read-only via the ->getTraceAsString() method.
        this.setInternalProperty('trace', callStack.getTrace());
    };

    // Error class should implement Throwable in PHP 7+
    internals.implement('Throwable');

    _.extend(Error.prototype, {
        /**
         * Fetches the path to the file containing the line this error was created from
         * (not the line it was thrown from, if it was thrown at all)
         *
         * @see {@link https://secure.php.net/manual/en/error.getfile.php}
         *
         * @returns {StringValue}
         */
        getFile: function () {
            return this.getProperty('file');
        },

        /**
         * Fetches the line number this error was created on
         * (not the line it was thrown from, if it was thrown at all)
         *
         * @see {@link https://secure.php.net/manual/en/error.getline.php}
         *
         * @returns {IntegerValue}
         */
        getLine: function () {
            return this.getProperty('line');
        },

        /**
         * Fetches the message for the error
         *
         * @see {@link https://secure.php.net/manual/en/error.getmessage.php}
         *
         * @returns {StringValue}
         */
        getMessage: function () {
            return this.getProperty('message');
        },

        /**
         * Gets the stack trace as a string
         *
         * @see {@link https://secure.php.net/manual/en/error.gettraceasstring.php}
         *
         * @returns {StringValue}
         */
        getTraceAsString: function () {
            var trace = this.getInternalProperty('trace');

            return valueFactory.createString(traceFormatter.format(trace));
        }
    });

    internals.disableAutoCoercion();

    return Error;
};
