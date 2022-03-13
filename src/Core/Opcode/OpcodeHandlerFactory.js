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
    Pause = require('../../Control/Pause'),
    MAX_OPCODE_HANDLER_ARITY = 4;

/**
 * @param {ControlBridge} controlBridge
 * @param {CallStack} callStack
 * @param {OpcodeFetcherRepository} opcodeFetcherRepository
 * @constructor
 */
function OpcodeHandlerFactory(controlBridge, callStack, opcodeFetcherRepository) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {ControlBridge}
     */
    this.controlBridge = controlBridge;
    /**
     * @type {OpcodeFetcherRepository}
     */
    this.opcodeFetcherRepository = opcodeFetcherRepository;
}

_.extend(OpcodeHandlerFactory.prototype, {
    /**
     * Wraps the given opcode handler function of the given type
     *
     * @param {Function} opcodeHandler
     * @param {string} opcodeFetcherType
     * @returns {Function}
     */
    createTracedHandler: function (opcodeHandler, opcodeFetcherType) {
        var wrapper = this,
            opcodeFetcher = wrapper.opcodeFetcherRepository.getFetcher(opcodeFetcherType);

        // Check max handler arity is not exceeded
        if (opcodeHandler.length > MAX_OPCODE_HANDLER_ARITY) {
            throw new Exception(
                'Opcode handler arity of ' +
                opcodeHandler.length +
                ' exceeds max of ' +
                MAX_OPCODE_HANDLER_ARITY
            );
        }

        return function tracedOpcodeHandler(arg1, arg2, arg3, arg4) {
            var trace = wrapper.callStack.getCurrentTrace(),
                // Note that this limit on arity must match MAX_OPCODE_HANDLER_ARITY
                args = [arg1, arg2, arg3, arg4],
                // Note that Opcode objects are pooled to minimise GC pressure
                opcode = trace.fetchOpcode(opcodeFetcher, opcodeHandler, args),
                resumeValue = opcode.resume(),
                result;

            if (resumeValue !== null) {
                // We are currently resuming from a pause
                return resumeValue;
            }

            /**
             * A pause or error occurred. Note that the error thrown could be a Future(Value),
             * in which case we need to yield to it so that a pause occurs if required.
             *
             * @param {Error|Future|FutureValue|Pause} error
             * @throws {Error|Pause}
             */
            function handlePauseOrError(error) {
                if (wrapper.controlBridge.isFuture(error)) {
                    // Special case: the thrown error is itself a Future(Value), so we need
                    // to yield to it to either resolve it to the eventual error or pause.
                    try {
                        error = error.yield();
                    } catch (furtherError) {
                        handlePauseOrError(furtherError);
                        return;
                    }
                }

                if (error instanceof Pause) {
                    error.next(function (result) {
                        // Mark this opcode's execution in the trace data record
                        opcode.traceResult(result);

                        return result;
                    }, function (error) {
                        // Mark this opcode's failure in the trace data record
                        opcode.traceThrow(error);

                        throw error;
                    });
                } else {
                    // Mark this opcode's failure in the trace data record
                    opcode.traceThrow(error);

                    trace.advanceOpIndex();
                }

                throw error;
            }

            // Call the actual wrapped opcode handler
            try {
                result = opcode.handle();

                if (wrapper.controlBridge.isFuture(result)) {
                    // Evaluate any futures, any pauses will be handled by this try..catch
                    result = result.yield();
                }
            } catch (error) {
                handlePauseOrError(error);
                return;
            }

            // Mark this opcode's execution in the trace data record
            opcode.traceResult(result);

            trace.advanceOpIndex();

            return result;
        };
    }
});

module.exports = OpcodeHandlerFactory;
