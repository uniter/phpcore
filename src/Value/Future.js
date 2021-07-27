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
    util = require('util'),
    Value = require('../Value').sync();

/**
 * ...
 *
 * @param {ValueFactory} factory
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {CallStack} callStack
 * @param {Future} future
 * @constructor
 */
function FutureValue(
    factory,
    referenceFactory,
    futureFactory,
    callStack,
    future
) {
    Value.call(this, factory, referenceFactory, futureFactory, callStack, 'future', null);

    /**
     * @type {Future}
     */
    this.future = future;
}

util.inherits(FutureValue, Value);

_.extend(FutureValue.prototype, {
    /**
     * {@inheritdoc}
     */
    add: function (rightValue) {
        return this.derive().next(function (leftValue) {
            return leftValue.add(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    asEventualNative: function () {
        return this.future;
    },

    /**
     * {@inheritdoc}
     */
    bitwiseAnd: function (rightValue) {
        return this.derive().next(function (leftValue) {
            return leftValue.bitwiseAnd(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    bitwiseOr: function (rightValue) {
        return this.derive().next(function (leftValue) {
            return leftValue.bitwiseOr(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    bitwiseXor: function (rightValue) {
        return this.derive().next(function (leftValue) {
            return leftValue.bitwiseXor(rightValue);
        });
    },

    /**
     * Attaches a callback to be called when the value evaluation resulted in an error.
     *
     * @param {Function} rejectHandler
     * @returns {Future}
     */
    catch: function (rejectHandler) {
        var value = this;

        value.future.catch(rejectHandler);

        return value; // Fluent interface
    },

    /**
     * {@inheritdoc}
     */
    coerceToString: function () {
        return this.derive().next(function (presentValue) {
            return presentValue.coerceToString();
        });
    },

    /**
     * {@inheritdoc}
     */
    concat: function (rightValue) {
        return this.derive().next(function (leftValue) {
            return leftValue.concat(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    derive: function () {
        var value = this;

        return value.factory.deriveFuture(value.future);
    },

    /**
     * {@inheritdoc}
     */
    divideBy: function (rightValue) {
        return this.derive().next(function (leftValue) {
            return leftValue.divideBy(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    finally: function (finallyHandler) {
        var value = this;

        value.future.finally(finallyHandler);

        return value;
    },

    /**
     * {@inheritdoc}
     */
    getNative: function () {
        // Note that .yieldSync() will error if the future is still pending
        return this.future.yieldSync().getNative();
    },

    /**
     * {@inheritdoc}
     */
    getType: function () {
        // Note that .yieldSync() will error if the future is still pending
        return this.future.yieldSync().getType();
    },

    /**
     * {@inheritdoc}
     */
    isEmpty: function () {
        // TODO: Test me?
        return this.derive().next(function (resultValue) {
            return resultValue.isEmpty();
        });
    },

    /**
     * {@inheritdoc}
     */
    isEqualTo: function (rightValue) {
        // TODO: Test me?
        return this.derive().next(function (leftValue) {
            return leftValue.isEqualTo(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    isFuture: function () {
        return true;
    },

    /**
     * {@inheritdoc}
     */
    isSet: function () {
        // TODO: Test me?
        return this.derive().next(function (resultValue) {
            return resultValue.isSet();
        });
    },

    /**
     * {@inheritdoc}
     */
    multiplyBy: function (rightValue) {
        return this.derive().next(function (leftValue) {
            return leftValue.multiplyBy(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    next: function (resumeHandler, catchHandler) {
        var value = this;

        value.future.next(resumeHandler, catchHandler);

        return value;
    },

    /**
     * {@inheritdoc}
     */
    shiftLeft: function (rightValue) {
        return this.derive().next(function (leftValue) {
            return leftValue.shiftLeft(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    shiftRight: function (rightValue) {
        return this.derive().next(function (leftValue) {
            return leftValue.shiftRight(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    subtract: function (rightValue) {
        return this.derive().next(function (leftValue) {
            return leftValue.subtract(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    yield: function () {
        return this.future.yield();
    },

    /**
     * Fetches the present value synchronously, which is not possible for an incomplete future
     *
     * @returns {Value} When the future was resolved
     * @throws {Error} When the future was rejected
     * @throws {Exception} When the future is still pending
     */
    yieldSync: function () {
        return this.future.yieldSync();
    }
});

module.exports = FutureValue;
