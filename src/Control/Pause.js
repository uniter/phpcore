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
    Exception = phpCommon.Exception;

/**
 * @param {CallStack} callStack
 * @param {ControlScope} controlScope
 * @param {Sequence} sequence
 * @param {Function} executor
 * @constructor
 */
function Pause(callStack, controlScope, sequence, executor) {
    var pause = this;

    function restoreCallStack() {
        if (pause.savedCallStack === null) {
            return;
        }

        // Restore the stack as it was before the pause
        pause.callStack.restore(pause.savedCallStack);

        pause.savedCallStack = null;
    }

    function resume(resultValue) {
        if (!pause.enacted) {
            throw new Exception('Pause has not yet been enacted');
        }

        setImmediate(function () {
            restoreCallStack();

            try {
                return sequence.resume(resultValue);
            } catch (error) {
                // Swallow errors (including Pauses) because setImmediate() does not expect errors
                if (error instanceof Pause) {
                    controlScope.markPaused(error); // Call stack should be unwound by this point
                }
            }
        });
    }

    function throwInto(error) {
        if (!pause.enacted) {
            throw new Exception('Pause has not yet been enacted');
        }

        setImmediate(function () {
            restoreCallStack();

            try {
                return sequence.throwInto(error);
            } catch (error) {
                // Swallow errors (including Pauses) because setImmediate() does not expect errors
                if (error instanceof Pause) {
                    controlScope.markPaused(error); // Call stack should be unwound by this point
                }
            }
        });
    }

    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {ControlScope}
     */
    this.controlScope = controlScope;
    /**
     * @type {boolean}
     */
    this.enacted = false;
    /**
     * @type {string}
     */
    this.message = 'PHPCore Pause Error';
    /**
     * @type {Sequence}
     */
    this.sequence = sequence;

    /**
     * Save the stack, including the Trace along with each Scope
     *
     * @type {Call[]|null}
     */
    // FIXME: Stack save/restore is not working!
    pause.savedCallStack = null;//pause.callStack.save();

    // Execute, providing callbacks for the eventual resume/continue on success or failure
    executor(resume, throwInto, restoreCallStack);
}

util.inherits(Pause, Error);

_.extend(Pause.prototype, {
    catch: function (throwHandler) {
        var pause = this;

        pause.sequence.catch(function (error) {
            // Give the stack frame the error to throw, ready for it to resume from that point
            pause.callStack.throwInto(error);

            return throwHandler(error);
        });

        return pause; // Fluent interface
    },

    finally: function (handler) {
        return this.next(handler, handler); // Fluent interface
    },

    next: function (resumeHandler, throwHandler) {
        var pause = this;

        pause.sequence.next(
            function (resultValue) {
                // Give the stack frame the result, ready for it to resume from that point
                pause.callStack.resume(resultValue);

                return resumeHandler(resultValue);
            }
        );

        if (throwHandler) {
            pause.catch(throwHandler);
        }

        return pause; // Fluent interface
    },

    now: function () {
        var pause = this;

        if (pause.enacted) {
            throw new Exception('Pause has already been enacted');
        }

        pause.enacted = true;
        // FIXME: Stack save/restore is not working!
        // pause.savedCallStack = pause.callStack.save(); // Moved back to ctor
        pause.controlScope.markPausing(pause);

        throw pause;
    }
});

module.exports = Pause;
