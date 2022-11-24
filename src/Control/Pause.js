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
    queueMicrotask = require('core-js-pure/actual/queue-microtask'),
    phpCommon = require('phpcommon'),
    util = require('util'),
    Exception = phpCommon.Exception;

/**
 * Represents a pause in userland execution. Pauses are thrown up the call stack,
 * allowing callbacks to be attached for continuation when the pause is later resumed
 * or thrown-into.
 *
 * @param {CallStack} callStack
 * @param {ControlScope} controlScope
 * @param {Future} future
 * @param {Function} resolveFuture
 * @param {Function} rejectFuture
 * @param {Function} executor
 * @constructor
 */
function Pause(callStack, controlScope, future, resolveFuture, rejectFuture, executor) {
    var pause = this;

    /**
     * Resumes from the pause with a result (successful resume).
     *
     * @param {*} resultValue
     */
    function resume(resultValue) {
        if (!pause.enacted) {
            throw new Exception('Pause has not yet been enacted');
        }

        queueMicrotask(function () {
            resolveFuture(resultValue);
        });
    }

    /**
     * Resumes from the pause with an error (unsuccessful resume).
     *
     * @param {Error} error
     */
    function throwInto(error) {
        if (!pause.enacted) {
            throw new Exception('Pause has not yet been enacted');
        }

        queueMicrotask(function () {
            rejectFuture(error);
        });
    }

    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {ControlScope}
     */
    this.controlScope = controlScope;
    /**
     * @type {boolean}
     */
    this.enacted = false;
    /**
     * @type {Future}
     */
    this.future = future;
    /**
     * @type {string}
     */
    this.message = 'PHPCore Pause Error';

    // Execute, providing callbacks for the eventual resume/continue on success or failure.
    executor(resume, throwInto);
}

util.inherits(Pause, Error);

_.extend(Pause.prototype, {
    /**
     * Attaches a listener to be called if/when the pause is later thrown-into.
     *
     * @param {Function} throwHandler
     * @returns {Pause}
     */
    catch: function (throwHandler) {
        var pause = this;

        // Keep the resulting Future as we want to maintain the sequence when handling Pause callbacks,
        // allowing for further pauses during resume etc.
        pause.future = pause.future.catch(function (error) {
            // Give the stack frame the error to throw, ready for it to resume from that point.
            pause.callStack.throwInto(error);

            return throwHandler(error);
        });

        return pause; // Fluent interface.
    },

    /**
     * Attaches listeners to be called if/when the pause is later resumed or thrown-into.
     *
     * @param {Function} resumeHandler
     * @param {Function} throwHandler
     * @returns {Pause}
     */
    next: function (resumeHandler, throwHandler) {
        var pause = this;

        // Keep the resulting Future as we want to maintain the sequence when handling Pause callbacks,
        // allowing for further pauses during resume etc.
        pause.future = pause.future.next(
            function (resultValue) {
                // Give the stack frame the result, ready for it to resume from that point.
                pause.callStack.resume(resultValue);

                if (!resumeHandler) {
                    return resultValue;
                }

                return resumeHandler(resultValue);
            },
            function (error) {
                // Give the stack frame the error to throw, ready for it to resume from that point.
                pause.callStack.throwInto(error);

                if (!throwHandler) {
                    throw error;
                }

                return throwHandler(error);
            }
        );

        return pause; // Fluent interface.
    },

    /**
     * Performs the pause. This will involve throwing this object as an error.
     */
    now: function () {
        var pause = this;

        if (pause.enacted) {
            throw new Exception('Pause has already been enacted');
        }

        pause.enacted = true;
        pause.controlScope.markPausing(pause);

        throw pause;
    }
});

module.exports = Pause;
