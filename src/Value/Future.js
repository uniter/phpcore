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
    util = require('util'),
    Exception = phpCommon.Exception,
    Promise = require('lie'),
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
        return this.next(function (leftValue) {
            return leftValue.add(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    asEventualNative: function () {
        return this.future.next(function (resultValue) {
            return resultValue.getNative();
        });
    },

    /**
     * {@inheritdoc}
     */
    asFuture: function () {
        return this.future;
    },

    /**
     * {@inheritdoc}
     */
    bitwiseAnd: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.bitwiseAnd(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    bitwiseOr: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.bitwiseOr(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    bitwiseXor: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.bitwiseXor(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    call: function (argReferences) {
        return this
            .asFuture() // Do not wrap result as a value, we may resolve with a reference.
            .next(function (presentValue) {
                return presentValue.call(argReferences);
            });
    },

    /**
     * {@inheritdoc}
     */
    callMethod: function (name, argReferences) {
        return this
            .asFuture() // Do not wrap result as a value, we may resolve with a reference.
            .next(function (presentValue) {
                return presentValue.callMethod(name, argReferences);
            });
    },

    /**
     * Attaches a callback to be called when the value evaluation resulted in an error.
     *
     * @param {Function} rejectHandler
     * @returns {Future}
     */
    catch: function (rejectHandler) {
        return this.next(null, rejectHandler);
    },

    /**
     * Attaches a callback to be called when the value evaluation resulted in an error,
     * but does not return a new Future for chaining.
     *
     * Note that .next()/.catch()/.finally() should usually be used for chaining,
     * this is a low-level function.
     *
     * @param {Function} catchHandler
     */
    catchIsolated: function (catchHandler) {
        this.nextIsolated(null, catchHandler);
    },

    /**
     * {@inheritdoc}
     */
    clone: function () {
        return this.next(function (presentValue) {
            return presentValue.clone();
        });
    },

    /**
     * {@inheritdoc}
     */
    coerceToArray: function () {
        return this.next(function (presentValue) {
            return presentValue.coerceToArray();
        });
    },

    /**
     * {@inheritdoc}
     */
    coerceToBoolean: function () {
        return this.next(function (presentValue) {
            return presentValue.coerceToBoolean();
        });
    },

    /**
     * {@inheritdoc}
     */
    coerceToFloat: function () {
        return this.next(function (presentValue) {
            return presentValue.coerceToFloat();
        });
    },

    /**
     * {@inheritdoc}
     */
    coerceToInteger: function () {
        return this.next(function (presentValue) {
            return presentValue.coerceToInteger();
        });
    },

    /**
     * {@inheritdoc}
     */
    coerceToKey: function () {
        return this.next(function (presentValue) {
            return presentValue.coerceToKey();
        });
    },

    /**
     * {@inheritdoc}
     */
    coerceToObject: function () {
        return this.next(function (presentValue) {
            return presentValue.coerceToObject();
        });
    },

    /**
     * {@inheritdoc}
     */
    coerceToString: function () {
        return this.next(function (presentValue) {
            return presentValue.coerceToString();
        });
    },

    /**
     * {@inheritdoc}
     */
    compareWith: function (rightValue) {
        return this
            .asFuture() // Do not wrap result as a value, we may resolve with a number or null.
            .next(function (leftValue) {
                return leftValue.compareWith(rightValue);
            });
    },

    /**
     * {@inheritdoc}
     */
    concat: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.concat(rightValue);
        });
    },

    /**
     * Returns a new FutureValue that will have the given text appended to its resolved value.
     *
     * @param {string} text
     * @returns {FutureValue<StringValue>}
     */
    concatString: function (text) {
        return this.next(function (presentValue) {
            return presentValue.getNative() + text;
        });
    },

    /**
     * {@inheritdoc}
     */
    convertForBooleanType: function () {
        return this.next(function (presentValue) {
            return presentValue.convertForBooleanType();
        });
    },

    /**
     * {@inheritdoc}
     */
    convertForFloatType: function () {
        return this.next(function (presentValue) {
            return presentValue.convertForFloatType();
        });
    },

    /**
     * {@inheritdoc}
     */
    convertForIntegerType: function () {
        return this.next(function (presentValue) {
            return presentValue.convertForIntegerType();
        });
    },

    /**
     * {@inheritdoc}
     */
    convertForStringType: function () {
        return this.next(function (presentValue) {
            return presentValue.convertForStringType();
        });
    },

    /**
     * {@inheritdoc}
     */
    decrement: function () {
        return this.next(function (presentValue) {
            return presentValue.decrement();
        });
    },

    /**
     * {@inheritdoc}
     */
    divideBy: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.divideBy(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    finally: function (finallyHandler) {
        var value = this;

        return value.factory.deriveFuture(value.future.finally(finallyHandler));
    },

    /**
     * {@inheritdoc}
     */
    formatAsString: function () {
        // TODO: Note that returning this placeholder string may not be very useful, as any context
        //       where this value should be formatted as string should probably have waited for it to be settled.
        //       Consider throwing an exception as for .getNative().
        return '(Future)';
    },

    /**
     * {@inheritdoc}
     */
    getConstantByName: function (name) {
        return this.next(function (presentValue) {
            return presentValue.getConstantByName(name);
        });
    },

    /**
     * {@inheritdoc}
     */
    getElementByKey: function (keyValue) {
        return this
            .asFuture() // Do not wrap result as a value, we expect to resolve with an element reference.
            .next(function (presentValue) {
                return presentValue.getElementByKey(keyValue);
            });
    },

    /**
     * {@inheritdoc}
     */
    getIterator: function () {
        return this
            .asFuture() // Do not wrap result as a value, we may resolve with an ArrayIterator.
            .next(function (leftValue) {
                return leftValue.getIterator();
            });
    },

    /**
     * {@inheritdoc}
     */
    getNative: function () {
        throw new Exception('Unable to call .getNative() on a FutureValue - did you mean to call .yieldSync()?');
    },

    /**
     * {@inheritdoc}
     */
    getPushElement: function () {
        return this
            .asFuture() // Do not wrap result as a value, we expect to resolve with an (object)element reference.
            .next(function (presentValue) {
                return presentValue.getPushElement();
            });
    },

    /**
     * {@inheritdoc}
     */
    getStaticPropertyByName: function (nameValue) {
        return this
            .asFuture() // Do not wrap result as a value, we expect to resolve with a property reference.
            .next(function (leftValue) {
                return leftValue.getStaticPropertyByName(nameValue);
            });
    },

    /**
     * {@inheritdoc}
     */
    increment: function () {
        return this.next(function (presentValue) {
            return presentValue.increment();
        });
    },

    /**
     * {@inheritdoc}
     */
    instantiate: function (argReferences) {
        return this.next(function (presentValue) {
            return presentValue.instantiate(argReferences);
        });
    },

    /**
     * {@inheritdoc}
     */
    isAnInstanceOf: function (classNameReference) {
        return this.next(function (presentValue) {
            return presentValue.isAnInstanceOf(classNameReference);
        });
    },

    /**
     * {@inheritdoc}
     */
    isCallable: function () {
        return this
            .asFuture() // Avoid auto-boxing the boolean result as a BooleanValue.
            .next(function (resultValue) {
                return resultValue.isCallable();
            });
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
     * {@inheritdoc}
     */
    isEmpty: function () {
        return this
            .asFuture() // Avoid auto-boxing the boolean result as a BooleanValue.
            .next(function (resultValue) {
                return resultValue.isEmpty();
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
    isIdenticalTo: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.isIdenticalTo(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    isNotIdenticalTo: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.isNotIdenticalTo(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    isSet: function () {
        return this
            .asFuture() // Avoid auto-boxing the boolean result as a BooleanValue.
            .next(function (resultValue) {
                return resultValue.isSet();
            });
    },

    /**
     * Determines whether this future has settled (been resolved or rejected).
     *
     * @returns {boolean}
     */
    isSettled: function () {
        return this.future.isSettled();
    },

    /**
     * {@inheritdoc}
     */
    logicalAnd: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.logicalAnd(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    modulo: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.modulo(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    multiplyBy: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.multiplyBy(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    next: function (resolveHandler, catchHandler) {
        var value = this;

        return value.factory.createFuture(function (resolve, reject) {
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

            // Use .nextIsolated() rather than .next() to avoid creating a further Future just for chaining.
            value.future.nextIsolated(doResolve, doReject);
        });
    },

    /**
     * {@inheritdoc}
     */
    nextIsolated: function (resolveHandler, catchHandler) {
        this.future.nextIsolated(resolveHandler, catchHandler);
    },

    /**
     * {@inheritdoc}
     */
    shiftLeft: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.shiftLeft(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    shiftRight: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.shiftRight(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    subtract: function (rightValue) {
        return this.next(function (leftValue) {
            return leftValue.subtract(rightValue);
        });
    },

    /**
     * {@inheritdoc}
     */
    toPromise: function () {
        var value = this;

        return new Promise(function (resolve, reject) {
            // Use .nextIsolated() rather than .next()
            // to avoid creating a further FutureValue & Future just for chaining.
            value.nextIsolated(resolve, reject);
        });
    },

    /**
     * {@inheritdoc}
     */
    yield: function () {
        return this.future.yield();
    },

    /**
     * Fetches the present value synchronously, which is not possible for an unsettled future.
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
