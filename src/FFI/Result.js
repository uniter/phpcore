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
 * @param {Function} syncCallback
 * @param {Function=} asyncCallback
 * @param {Resumable=} pausable
 * @constructor
 */
function Result(syncCallback, asyncCallback, pausable) {
    /**
     * @type {Function|null}
     */
    this.asyncCallback = asyncCallback;
    /**
     * @type {Resumable|null}
     */
    this.pausable = pausable || null;
    /**
     * @type {Function}
     */
    this.syncCallback = syncCallback;
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
     * @param {ValueFactory} valueFactory
     * @return {Value}
     */
    resolve: function (valueFactory) {
        var result = this,
            pause;

        if (!result.pausable) {
            /**
             * We're in either sync or psync mode - use the synchronous fetcher
             * as we are unable to wait for an asynchronous operation to complete.
             * Remember that we still need to coerce the result as needed,
             * in case the fetcher returns an unwrapped native JS value.
             */
            return valueFactory.coerce(result.getSync());
        }

        pause = result.pausable.createPause();

        // Wait for the returned promise to resolve or reject before continuing
        result.getAsync().then(function (resultValue) {
            // Remember we still need to coerce the result as above
            pause.resume(valueFactory.coerce(resultValue));
        }, function (error) {
            pause.throw(error);
        });

        return pause.now();
    }
});

module.exports = Result;
