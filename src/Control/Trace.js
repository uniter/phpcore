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
    hasOwn = {}.hasOwnProperty,
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception,
    createResumePlaceholder = function (trace) {
        return function resumePlaceholder() {
            trace.advanceOpIndex();

            return resumePlaceholder;
        };
    };

/**
 * Records and controls execution within a Call
 *
 * @param {OpcodePool} opcodePool
 * @constructor
 */
function Trace(opcodePool) {
    /**
     * Any expression that affects control flow, or control structure condition
     * must have its boolean result cached for the lifetime of the call,
     * to be returned for that opcode during any resumes
     *
     * @type {Object.<number, boolean>}
     */
    this.controlFlowResults = [];
    /**
     * @type {OpcodeInterface|null}
     */
    this.currentOpcode = null;
    /**
     * @type {number}
     */
    this.currentOpIndex = 0;
    /**
     * @type {Object.<number, number>}
     */
    this.loopOpIndexes = [];
    /**
     * @type {OpcodePool}
     */
    this.opcodePool = opcodePool;
    /**
     * @type {OpcodeInterface[]}
     */
    this.opcodeStack = [];
    /**
     * @type {Object.<number, *>}
     */
    this.opResultsSinceLastControlStructure = [];
    /**
     * As they affect control flow, any opcode that throws must have the thrown error cached
     * for the lifetime of the call, to be re-thrown for that opcode during any resumes
     *
     * @type {Error[]}
     */
    this.opThrows = [];
    /**
     * Only set when resuming with a .throwInto()
     *
     * @type {Error|null}
     */
    this.resumeError = null;
    /**
     * @type {number}
     */
    this.resumeOpIndex = -1;
    /**
     * @type {Object}
     */
    this.resumePlaceholder = createResumePlaceholder(this);
    /**
     * Only set when resuming with a .resume()
     *
     * @type {*|null}
     */
    this.resumeValue = null;
    /**
     * @type {boolean}
     */
    this.resuming = false;
}

_.extend(Trace.prototype, {
    /**
     * If we are not already executing an opcode for this trace, then the opcode index counter
     * is incremented. The counter will be left untouched if we are already executing one.
     *
     * Note that we do support recording trace information for nested opcodes,
     * however nested opcodes then need to be within a nested trace instance.
     */
    advanceOpIndex: function () {
        var trace = this;

        if (trace.currentOpcode !== null) {
            return;
        }

        trace.currentOpIndex++;
    },

    /**
     * Marks an opcode as entered and in progress
     *
     * @param {OpcodeInterface} opcode
     * @throws {Exception} When another opcode is already in progress
     */
    enterOpcode: function (opcode) {
        var trace = this;

        if (trace.currentOpcode) {
            trace.opcodeStack.push(trace.currentOpcode);
        }

        trace.currentOpcode = opcode;
    },

    /**
     * Fetches an OpcodeInterface if we are not nested, otherwise an UntracedOpcode
     *
     * @param {OpcodeFetcherInterface} opcodeFetcher
     * @param {Function} opcodeHandler
     * @param {*[]} args
     * @returns {OpcodeInterface|UntracedOpcode}
     */
    fetchOpcode: function (opcodeFetcher, opcodeHandler, args) {
        var opcode,
            opIndex,
            trace = this;

        if (trace.currentOpcode !== null) {
            return trace.opcodePool.provideUntracedOpcode(opcodeHandler, args);
        }

        opIndex = trace.currentOpIndex;

        opcode = opcodeFetcher.fetchOpcode(trace, opIndex, opcodeHandler, args);

        trace.currentOpcode = opcode;

        return opcode;
    },

    /**
     * Fetches the current opcode being handled, if there is one
     *
     * @returns {OpcodeInterface|null}
     */
    getCurrentOpcode: function () {
        return this.currentOpcode;
    },

    /**
     * Winds the trace state back to the beginning of a loop if needed, returning the resulting op index.
     *
     * @param {number} opIndex
     * @param {number} loopIndex
     * @returns {number}
     */
    getEffectiveLoopStructureOpIndex: function (opIndex, loopIndex) {
        var trace = this;

        if (trace.currentOpIndex !== opIndex) {
            throw new Exception('getEffectiveLoopStructureOpIndex() :: invalid state, opIndex !== currentOpIndex');
        }

        /*
         * When we reach the top of a loop structure for a second time, reset the trace state
         * to what it was at the beginning of the iteration. This is for two reasons:
         *
         * - When resuming inside a loop, we do not want N iterations to resume a loop that iterated N times.
         * - All op results must be cleared, so that all opcodes are reevaluated for the next iteration.
         */
        if (!trace.resuming) {
            if (hasOwn.call(trace.loopOpIndexes, loopIndex)) {
                opIndex = trace.loopOpIndexes[loopIndex];

                trace.currentOpIndex = opIndex;

                trace.loopOpIndexes.length = loopIndex + 1;

                trace.controlFlowResults.length = opIndex;
                trace.opResultsSinceLastControlStructure.length = opIndex;
                trace.opThrows.length = opIndex;
            } else {
                trace.loopOpIndexes[loopIndex] = trace.currentOpIndex;
            }
        }

        return opIndex;
    },

    /**
     * Leaves the current opcode
     *
     * @param {OpcodeInterface} opcode
     * @throws {Exception} When no opcode is in progress
     * @throws {Exception} When the given opcode is not the current one
     */
    leaveOpcode: function (opcode) {
        var trace = this;

        if (!trace.currentOpcode) {
            throw new Exception('leaveOpcode() :: No opcode is in progress');
        }

        if (trace.currentOpcode !== opcode) {
            throw new Exception('leaveOpcode() :: Incorrect opcode provided');
        }

        trace.currentOpcode.release(trace.opcodePool);

        trace.currentOpcode = trace.opcodeStack.length > 0 ?
            trace.opcodeStack.pop() :
            null; // Use null rather than undefined when there is no current opcode.
    },

    resume: function (resumeValue) {
        var trace = this;

        trace.resumeValue = resumeValue;
        trace.resumeError = null;

        if (trace.resuming === false) {
            trace.resumeOpIndex = trace.currentOpIndex;
            trace.currentOpIndex = 0;
            trace.resuming = true;
        }
    },

    resumeCalculationOpcode: function (opIndex) {
        var error,
            resumeValue,
            trace = this;

        if (trace.currentOpIndex !== opIndex) {
            throw new Exception('resumeCalculationOpcode() :: invalid state, opIndex !== currentOpIndex');
        }

        if (trace.resuming) {
            if (trace.currentOpIndex < trace.resumeOpIndex) {
                if (hasOwn.call(trace.opResultsSinceLastControlStructure, trace.currentOpIndex)) {
                    resumeValue = trace.opResultsSinceLastControlStructure[trace.currentOpIndex];
                } else if (hasOwn.call(trace.opThrows, trace.currentOpIndex)) {
                    error = trace.opThrows[trace.currentOpIndex];
                } else {
                    resumeValue = trace.resumePlaceholder;
                }
            } else if (trace.currentOpIndex === trace.resumeOpIndex) {
                // Resume is complete
                resumeValue = trace.resumeValue;
                error = trace.resumeError;
                trace.resumeOpIndex = -1;
                trace.resumeError = null;
                trace.resumeValue = null;
                trace.resuming = false;
            } else {
                // We have somehow jumped past the opcode to resume from, which should not happen
                throw new Exception('resumeCalculationOpcode() :: invalid state, currentOpIndex > resumeOpIndex');
            }

            // TODO: Does this make sense?
            trace.currentOpcode.release(trace.opcodePool);

            trace.currentOpcode = null;

            trace.advanceOpIndex();

            if (error) {
                throw error;
            }

            return resumeValue;
        }

        return null;
    },

    resumeControlFlowOpcode: function (opIndex) {
        var error,
            result,
            trace = this;

        if (trace.currentOpIndex !== opIndex) {
            throw new Exception('resumeControlFlowOpcode() :: invalid state, opIndex !== currentOpIndex');
        }

        if (trace.resuming) {
            if (trace.currentOpIndex < trace.resumeOpIndex) {
                if (hasOwn.call(trace.controlFlowResults, trace.currentOpIndex)) {
                    result = trace.controlFlowResults[trace.currentOpIndex];
                } else if (hasOwn.call(trace.opThrows, trace.currentOpIndex)) {
                    error = trace.opThrows[trace.currentOpIndex];
                } else {
                    // Control flow results should be kept for the lifetime of the call trace
                    throw new Exception('resumeControlFlowOpcode() :: missing control flow result');
                }
            } else if (trace.currentOpIndex === trace.resumeOpIndex) {
                // Resume is complete
                result = trace.resumeValue;
                error = trace.resumeError;
                trace.resumeOpIndex = -1;
                trace.resumeError = null;
                trace.resumeValue = null;
                trace.resuming = false;
            } else {
                // We have somehow jumped past the opcode to resume from, which should not happen
                throw new Exception('resumeControlFlowOpcode() :: invalid state, currentOpIndex > resumeOpIndex');
            }

            // TODO: Does this make sense?
            trace.currentOpcode.release(trace.opcodePool);

            trace.currentOpcode = null;

            trace.advanceOpIndex();

            if (error) {
                throw error;
            }

            return result;
        }

        return null;
    },

    throwInto: function (error) {
        var trace = this;

        trace.resumeError = error;
        trace.resumeValue = null;

        if (trace.resuming === false) {
            trace.resumeOpIndex = trace.currentOpIndex;
            trace.currentOpIndex = 0;
            trace.resuming = true;
        }
    },

    traceCalculationOpcodeResult: function (opIndex, result) {
        var trace = this;

        // Note that trace.currentOpIndex may have moved along by now

        trace.opResultsSinceLastControlStructure[opIndex] = result;

        trace.currentOpcode.release(trace.opcodePool);
        trace.currentOpcode = null;
    },

    traceCalculationOpcodeThrow: function (opIndex, error) {
        var trace = this;

        trace.opThrows[opIndex] = error;

        trace.currentOpcode.release(trace.opcodePool);
        trace.currentOpcode = null;
    },

    traceControlExpressionOpcodeResult: function (opIndex, result) {
        var trace = this;

        // Unlike for control flow structures, for control flow expressions we don't want to
        // clear operation results as we are embedded in the middle of operations (the expression's terms)
        trace.controlFlowResults[opIndex] = result;
        trace.opResultsSinceLastControlStructure[opIndex] = result;

        trace.currentOpcode.release(trace.opcodePool);
        trace.currentOpcode = null;
    },

    traceControlExpressionOpcodeThrow: function (opIndex, error) {
        var trace = this;

        trace.opThrows[opIndex] = error;

        trace.currentOpcode.release(trace.opcodePool);
        trace.currentOpcode = null;
    },

    traceControlStructureOpcodeResult: function (opIndex, result) {
        var trace = this;

        trace.controlFlowResults[opIndex] = result;
        // Clear operation results, as we only need to keep them from the most recent control statement
        trace.opResultsSinceLastControlStructure.length = 0;

        trace.currentOpcode.release(trace.opcodePool);
        trace.currentOpcode = null;
    },

    traceControlStructureOpcodeThrow: function (opIndex, error) {
        var trace = this;

        trace.opThrows[opIndex] = error;

        trace.currentOpcode.release(trace.opcodePool);
        trace.currentOpcode = null;
    }
});

module.exports = Trace;
