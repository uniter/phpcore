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
    isPromise = require('is-promise'),
    Promise = require('lie');

/**
 * Represents a result returned from JS-land back to PHP-land. This allows
 * a result that may be fetched asynchronously to be used in async mode
 * while also providing a way to fetch it synchronously in sync mode.
 *
 * TODO: Consider getting rid of this class and just creating & returning a FutureValue
 *       directly from PHPState.createFFIResult()?
 *
 * @param {Function} syncCallback
 * @param {Function=} asyncCallback
 * @param {ValueFactory} valueFactory
 * @param {string} mode
 * @constructor
 */
function Result(syncCallback, asyncCallback, valueFactory, mode) {
    /**
     * @type {Function|null}
     */
    this.asyncCallback = asyncCallback;
    /**
     * @type {string}
     */
    this.mode = mode;
    /**
     * @type {Function}
     */
    this.syncCallback = syncCallback;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(Result.prototype, {
    /**
     * Fetches the result asynchronously. If only a synchronous callback is provided,
     * it will be used but then its result will be wrapped in a resolved Promise.
     *
     * @returns {Promise}
     */
    getAsync: function () {
        var promise;

        if (this.asyncCallback) {
            // We have an async callback - it must return a valid Promise (thenable)
            promise = this.asyncCallback();

            if (!isPromise(promise)) {
                throw new Error('Async callback did not return a Promise');
            }

            return promise;
        }

        // Otherwise if no async callback was provided, fall back to using the sync one
        // but maintain the same API by wrapping it in a resolved Promise
        return Promise.resolve(this.getSync());
    },

    /**
     * Fetches the result synchronously
     *
     * @returns {*}
     */
    getSync: function () {
        return this.syncCallback();
    },

    /**
     * Resolves this FFI result to a value, awaiting the Promise
     * returned by the async callback if needed
     *
     * @return {FutureValue|Value}
     */
    resolve: function () {
        var result = this;

        if (result.mode !== 'async') {
            /**
             * We're in either sync or psync mode - use the synchronous fetcher
             * as we are unable to wait for an asynchronous operation to complete.
             * Remember that we still need to coerce the result as needed,
             * in case the fetcher returns an unwrapped native JS value.
             */
            return result.valueFactory.coerce(result.getSync());
        }

        // Wait for the returned promise to resolve or reject before continuing
        return result.valueFactory.createFuture(function (resolve, reject) {
            // var savedCallStack = result.futureFactory.callStack.save();

            // Wait for the returned promise to resolve or reject before continuing
            result.getAsync().then(function (resultValue) {
                // result.futureFactory.callStack.restore(savedCallStack);

                // Note that the result will still be coerced as above
                resolve(resultValue);
            }, function (error) {
                // result.futureFactory.callStack.restore(savedCallStack);

                reject(error);
            });
        });
    }
});

module.exports = Result;
