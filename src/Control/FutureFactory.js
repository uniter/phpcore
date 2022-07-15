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
    queueMicrotask = require('core-js-pure/actual/queue-microtask');

/**
 * @param {PauseFactory} pauseFactory
 * @param {ValueFactory} valueFactory
 * @param {ControlBridge} controlBridge
 * @param {ControlScope} controlScope
 * @param {class} Future
 * @constructor
 */
function FutureFactory(
    pauseFactory,
    valueFactory,
    controlBridge,
    controlScope,
    Future
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
     * @type {class}
     */
    this.Future = Future;
    /**
     * @type {PauseFactory}
     */
    this.pauseFactory = pauseFactory;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(FutureFactory.prototype, {
    /**
     * Creates a new Future to be resolved with the given value after deferring.
     *
     * @param {*} value
     * @returns {Future}
     */
    createAsyncPresent: function (value) {
        return this.createFuture(function (resolve) {
            queueMicrotask(function () {
                resolve(value);
            });
        });
    },

    /**
     * Creates a new Future to be rejected with the given error after deferring.
     *
     * @param {Error} error
     * @returns {Future}
     */
    createAsyncRejection: function (error) {
        return this.createFuture(function (resolve, reject) {
            queueMicrotask(function () {
                reject(error);
            });
        });
    },

    /**
     * Creates a new Future
     *
     * @param {Function} executor
     * @returns {Future}
     */
    createFuture: function (executor) {
        var factory = this;

        return new factory.Future(
            factory,
            factory.pauseFactory,
            factory.valueFactory,
            factory.controlBridge,
            factory.controlScope,
            executor,
            factory.controlScope.getCoroutine()
        );
    },

    /**
     * Creates a Future (if required) as the start of a chain,
     * allowing for the initial result to be returned rather than having to call resolve().
     *
     * @param {Function} executor
     * @returns {Future}
     */
    createFutureChain: function (executor) {
        var factory = this,
            result;

        try {
            result = executor();
        } catch (error) {
            return factory.createRejection(error);
        }

        if (factory.controlBridge.isFuture(result)) {
            // Executor returned a Future, so we can return that one and avoid wrapping it in another.
            return result.asFuture();
        }

        // Otherwise we'll have to wrap the result in a new Future.
        return factory.createPresent(result);
    },

    /**
     * Creates a new present Future for the given value
     *
     * @param {*} value
     * @returns {Future}
     */
    createPresent: function (value) {
        return this.createFuture(function (resolve) {
            resolve(value);
        });
    },

    /**
     * Creates a new rejected Future for the given error
     *
     * @param {Error} error
     * @returns {Future}
     */
    createRejection: function (error) {
        return this.createFuture(function (resolve, reject) {
            reject(error);
        });
    }
});

module.exports = FutureFactory;
