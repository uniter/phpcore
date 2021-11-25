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
    Exception = phpCommon.Exception,
    Promise = require('lie');

/**
 * ...
 *
 * @param {FutureFactory} futureFactory
 * @param {PauseFactory} pauseFactory
 * @param {ValueFactory} valueFactory
 * @param {Sequence} sequence
 * @constructor
 */
function Future(
    futureFactory,
    pauseFactory,
    valueFactory,
    sequence
) {
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
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(Future.prototype, {
    /**
     * Derives a FutureValue from this future
     *
     * @returns {FutureValue}
     */
    asValue: function () {
        var future = this;

        return future.valueFactory.deriveFuture(future);
    },

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
     * Derives a promise of this future (shared interface with Value)
     *
     * @returns {Promise<*>}
     */
    toPromise: function () {
        var future = this;

        return new Promise(function (resolve, reject) {
            future.derive().next(resolve, reject);
        });
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
