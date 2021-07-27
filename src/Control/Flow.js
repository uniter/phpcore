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
    Pause = require('./Pause'),
    Promise = require('lie');

/**
 * Abstraction for flow control within the runtime, allowing for simpler syntax
 * where asynchronous Pauses should be allowed when in async mode.
 *
 * @param {ControlFactory} controlFactory
 * @param {ControlBridge} controlBridge
 * @param {ControlScope} controlScope
 * @param {string} mode
 * @constructor
 */
function Flow(controlFactory, controlBridge, controlScope, mode) {
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
     * FutureFactory service, injected by .setFutureFactory(...)
     *
     * @type {FutureFactory|null}
     */
    this.futureFactory = null;
    /**
     * @type {string}
     */
    this.mode = mode;
}

_.extend(Flow.prototype, {
    /**
     * Returns the provided Future or wraps any other value in a Present to provide
     * a consistent chainable interface.
     *
     * @param {Future|*} value
     * @returns {Future|Present}
     */
    await: function (value) {
        var flow = this;

        return flow.controlBridge.isChainable(value) ?
            value :
            flow.futureFactory.createPresent(value);
    },

    callAsync: function (handler, args) {
        var flow = this;

        return new Promise(function (resolve, reject) {
            try {
                flow
                    .try(function () {
                        return handler.apply(null, args);
                    })
                    .next(function (result) {
                        if (flow.controlBridge.isChainable(result)) {
                            return result.yield();
                        }

                        return result;
                    })
                    .next(function (result) {
                        resolve(result);

                        return result;
                    }, function (error) {
                        reject(error);

                        throw error;
                    })
                    .go();
            } catch (error) {
                if (error instanceof Pause) {
                    // Swallow pauses so the promise is not rejected with them -
                    // we only want to resolve or reject the promise with the async result

                    flow.controlScope.markPaused(error); // Call stack should be unwound by this point
                } else {
                    // Do not swallow any other types of error, eg. native TypeErrors
                    throw error;
                }
            }
        });
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

                    return handler(input);
                })
                .next(function (handlerResult) {
                    if (handlerResult === false) {
                        // The handler returned false either synchronously or asynchronously, stop iteration
                        return handlerResult;
                    }

                    return checkNext().resume();
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
     * in async mode. If it pauses then the pause will be intercepted and turned into a FutureValue,
     * otherwise the result will be coerced to a Value.
     *
     * Note that a similar method for Values is provided by ValueFactory.
     *
     * @param {Function} executor
     * @returns {Future}
     * @throws {Error} Throws on synchronous non-pause error
     */
    maybeFuturise: function (executor) {
        var flow = this,
            result;

        if (flow.mode !== 'async') {
            return flow.futureFactory.createPresent(executor());
        }

        try {
            result = executor();
        } catch (error) {
            if (!(error instanceof Pause)) {
                // A normal non-pause error was raised, simply rethrow

                if (flow.mode !== 'async') {
                    // For synchronous modes, rethrow synchronously
                    throw error;
                }

                // For async mode, return a rejection
                return flow.futureFactory.createRejection(error);
            }

            // We have intercepted a pause - it must be marked as complete so that the future
            // we will create is able to raise its own pause
            flow.controlScope.markPaused(error);

            return flow.futureFactory.createFuture(function (resolve, reject) {
                error.next(resolve, reject);
            });
        }

        return flow.controlBridge.isChainable(result) ?
            result :
            flow.futureFactory.createPresent(result);
    },

    /**
     * Injects the FutureFactory service. Required due to a circular dependency.
     *
     * @param {FutureFactory} futureFactory
     */
    setFutureFactory: function (futureFactory) {
        this.futureFactory = futureFactory;
    },

    /**
     * Convenience method for creating a Sequence with the given .next(...) handler.
     *
     * Allows the following pattern, inspired by both Promises and native try..catch..finally:
     *     "flow.try(() => {...}).next(() => {}).finally({} => {}).go();"
     *
     * @param {Function} handler
     * @returns {Sequence}
     */
    try: function (handler) {
        return this.controlFactory.createSequence().next(handler);
    }
});

module.exports = Flow;
