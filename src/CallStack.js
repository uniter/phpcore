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
 * @param {Stream} stderr
 * @constructor
 */
function CallStack(stderr) {
    /**
     * @type {Call[]}
     */
    this.calls = [];
    /**
     * @type {Stream}
     */
    this.stderr = stderr;
}

_.extend(CallStack.prototype, {
    /**
     * Fetches the previous Call near the top of the stack, or null if none
     *
     * @returns {Call|null}
     */
    getCaller: function () {
        var chain = this;

        return chain.calls[chain.calls.length - 2] || null;
    },

    /**
     * Fetches the scope of the previous Call near the top of the stack, or null if none
     *
     * @returns {Scope|null}
     */
    getCallerScope: function () {
        var chain = this,
            callerCall = chain.calls[chain.calls.length - 2] || null;

        return callerCall ? callerCall.getScope() : null;
    },

    /**
     * Fetches the current Call on the top of the stack, or null if none
     *
     * @returns {Call|null}
     */
    getCurrent: function () {
        var chain = this;

        return chain.calls[chain.calls.length - 1] || null;
    },

    /**
     * Fetches the path to the file containing the last line of code executed
     *
     * @returns {string|null}
     */
    getLastFilePath: function () {
        return this.getCurrent().getFilePath();
    },

    /**
     * Fetches the number of the last line of code executed
     *
     * @returns {number|null}
     */
    getLastLine: function () {
        return this.getCurrent().getLastLine();
    },

    /**
     * Fetches the class that is currently considered the static context,
     * referenced with static:: in PHP-land
     *
     * @returns {Class|null}
     */
    getStaticClass: function () {
        var call,
            callStack = this,
            index,
            newStaticClass,
            staticClass = null;

        for (index = callStack.calls.length - 1; index >= 0; index--) {
            call = callStack.calls[index];
            newStaticClass = call.getStaticClass();

            if (newStaticClass) {
                staticClass = newStaticClass;

                break;
            }
        }

        return staticClass;
    },

    /**
     * Fetches the ObjectValue that is the current `$this` object
     *
     * @returns {ObjectValue|null}
     */
    getThisObject: function () {
        var currentCall = this.getCurrent();

        if (!currentCall) {
            return null;
        }

        return currentCall.getScope().getThisObject();
    },

    /**
     * Fetches a call stack trace array, with one element for each stack frame (call)
     *
     * @returns {{index: number, file: string, line: number, func: function, args: *[]}[]}
     */
    getTrace: function () {
        var callStack = this,
            trace = [],
            chronoIndex = callStack.calls.length - 1;

        _.each(callStack.calls, function (call, index) {
            trace.unshift({
                // Most recent call should have index 0
                index: chronoIndex--,
                file: call.getFilePath(),
                // Fetch the line number the call _occurred on_, rather than the line
                // last executed inside the called function
                line: index > 0 ? callStack.calls[index - 1].getLastLine() : null,
                func: call.getFunctionName(),
                args: call.getFunctionArgs()
            });
        });

        return trace;
    },

    /**
     * Instruments the current call
     *
     * @param {function} finder
     */
    instrumentCurrent: function (finder) {
        this.getCurrent().instrument(finder);
    },

    /**
     * Removes the current call from the stack
     */
    pop: function () {
        this.calls.pop();
    },

    /**
     * Pushes a new current call onto the top of the stack
     *
     * @param {Call} call
     */
    push: function (call) {
        this.calls.push(call);
    },

    /**
     * Raises an error/warning with the specified level and message
     *
     * @param {string} level One of the PHPError.E_* constants, eg. `PHPError.E_WARNING`
     * @param {string} message String text message representing the error
     */
    raiseError: function (level, message) {
        var call,
            chain = this,
            calls = chain.calls,
            error,
            index;

        // Some constructs like isset(...) should only suppress errors
        // for their own scope
        if (chain.getCurrent().getScope().suppressesOwnErrors()) {
            return;
        }

        for (index = calls.length - 1; index >= 0; --index) {
            call = calls[index];

            if (call.getScope().suppressesErrors()) {
                return;
            }
        }

        error = new PHPError(level, message);

        chain.stderr.write(error.message + '\n');
    }
});

module.exports = CallStack;
