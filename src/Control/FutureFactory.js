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
    Pause = require('./Pause');

/**
 * @param {ControlFactory} controlFactory
 * @param {PauseFactory} pauseFactory
 * @param {ValueFactory} valueFactory
 * @param {ControlBridge} controlBridge
 * @param {class} Future
 * @constructor
 */
function FutureFactory(
    controlFactory,
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
     * @type {ControlFactory}
     */
    this.controlFactory = controlFactory;
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
     * Creates a new Future
     *
     * @param {Function} executor
     * @returns {Future}
     */
    createFuture: function (executor) {
        var factory = this,
            // savedCallStack = factory.callStack.save(),
            sequence = factory.controlFactory.createSequence(),
            reject = function reject(error) {
                // factory.callStack.restore(savedCallStack);

                sequence.throwInto(error);
            },
            resolve = function resolve(result) {
                // factory.callStack.restore(savedCallStack);

                sequence.resume(result);
            };

        try {
            executor(resolve, reject);
        } catch (error) {
            if (error instanceof Pause) {
                throw new Exception('Unexpected Pause raised by Future executor');
            }

            // Any errors raised during evaluation of the Future executor should reject the Future
            reject(error);
        }

        return new factory.Future(factory, factory.pauseFactory, factory.valueFactory, sequence);
    },

    /**
     * Creates a new present Future for the given value
     *
     * TODO: Reinstate an actual lightweight Present class to avoid creating Sequences when unnecessary
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
    },

    /**
     * Derives a new Future from an existing Sequence
     *
     * @param {Sequence} sequence
     * @returns {Future}
     */
    deriveFuture: function (sequence) {
        var factory = this,
            derivedSequence = factory.controlFactory.createSequence();

        sequence.next(
            function (result) {
                return derivedSequence.resume(result);
            },
            function (error) {
                return derivedSequence.throwInto(error);
            }
        );

        return new factory.Future(factory, factory.pauseFactory, factory.valueFactory, derivedSequence);
    }
});

module.exports = FutureFactory;
