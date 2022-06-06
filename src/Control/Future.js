/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

/* jshint latedef: false */
'use strict';

var _ = require('microdash'),
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception,
    Pause = require('./Pause'),
    Promise = require('lie'),

    /**
     * Calls the executor for the given Future, providing resolve and rejection callbacks.
     *
     * @param {Future} future
     * @param {Function} executor
     */
    execute = function (future, executor) {
        var resumeCoroutine = function () {
                // Restore the call stack if applicable (if we were paused in async mode).
                future.controlScope.resumeCoroutine(future.coroutine);
            },
            reject = function (error) {
                if (future.settled) {
                    throw new Exception('Cannot reject an already-settled Future');
                }

                // Restore the call stack if applicable (if we were paused in async mode).
                resumeCoroutine();

                if (future.controlBridge.isFuture(error)) {
                    // Evaluate any futures to the eventual error before continuing
                    // (note that we call reject() with the resolved error, unlike the logic in resolve()).
                    error.next(reject, reject);
                    return;
                }

                future.eventualError = error;
                future.settled = true;

                // TODO: Check for future.onRejectCallbacks.length === 0 and throw "Uncaught Future rejection" error?

                future.onRejectCallbacks.forEach(function (callback) {
                    callback(error);
                });

                // Clear both lists to free memory.
                future.onRejectCallbacks.length = 0;
                future.onResolveCallbacks.length = 0;
            },
            resolve = function (result) {
                if (future.settled) {
                    throw new Exception('Cannot resolve an already-settled Future');
                }

                // Restore the call stack if applicable (if we were paused in async mode).
                resumeCoroutine();

                if (future.controlBridge.isFuture(result)) {
                    // Resolve any result that is itself a Future before continuing.
                    result.next(resolve, reject);
                    return;
                }

                future.eventualResult = result;
                future.settled = true;

                // TODO: Check for future.onResolveCallbacks.length === 0 and throw "Unhandled Future resolve" error?

                future.onResolveCallbacks.forEach(function (callback) {
                    callback(result);
                });

                // Clear both lists to free memory.
                future.onRejectCallbacks.length = 0;
                future.onResolveCallbacks.length = 0;
            },
            nestCoroutine = function () {
                future.controlScope.nestCoroutine();
            };

        try {
            executor(resolve, reject, nestCoroutine);
        } catch (error) {
            if (error instanceof Pause) {
                throw new Exception('Unexpected Pause raised by Future executor');
            }

            // Any errors raised during evaluation of the Future executor should reject the Future.
            reject(error);
        }
    };

/**
 * Represents a value that may not be known immediately, but should be resolved to an eventual
 * value or rejected with an eventual error at some point in the future.
 *
 * Futures are very similar to Promises, the main difference being that when no pause occurs
 * execution is synchronous to improve performance by not constantly queueing microtasks.
 *
 * @param {FutureFactory} futureFactory
 * @param {PauseFactory} pauseFactory
 * @param {ValueFactory} valueFactory
 * @param {ControlBridge} controlBridge
 * @param {ControlScope} controlScope
 * @param {Function} executor
 * @param {Coroutine} coroutine
 * @constructor
 */
function Future(
    futureFactory,
    pauseFactory,
    valueFactory,
    controlBridge,
    controlScope,
    executor,
    coroutine
) {
    /**
     * @type {ControlBridge}
     */
    this.controlBridge = controlBridge;
    /**
     * @type {ControlScope}
     */
    this.controlScope = controlScope;
    /**
     * @type {Coroutine}
     */
    this.coroutine = coroutine;
    /**
     * The error that the future resolved to, if any.
     *
     * @type {Error|null}
     */
    this.eventualError = null;
    /**
     * The result that the future resolved to, if any.
     *
     * @type {*|null}
     */
    this.eventualResult = null;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {Function[]}
     */
    this.onRejectCallbacks = [];
    /**
     * @type {Function[]}
     */
    this.onResolveCallbacks = [];
    /**
     * @type {PauseFactory}
     */
    this.pauseFactory = pauseFactory;
    /**
     * @type {boolean}
     */
    this.settled = false;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;

    execute(this, executor);
}

_.extend(Future.prototype, {
    /**
     * Coerces to a Future (shared interface with Value).
     *
     * @returns {Future}
     */
    asFuture: function () {
        return this;
    },

    /**
     * Derives a FutureValue from this future.
     *
     * @returns {FutureValue}
     */
    asValue: function () {
        var future = this;

        return future.valueFactory.deriveFuture(future);
    },

    /**
     * Attaches a callback to be called when the value evaluation resulted in an error,
     * returning a new Future to be settled as appropriate.
     *
     * @param {Function} catchHandler
     * @returns {Future}
     */
    catch: function (catchHandler) {
        return this.next(null, catchHandler);
    },

    /**
     * Returns a new Future that will have the given text appended to its resolved value.
     *
     * @param {string} text
     * @returns {Future<string>}
     */
    concatString: function (text) {
        return this.next(function (previousText) {
            return previousText + text;
        });
    },

    /**
     * Attaches a callback to be called when the value has been evaluated regardless of result or error,
     * returning a new Future to be settled as appropriate.
     *
     * @param {Function} finallyHandler
     * @returns {Future}
     */
    finally: function (finallyHandler) {
        var future = this;

        return future.futureFactory.createFuture(
            function (resolve, reject) {
                var doReject = function (error) {
                        var subsequentResult;

                        try {
                            subsequentResult = finallyHandler(error);
                        } catch (subsequentError) {
                            reject(subsequentError);
                            return;
                        }

                        // For a finally handler, ignore its return value and re-throw unless it was non-undefined,
                        // in which case use it as the new result value. This mimics the way native try..catch..finally clauses
                        // are able to override the result by returning, but it is optional.
                        if (typeof subsequentResult === 'undefined') {
                            // Finally handler returned no specific value, so just re-throw the error (just like
                            // a native finally clause would behave if handling an error without returning).
                            reject(error);
                            return;
                        }

                        // Finally handler returned a specific value, so replace the thrown error with a return.
                        resolve(subsequentResult);
                    },
                    doResolve = function (result) {
                        var subsequentResult;

                        try {
                            subsequentResult = finallyHandler(result);
                        } catch (subsequentError) {
                            reject(subsequentError);
                            return;
                        }

                        // For a finally handler, ignore its return value unless it was non-undefined, in which case
                        // use it as the new result value. This mimics the way native try..catch..finally clauses
                        // are able to override the result by returning, but it is optional.
                        if (typeof subsequentResult === 'undefined') {
                            // Finally clause did not return a specific value, so we use the original return value.
                            // This mimics the way a native finally clause would behave when handling a normal return
                            // inside the try, and not containing any return statement inside the finally.
                            resolve(result);
                            return;
                        }

                        // Finally handler returned a specific value, so replace the thrown error with a return.
                        resolve(subsequentResult);
                    };

                if (future.settled) {
                    if (future.eventualError) {
                        doReject(future.eventualError);
                        return;
                    }

                    doResolve(future.eventualResult);

                    return;
                }

                future.onRejectCallbacks.push(doReject);
                future.onResolveCallbacks.push(doResolve);
            },
            future
        );
    },

    /**
     * Determines whether this future is pending (not yet settled by being resolved or rejected).
     *
     * @returns {boolean}
     */
    isPending: function () {
        return !this.isSettled();
    },

    /**
     * Determines whether this future has settled (been resolved or rejected).
     *
     * @returns {boolean}
     */
    isSettled: function () {
        return this.settled;
    },

    /**
     * Attaches callbacks for when the value has been evaluated to either a result or error,
     * returning a new Future to be settled as appropriate.
     *
     * @param {Function} resolveHandler
     * @returns {Future}
     */
    next: function (resolveHandler, catchHandler) {
        var future = this;

        return future.futureFactory.createFuture(
            function (resolve, reject) {
                var doReject = catchHandler ?
                        function (error) {
                            var subsequentResult;

                            try {
                                subsequentResult = catchHandler(error);
                            } catch (subsequentError) {
                                reject(subsequentError);
                                return;
                            }

                            resolve(subsequentResult);
                        } :
                        reject,
                    doResolve = resolveHandler ?
                        function (result) {
                            var subsequentResult;

                            try {
                                subsequentResult = resolveHandler(result);
                            } catch (subsequentError) {
                                reject(subsequentError);
                                return;
                            }

                            // Always use the subsequent result as the overall one
                            // (note that it can be another Future which will then be chained onto)
                            // unlike .finally(...).
                            resolve(subsequentResult);
                        } :
                        resolve;

                if (future.settled) {
                    if (future.eventualError) {
                        doReject(future.eventualError);
                        return;
                    }

                    doResolve(future.eventualResult);

                    return;
                }

                future.onRejectCallbacks.push(doReject);
                future.onResolveCallbacks.push(doResolve);
            },
            future
        );
    },

    /**
     * Attaches a callback for if/when this future is rejected.
     * Note that .next()/.catch()/.finally() should usually be used for chaining,
     * this is a low-level function.
     *
     * @param {Function} callback
     */
    onReject: function (callback) {
        this.onRejectCallbacks.push(callback);
    },

    /**
     * Attaches a callback for if/when this future is resolved.
     * Note that .next()/.catch()/.finally() should usually be used for chaining,
     * this is a low-level function.
     *
     * @param {Function} callback
     */
    onResolve: function (callback) {
        this.onResolveCallbacks.push(callback);
    },

    /**
     * Derives a promise of this future (shared interface with Value)
     *
     * @returns {Promise<*>}
     */
    toPromise: function () {
        var future = this;

        return new Promise(function (resolve, reject) {
            future.next(resolve, reject);
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

        if (future.settled) {
            if (future.eventualError) {
                throw future.eventualError;
            }

            return future.eventualResult;
        }

        pause = future.pauseFactory.createPause(function (resume, throwInto) {
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
     * Fetches the present value synchronously, which is not possible for an unsettled future.
     *
     * @returns {*} When the future was resolved
     * @throws {Error} When the future was rejected
     * @throws {Exception} When the future is still pending
     */
    yieldSync: function () {
        var future = this;

        if (future.settled) {
            if (future.eventualError) {
                throw future.eventualError;
            }

            return future.eventualResult;
        }

        throw new Exception('Cannot synchronously yield a pending Future - did you mean to chain with .next(...)?');
    }
});

module.exports = Future;
