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
    Pause = require('./Pause');

/**
 * Abstraction for flow control within the runtime, allowing for simpler syntax
 * where asynchronous Pauses should be allowed when in async mode.
 *
 * @param {ControlFactory} controlFactory
 * @param {ControlBridge} controlBridge
 * @param {ControlScope} controlScope
 * @param {FutureFactory} futureFactory
 * @param {string} mode
 * @constructor
 */
function Flow(controlFactory, controlBridge, controlScope, futureFactory, mode) {
    /**
     * @type {ControlBridge}
     */
    this.controlBridge = controlBridge;
    /**
     * @type {ControlFactory}
     */
    this.controlFactory = controlFactory;
    /**
     * @type {ControlScope}
     */
    this.controlScope = controlScope;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {string}
     */
    this.mode = mode;
}

_.extend(Flow.prototype, {
    /**
     * Returns the provided Future(Value) or wraps any other value in a Future to provide
     * a consistent chainable interface.
     *
     * @param {Future|*} value
     * @returns {Future|Value}
     */
    chainify: function (value) {
        var flow = this;

        return flow.controlBridge.isChainable(value) ?
            value :
            flow.futureFactory.createPresent(value);
    },

    /**
     * Iterates over the given inputs, calling the given handler with each one.
     * If any call to the handler pauses, iteration will continue once the pause is resumed.
     * If the handler returns false synchronously or asynchronously (via a pause resume),
     * iteration will be stopped.
     * In that scenario, the sequence will still continue calling any further handlers
     * attached outside this method.
     * Throwing an error from the handler or calling throwInto() asynchronously will also
     * stop iteration, calling any catch handlers attached outside this method.
     *
     * @param {*[]} inputs
     * @param {Function} handler
     * @returns {Future}
     */
    eachAsync: function (inputs, handler) {
        var flow = this,
            inputIndex = 0,
            pendingInputs = [].slice.call(inputs);

        function checkNext() {
            var sequence = flow.controlFactory.createSequence();

            if (pendingInputs.length === 0) {
                // We've finished iterating over all the inputs
                return sequence;
            }

            return sequence
                .next(function () {
                    var input = pendingInputs.shift();

                    return handler(input, inputIndex++);
                })
                .next(function (handlerResult) {
                    if (handlerResult === false) {
                        // The handler returned false either synchronously or asynchronously, stop iteration
                        return handlerResult;
                    }

                    return checkNext().resume(handlerResult);
                });
        }

        return flow.futureFactory.createFuture(function (resolve, reject) {
            checkNext()
                .next(resolve, reject)
                .resume();
        });
    },

    /**
     * Maps the given array of inputs to a Sequence via the given handler, allowing for Futures.
     *
     * @param {*[]} inputs
     * @param {Function} handler
     * @returns {Future}
     */
    mapAsync: function (inputs, handler) {
        var flow = this,
            pendingInputs = [].slice.call(inputs),
            results = [];

        function checkNext() {
            var sequence = flow.controlFactory.createSequence();

            if (pendingInputs.length === 0) {
                // We've finished iterating over all the inputs
                return sequence;
            }

            return sequence
                .next(function () {
                    var input = pendingInputs.shift();

                    return handler(input);
                })
                .next(function (result) {
                    results.push(result);

                    return checkNext().resume();
                });
        }

        return flow.futureFactory.createFuture(function (resolve, reject) {
            checkNext()
                .next(function () {
                    // Pass the final array of all results through to the next handler in the sequence
                    resolve(results);
                }, reject)
                .resume();
        });
    },

    /**
     * Executes the given callback, which is expected to make a tail-call that may pause
     * in async mode. If it pauses then the pause will be intercepted and turned into a pending Future,
     * otherwise a resolved or rejected Future as appropriate.
     *
     * @param {Function} executor
     * @param {Function=} pauser Called if a pause is intercepted
     * @returns {Future|Value}
     */
    maybeFuturise: function (executor, pauser) {
        var flow = this,
            result;

        if (flow.mode !== 'async') {
            try {
                return flow.chainify(executor());
            } catch (error) {
                return flow.futureFactory.createRejection(error);
            }
        }

        /**
         * A pause or error occurred. Note that the error thrown could be a Future(Value),
         * in which case we need to yield to it so that a pause occurs if required.
         *
         * @param {Error|Future|FutureValue|Pause} error
         * @returns {Future}
         */
        function handlePauseOrError(error) {
            if (flow.controlBridge.isFuture(error)) {
                // Special case: the thrown error is itself a Future(Value), so we need
                // to yield to it to either resolve it to the eventual error or pause.
                try {
                    error = error.yield();
                } catch (furtherError) {
                    return handlePauseOrError(furtherError);
                }
            }

            if (!(error instanceof Pause)) {
                // A normal non-pause error was raised, simply rethrow.

                if (flow.mode !== 'async') {
                    // For synchronous modes, rethrow synchronously.
                    throw error;
                }

                // For async mode, return a rejected FutureValue.
                return flow.futureFactory.createRejection(error);
            }

            if (pauser) {
                pauser(error);
            }

            // We have intercepted a pause - it must be marked as complete so that the future
            // we will create is able to raise its own pause.
            flow.controlScope.markPaused(error);

            return flow.futureFactory.createFuture(function (resolve, reject) {
                error.next(resolve, reject);
            });
        }

        try {
            result = executor();
        } catch (error) {
            return handlePauseOrError(error);
        }

        return flow.chainify(result);
    }
});

module.exports = Flow;
