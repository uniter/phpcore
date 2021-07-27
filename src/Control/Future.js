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
    Exception = phpCommon.Exception;

/**
 * ...
 *
 * @param {FutureFactory} futureFactory
 * @param {PauseFactory} pauseFactory
 * @param {Sequence} sequence
 * @constructor
 */
function Future(futureFactory, pauseFactory, sequence) {
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {PauseFactory}
     */
    this.pauseFactory = pauseFactory;
    /**
     * @type {Sequence}
     */
    this.sequence = sequence;
}

_.extend(Future.prototype, {
    /**
     * Attaches a callback to be called when the value evaluation resulted in an error.
     *
     * @param {Function} rejectHandler
     * @returns {Future}
     */
    catch: function (rejectHandler) {
        var future = this;

        future.sequence.catch(rejectHandler);

        return future; // Fluent interface
    },

    /**
     * Derives a new future from this one that will be resumed/thrown-into
     * once the future value (or error result) is known.
     *
     * @returns {Future}
     */
    derive: function () {
        var future = this;

        return future.futureFactory.deriveFuture(future.sequence);
    },

    /**
     * Attaches a callback to be called when the value has been evaluated regardless of result or error.
     *
     * @param {Function} finallyHandler
     * @returns {Future}
     */
    finally: function (finallyHandler) {
        var future = this;

        future.sequence.finally(finallyHandler);

        return future; // Fluent interface
    },

    /**
     * Attaches callbacks for when the value has been evaluated to either a result or error.
     *
     * @param {Function} resumeHandler
     * @returns {Future}
     */
    next: function (resumeHandler, catchHandler) {
        var future = this;

        future.sequence.next(resumeHandler, catchHandler);

        return future; // Fluent interface
    },

    /**
     * Performs a Pause for this future, to allow it to be resolved to a present value or error
     * before execution is resumed. Note that all call ancestors will need to handle the pause,
     * either via the Flow methods or by manually catching and handling Pause errors.
     *
     * @returns {*}
     * @throws {Pause}
     */
    yield: function () {
        var future = this,
            pause;

        if (future.sequence.isCompleted()) {
            return future.sequence.yieldSync();
        }

        pause = future.pauseFactory.createPause(function (resume, throwInto/*, restoreCallStack*/) {
            future.next(
                function (resultValue) {
                    resume(resultValue);

                    return resultValue;
                },
                function (error) {
                    throwInto(error);

                    throw error;
                }
            );
        });

        pause.now();
    },

    /**
     * Fetches the present value synchronously, which is not possible for an incomplete future
     *
     * @returns {*} When the future was resolved
     * @throws {Error} When the future was rejected
     * @throws {Exception} When the future is still pending
     */
    yieldSync: function () {
        var future = this;

        if (future.sequence.isCompleted()) {
            return future.sequence.yieldSync();
        }

        throw new Exception('Cannot synchronously yield a pending Future');
    }
});

module.exports = Future;
