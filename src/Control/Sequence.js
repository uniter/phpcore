/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

/*jshint latedef: false */
'use strict';

var _ = require('microdash'),
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception,
    Pause = require('./Pause'),

    /**
     * Continues the sequence if it was previously started but already finished,
     * otherwise any handlers attached after finishing would never be called
     *
     * @param {Sequence} sequence
     */
    continueIfNeeded = function (sequence) {
        if (sequence.isCompleted()) {
            try {
                if (sequence.eventualError) {
                    throwInto(sequence, sequence.eventualError);
                } else {
                    resume(sequence, sequence.eventualResult);
                }
            } catch (error) {
                if (error !== sequence.eventualError) {
                    throw error; // Unexpected & untracked error, do not swallow
                }

                // Swallow tracked errors to preserve the fluent interface
            }
        }
    },

    /**
     * Runs through all registered handlers to actually perform the asynchronous resume
     *
     * @param {Sequence} sequence
     * @param {*} resultValue
     * @returns {*} Returns the result on synchronous execution
     */
    resume = function (sequence, resultValue) {
        var handler,
            originalResultValue = resultValue;

        if (sequence.controlBridge.isFuture(resultValue)) {
            // Mark the sequence as running in case it has previously completed
            sequence.running = true;
            sequence.eventualError = null;
            sequence.eventualResult = null;

            return resultValue
                // Evaluate any futures before continuing
                .next(resume.bind(null, sequence), throwInto.bind(null, sequence));
        }

        if (resultValue instanceof Sequence) {
            // Mark the sequence as running in case it has previously completed
            sequence.running = true;
            sequence.eventualError = null;
            sequence.eventualResult = null;

            return resultValue
                // Evaluate any sequences before continuing
                .next(resume.bind(null, sequence), throwInto.bind(null, sequence));
        }

        if (sequence.handlers.length === 0) {
            // No handler is available
            sequence.eventualError = null;
            sequence.eventualResult = resultValue;
            sequence.running = false;

            return resultValue;
        }

        // Find the next resume handler, if any
        do {
            handler = sequence.handlers.shift();
        } while (handler && handler.type === 'throw');

        if (!handler) {
            // No remaining resume handler is left
            sequence.eventualError = null;
            sequence.eventualResult = resultValue;
            sequence.running = false;

            return resultValue;
        }

        try {
            resultValue = handler.handler(resultValue);

            // Note that any future returned will be handled by resume() again once it is recursed into below
        } catch (error) {
            if (error instanceof Pause) {
                throw new Exception('Unexpected pause - handler should have returned a Future');
            }

            // An error was thrown by the resume handler, so throw it up the stack (of handlers)
            return throwInto(sequence, error);
        }

        // The resume handler did not throw, so use its return value as the latest result
        // and continue on up the stack
        if (handler.type === 'resume') {
            return resume(sequence, resultValue);
        }

        // For a finally handler, ignore its return value unless it was non-undefined, in which case
        // use it as the new result value. This mimics the way native try..catch..finally clauses
        // are able to override the result by returning, but it is optional.
        if (handler.type === 'finally') {
            if (typeof resultValue === 'undefined') {
                // Finally clause did not return a specific value, so we use the original return value.
                // This mimics the way a native finally clause would behave when handling a normal return
                // inside the try, and not containing any return statement inside the finally
                resultValue = originalResultValue;
            }

            return resume(sequence, resultValue);
        }

        throw new Exception('Unexpected handler type: ' + handler.type);
    },

    /**
     * Runs through all registered handlers to actually perform the asynchronous throw
     *
     * @param {Sequence} sequence
     * @param {Error} error
     * @returns {*} Returns the result on synchronous execution
     */
    throwInto = function (sequence, error) {
        // Run through all registered handlers to actually perform the resume
        var handler,
            resultValue;

        if (sequence.controlBridge.isFuture(error)) {
            // Mark the sequence as running in case it has previously completed
            sequence.running = true;
            sequence.eventualError = null;
            sequence.eventualResult = null;

            return error
                // Evaluate any futures to the eventual error before continuing
                // (note that we call throwInto() with the resolved error, unlike the logic in resume()).
                .next(throwInto.bind(null, sequence), throwInto.bind(null, sequence));
        }

        if (error instanceof Sequence) {
            // Mark the sequence as running in case it has previously completed
            sequence.running = true;
            sequence.eventualError = null;
            sequence.eventualResult = null;

            return error
                // Evaluate any sequences to the eventual error before continuing
                // (note that we call throwInto() with the resolved error, unlike the logic in resume()).
                .next(throwInto.bind(null, sequence), throwInto.bind(null, sequence));
        }

        if (sequence.handlers.length === 0) {
            // No handler is available
            sequence.eventualError = error;
            sequence.eventualResult = null;
            sequence.running = false;

            throw error;
        }

        // Find the next throw handler, if any
        do {
            handler = sequence.handlers.shift();
        } while (handler && handler.type === 'resume');

        if (!handler) {
            // No remaining throw handler is left
            sequence.eventualError = error;
            sequence.eventualResult = null;
            sequence.running = false;

            throw error;
        }

        try {
            resultValue = handler.handler(error);
        } catch (error) {
            if (error instanceof Pause) {
                throw new Exception('Unexpected pause - handler should have returned a Future');
            }

            // A further error was thrown by the catch handler, so we continue it up the stack (of handlers)
            return throwInto(sequence, error);
        }

        // The catch handler did not throw, so use its return value as the latest result
        // and continue resuming up the stack
        if (handler.type === 'throw') {
            return resume(sequence, resultValue);
        }

        // For a finally handler, ignore its return value and re-throw unless it was non-undefined,
        // in which case use it as the new result value. This mimics the way native try..catch..finally clauses
        // are able to override the result by returning, but it is optional.
        if (handler.type === 'finally') {
            if (typeof resultValue === 'undefined') {
                // Finally handler returned no specific value, so just re-throw the error (just like
                // a native finally clause would behave if handling an error without returning)
                return throwInto(sequence, error);
            }

            // Finally handler returned a specific value, so replace the thrown error with a return
            return resume(sequence, resultValue);
        }

        throw new Exception('Unexpected handler type: ' + handler.type);
    };

/**
 * @param {ControlFactory} controlFactory
 * @param {ControlBridge} controlBridge
 * @param {ControlScope} controlScope
 * @constructor
 */
function Sequence(controlFactory, controlBridge, controlScope) {
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
     * The error that the last handler in the sequence threw,
     * only set when the sequence finishes (started=true, running=false)
     *
     * @type {Error|null}
     */
    this.eventualError = null;
    /**
     * The result that the last handler in the sequence returned,
     * only set when the sequence finishes (started=true, running=false)
     *
     * @type {Error|null}
     */
    this.eventualResult = null;
    /**
     * @type {{type: string, handler: Function}[]}
     */
    this.handlers = [];
    /**
     * @type {boolean}
     */
    this.running = false;
    /**
     * @type {boolean}
     */
    this.started = false;
}

_.extend(Sequence.prototype, {
    catch: function (throwHandler) {
        var sequence = this;

        sequence.handlers.push({type: 'throw', handler: throwHandler});

        // If the sequence was previously started but already finished,
        // we'll have to continue it from here, otherwise the handlers will never be called
        continueIfNeeded(sequence);

        return sequence; // Fluent interface
    },

    clone: function () {
        var sequence = this,
            clone = sequence.controlFactory.createSequence();

        clone.handlers = sequence.handlers.slice();

        return clone;
    },

    /**
     * Attaches a callback to be called when the sequence has been executed regardless of result or error.
     *
     * @param {Function} finallyHandler
     * @returns {Future}
     */
    finally: function (finallyHandler) {
        var sequence = this;

        sequence.handlers.push({type: 'finally', handler: finallyHandler});

        // If the sequence was previously started but already finished,
        // we'll have to continue it from here, otherwise the handlers will never be called
        continueIfNeeded(sequence);

        return sequence; // Fluent interface
    },

    /**
     * @deprecated Use .resume()
     * @param {*} startValue
     * @returns {*}
     */
    go: function (startValue) {
        return this.resume(startValue);
    },

    /**
     * Determines whether the sequence has already completed running
     *
     * @returns {boolean}
     */
    isCompleted: function () {
        var sequence = this;

        return sequence.started && !sequence.running;
    },

    next: function (resumeHandler, catchHandler) {
        var sequence = this;

        sequence.handlers.push({type: 'resume', handler: resumeHandler});

        if (catchHandler) {
            sequence.handlers.push({type: 'throw', handler: catchHandler});
        }

        // If the sequence was previously started but already finished,
        // we'll have to continue it from here, otherwise the handlers will never be called
        continueIfNeeded(sequence);

        return sequence; // Fluent interface
    },

    /**
     * Runs through all registered handlers to actually perform the asynchronous resume
     *
     * @param {*} resultValue
     * @returns {Sequence}
     */
    resume: function (resultValue) {
        var sequence = this;

        if (sequence.started) {
            throw new Exception('Cannot resume a started Sequence');
        }

        sequence.started = true;
        sequence.running = true;

        try {
            resume(sequence, resultValue);
        } catch (error) {
            // Swallow errors as we won't be expecting to have to handle them
        }

        return sequence; // Fluent interface
    },

    /**
     * Runs through all registered handlers to actually perform the asynchronous throw
     *
     * @param {Error} error
     * @returns {Sequence}
     */
    throwInto: function (error) {
        var sequence = this;

        if (sequence.started) {
            throw new Exception('Cannot throw into a started Sequence');
        }

        sequence.started = true;
        sequence.running = true;

        try {
            throwInto(sequence, error);
        } catch (error) {
            // Swallow errors as we won't be expecting to have to handle them
        }

        return sequence; // Fluent interface
    },

    yieldSync: function () {
        var sequence = this;

        if (sequence.isCompleted()) {
            if (sequence.eventualError) {
                throw sequence.eventualError;
            }

            return sequence.eventualResult;
        }

        throw new Exception('Unable to yield a sequence that has not completed - did you mean to chain with .next(...)?');
    }
});

module.exports = Sequence;
