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
    FFIResult = require('../FFI/Result'),
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
     * Takes the given array of values and settles any Future(Values).
     *
     * @param {Future[]|Value[]|*[]} values
     * @returns {Future<Value[]|*[]>}
     */
    all: function (values) {
        var flow = this,
            settledValues = [],
            totalValues = values.length,
            valueIndex = 0;

        return flow.futureFactory.createFuture(function (resolve, reject) {
            /*jshint latedef: false */

            function onFulfill(resolvedResult) {
                settledValues.push(resolvedResult);

                checkNext();
            }

            function checkNext() {
                var value;

                // Handle any run of non-Future(Value) values in a loop for speed.
                while (valueIndex < totalValues) {
                    value = values[valueIndex++];

                    if (flow.controlBridge.isFuture(value)) {
                        value.nextIsolated(onFulfill, reject);
                        return;
                    }

                    settledValues.push(value);
                }

                resolve(settledValues);
            }

            checkNext();
        });
    },

    /**
     * Returns the provided Future(Value) or wraps any other value in a Future to provide
     * a consistent chainable interface.
     *
     * @param {Future|*} value
     * @returns {Future|Value}
     */
    chainify: function (value) {
        var flow = this;

        if (flow.controlBridge.isChainable(value)) {
            return value;
        }

        if (value instanceof FFIResult) {
            return value.resolve();
        }

        return flow.futureFactory.createPresent(value);
    },

    /**
     * Creates a new present Future for the given value.
     *
     * @param {*} value
     * @returns {Future}
     */
    createPresent: function (value) {
        return this.futureFactory.createPresent(value);
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
            lastHandlerResult,
            pendingInputs = [].slice.call(inputs);

        function checkNext() {
            var future = flow.futureFactory.createPresent();

            if (pendingInputs.length === 0) {
                // We've finished iterating over all the inputs.
                return future;
            }

            return future
                .next(function () {
                    var input = pendingInputs.shift(),
                        index = inputIndex++;

                    if (flow.controlBridge.isFuture(input)) {
                        // Input is itself a future, so settle it first.
                        return input.next(function (presentInput) {
                            return handler(presentInput, index);
                        });
                    }

                    return handler(input, index);
                })
                .next(function (handlerResult) {
                    if (handlerResult === false) {
                        // The handler returned false either synchronously or asynchronously, stop iteration.
                        return handlerResult;
                    }

                    lastHandlerResult = handlerResult;

                    return checkNext();
                });
        }

        return flow.futureFactory.createFuture(function (resolve, reject) {
            checkNext()
                .next(function () {
                    // Use the result from the last handler invocation as the overall result.
                    resolve(lastHandlerResult);
                }, reject);
        });
    },

    /**
     * Iterates over enumerable own properties of the given input, calling the given handler with each one.
     * If any call to the handler pauses, iteration will continue once the pause is resumed.
     * If the handler returns false synchronously or asynchronously (via a pause resume),
     * iteration will be stopped.
     * In that scenario, the sequence will still continue calling any further handlers
     * attached outside this method.
     * Throwing an error from the handler or calling throwInto() asynchronously will also
     * stop iteration, calling any catch handlers attached outside this method.
     *
     * @param {Object} input
     * @param {Function} handler
     * @returns {Future}
     */
    forOwnAsync: function (input, handler) {
        var flow = this;

        return flow.eachAsync(Object.keys(input), function (propertyName, index) {
            var propertyValue = input[propertyName];

            if (flow.controlBridge.isFuture(propertyValue)) {
                // Property value is itself a future, so settle it first.
                return propertyValue.next(function (presentInput) {
                    return handler(presentInput, index);
                });
            }

            return handler(propertyValue, propertyName);
        });
    },

    /**
     * Maps the given array of inputs to a Future via the given handler, settling any intermediate Futures.
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
            var future = flow.futureFactory.createPresent();

            if (pendingInputs.length === 0) {
                // We've finished iterating over all the inputs.
                return future;
            }

            return future
                .next(function () {
                    var input = pendingInputs.shift();

                    if (flow.controlBridge.isFuture(input)) {
                        // Input is itself a future, so settle it first.
                        return input.next(function (presentInput) {
                            return handler(presentInput);
                        });
                    }

                    return handler(input);
                })
                .next(function (result) {
                    results.push(result);

                    return checkNext();
                });
        }

        return flow.futureFactory.createFuture(function (resolve, reject) {
            checkNext()
                .next(function () {
                    // Pass the final array of all results through to the next handler in the sequence.
                    resolve(results);
                }, reject);
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
