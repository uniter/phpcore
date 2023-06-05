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

    CANNOT_GET_RETURN_VALUE_OF_NONRETURNED_GENERATOR = 'core.cannot_get_return_value_of_nonreturned_generator',

    /**
     * Performs the start of the generator by calling into the wrapped function.
     * Called recursively (asynchronously) to facilitate resumes or throw-intos.
     *
     * @param {GeneratorIterator} iterator
     * @returns {ChainableInterface}
     */
    doStartGenerator = function (iterator) {
        return iterator.flow
            .maybeFuturise(
                function () {
                    return iterator.func.call(null);
                },
                function (pause, onResume) {
                    // The generator either yielded or encountered an async pause.

                    // Re-call the transpiled function to perform the resume
                    // using the data stored in the Trace when the generator is resumed.
                    onResume(function () {
                        return doStartGenerator(iterator);
                    });
                }
            );
    },

    /**
     * Starts the generator, handling its four possible "finish" scenarios:
     *
     * - No return (void return).
     * - A return of a specific value.
     * - A throw of a Throwable.
     * - A throw of an internal error.
     *
     * @param iterator
     * @returns {never}
     */
    startGenerator = function (iterator) {
        if (iterator.started) {
            throw new Exception('GeneratorIterator was already started');
        }

        iterator.started = true;

        return doStartGenerator(iterator)
            .next(
                function (returnValue) {
                    // The generator returned and finished.
                    iterator.finished = true;
                    iterator.returnValue = returnValue || iterator.valueFactory.createNull();
                    iterator.yieldedKey = null;
                    iterator.yieldedReference = null;
                    iterator.yieldedValue = null;

                    iterator.resolveFuture(returnValue);
                },
                function (error) {
                    // The generator threw an error.
                    iterator.finished = true;
                    iterator.yieldedKey = null;
                    iterator.yieldedReference = null;
                    iterator.yieldedValue = null;

                    iterator.rejectFuture(error);
                }
            );
    },

    /**
     * Resumes the generator, optionally with a value.
     *
     * @param {GeneratorIterator} iterator
     * @param {*=} value
     * @returns {Future}
     */
    resumeGenerator = function (iterator, value) {
        // Push the call that represents the Generator context back onto the stack.
        iterator.callStack.push(iterator.call);

        return iterator.futureFactory
            .createFuture(function (resolve, reject) {
                var previousResolve = iterator.resolveFuture;

                iterator.resolveFuture = resolve;
                iterator.rejectFuture = reject;

                previousResolve(value);
            })
            .finally(function () {
                // Pop the Generator's special call context back off of the stack.
                iterator.callStack.pop();
            });
    },

    /**
     * Resumes the generator by throwing a Throwable at its previous yield point.
     *
     * Note that as sometimes we want the yielded key and other times the yielded value,
     * it is up to the caller to chain a resolve callback returning the relevant one.
     *
     * @param {GeneratorIterator} iterator
     * @param {ObjectValue<Throwable>} throwableValue
     * @returns {Future}
     */
    throwIntoGenerator = function (iterator, throwableValue) {
        // Push the call that represents the Generator context back onto the stack.
        iterator.callStack.push(iterator.call);

        return iterator.futureFactory
            .createFuture(function (resolve, reject) {
                var previousReject = iterator.rejectFuture;

                iterator.resolveFuture = resolve;
                iterator.rejectFuture = reject;

                previousReject(throwableValue);
            })
            .finally(function () {
                // Pop the Generator's special call context back off of the stack.
                iterator.callStack.pop();
            });
    };

/**
 * Used by generator functions that use "yield ...;".
 *
 * @param {ValueFactory} valueFactory
 * @param {FutureFactory} futureFactory
 * @param {CallStack} callStack
 * @param {Flow} flow
 * @param {Call} call
 * @param {Function} func
 * @constructor
 */
function GeneratorIterator(valueFactory, futureFactory, callStack, flow, call, func) {
    var iterator = this;

    /**
     * @type {Call}
     */
    this.call = call;
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {boolean}
     */
    this.finished = false;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {Function}
     */
    this.func = func;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * Last key yielded that was an integer.
     * Start from -1 as this will be incremented to give 0 as the first key.
     *
     * @type {Value|null}
     */
    this.lastIntegerKey = valueFactory.createInteger(-1);
    /**
     * Note that this will be overwritten by the reject callback on yield or resume.
     *
     * @type {Function}
     */
    this.rejectFuture = function (error) {
        var previousReject = iterator.rejectFuture;

        /*
         * When the generator has not yet started but is thrown into (i.e. Generator->throw(...) is called)
         * we need to start the generator and run it up to its first yield/return, at which point
         * we then throw the given Throwable.
         */
        iterator.rejectFuture = function (/* overriddenError */) {
            previousReject(error);
        };
        iterator.resolveFuture = function (/* overriddenResult */) {
            previousReject(error);
        };

        startGenerator(iterator);
    };
    /**
     * Note that this will be overwritten by the resolve callback on yield or resume.
     *
     * @type {Function}
     */
    this.resolveFuture = function () {
        startGenerator(iterator);
    };
    /**
     * @type {Value|null}
     */
    this.returnValue = null;
    /**
     * @type {boolean}
     */
    this.started = false;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @type {Value|null}
     */
    this.yieldedKey = null;
    /**
     * @type {Reference|Variable|null}
     */
    this.yieldedReference = null;
    /**
     * @type {Value|null}
     */
    this.yieldedValue = null;
}

_.extend(GeneratorIterator.prototype, {
    /**
     * Resumes execution of the generator.
     *
     * @returns {ChainableInterface}
     */
    advance: function () {
        var iterator = this;

        return iterator.send(iterator.valueFactory.createNull())
            .next(function () {
                // Return undefined.
            });
    },

    /**
     * Fetches the last reference yielded by the generator.
     *
     * @returns {Reference}
     */
    getCurrentElementReference: function () {
        throw new Exception('Generator yield-by-reference is not yet supported');
    },

    /**
     * Fetches the last value yielded by the generator, or starts it
     * and returns a Future to be resolved or rejected with the result if needed.
     *
     * @returns {ChainableInterface<Value>}
     */
    getCurrentElementValue: function () {
        var iterator = this;

        if (iterator.isFinished()) {
            // There is no current value when the generator has finished.
            return this.valueFactory.createNull();
        }

        if (iterator.hasYielded()) {
            return this.yieldedValue;
        }

        return resumeGenerator(iterator)
            .next(function () {
                return iterator.yieldedValue;
            });
    },

    /**
     * Fetches the last key yielded by the generator, or starts it
     * and returns a Future to be resolved or rejected with the result if needed.
     *
     * @returns {Value}
     */
    getCurrentKey: function () {
        var iterator = this;

        if (iterator.isFinished()) {
            // There is no current key when the generator has finished.
            return this.valueFactory.createNull();
        }

        if (iterator.hasYielded()) {
            return this.yieldedKey;
        }

        return resumeGenerator(iterator)
            .next(function () {
                return iterator.yieldedKey;
            });
    },

    /**
     * Fetches the Call for this generator.
     *
     * @returns {Call}
     */
    getFunctionCall: function () {
        return this.call;
    },

    /**
     * Fetches the inner function for this generator.
     *
     * @returns {Function}
     */
    getInnerFunction: function () {
        return this.func;
    },

    /**
     * Fetches the return value of the generator, if there was one.
     *
     * @returns {ChainableInterface<Value>}
     */
    getReturnValue: function () {
        var iterator = this;

        if (iterator.returnValue === null) {
            // Note this is actually an Exception and not an Error.
            return iterator.futureFactory.createRejection(
                iterator.valueFactory.createTranslatedExceptionObject(
                    'Exception',
                    CANNOT_GET_RETURN_VALUE_OF_NONRETURNED_GENERATOR
                )
            );
        }

        return iterator.returnValue;
    },

    /**
     * Determines whether this generator has returned a value.
     *
     * @returns {boolean}
     */
    hasReturned: function () {
        return this.returnValue !== null;
    },

    /**
     * Determines whether this generator has yielded a value.
     *
     * @returns {boolean}
     */
    hasYielded: function () {
        var iterator = this;

        return iterator.yieldedValue !== null;
    },

    /**
     * Determines whether this generator is still running.
     *
     * @returns {boolean}
     */
    isFinished: function () {
        return this.finished;
    },

    /**
     * Determines whether this generator is still running.
     *
     * @returns {boolean}
     */
    isNotFinished: function () {
        return !this.finished;
    },

    /**
     * Used by ->rewind().
     *
     * @returns {ChainableInterface}
     */
    rewind: function () {
        return resumeGenerator(this)
            .next(function () {
                // Return undefined.
            });
    },

    /**
     * Resumes execution of the generator with the given value.
     *
     * @param {Value} value
     * @returns {ChainableInterface}
     */
    send: function (value) {
        var iterator = this;

        return resumeGenerator(iterator, value)
            .next(function () {
                return iterator.yieldedValue;
            });
    },

    /**
     * Resumes the generator by throwing the given Throwable at its previous yield point.
     * Its next yielded result (assuming there is one) will be returned.
     *
     * @param {ObjectValue<Throwable>} value
     * @returns {ChainableInterface}
     */
    throwInto: function (throwableValue) {
        var iterator = this;

        return throwIntoGenerator(iterator, throwableValue)
            .next(function () {
                return iterator.yieldedValue;
            });
    },

    /**
     * Yields a value from the generator, optionally also with a key.
     *
     * @param {Value|null} keyValue
     * @param {Value} value
     * @returns {Future}
     */
    yieldValue: function (keyValue, value) {
        var iterator = this;

        if (keyValue === null) {
            // No key was explicitly specified, we need to generate one.

            if (iterator.yieldedKey === null) {
                // This is the first yield, so start from 0.
                keyValue = iterator.valueFactory.createInteger(0);
            } else {
                // Increment the last key yielded that was an integer (which may not have been the previous one).
                keyValue = iterator.valueFactory.createInteger(iterator.lastIntegerKey.getNative() + 1);
            }

            // As below.
            iterator.lastIntegerKey = keyValue;
        } else if (keyValue.getType() === 'int') {
            // Given key is an integer, so keep hold of it for incrementing in future, if needed.
            // Note that floats are ignored.
            iterator.lastIntegerKey = keyValue;
        }

        return iterator.futureFactory.createFuture(function (resolve, reject) {
            var previousResolve = iterator.resolveFuture;

            iterator.rejectFuture = reject;
            iterator.resolveFuture = resolve;
            iterator.yieldedKey = keyValue;
            iterator.yieldedValue = value;

            // Resume whatever called into the generator, e.g. a ->send(...) call.
            previousResolve(value);
        });
    }
});

module.exports = GeneratorIterator;
