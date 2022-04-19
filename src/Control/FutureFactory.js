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
 * @param {class} Future
 * @constructor
 */
function FutureFactory(
    pauseFactory,
    valueFactory,
    controlBridge,
    Future
) {
    /**
     * @type {ControlBridge}
     */
    this.controlBridge = controlBridge;
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
     * @param {Future=} parent
     * @returns {Future}
     */
    createFuture: function (executor, parent) {
        var factory = this;

        return new factory.Future(
            factory,
            factory.pauseFactory,
            factory.valueFactory,
            factory.controlBridge,
            executor,
            parent || null
        );
    },

    /**
     * Creates a new present Future for the given value
     *
     * TODO: Reinstate an actual lightweight Present class to avoid the complexity of Futures when unnecessary,
     *       however now that Sequence is defunct, perhaps less of an issue?
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
