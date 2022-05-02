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
    MAX_OPCODE_HANDLER_ARITY = 5;

/**
 * @param {ControlBridge} controlBridge
 * @param {CallStack} callStack
 * @param {OpcodeFetcherRepository} opcodeFetcherRepository
 * @param {OpcodeExecutor} opcodeExecutor
 * @param {OpcodeRescuer} opcodeRescuer
 * @constructor
 */
function OpcodeHandlerFactory(
    controlBridge,
    callStack,
    opcodeFetcherRepository,
    opcodeExecutor,
    opcodeRescuer
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {ControlBridge}
     */
    this.controlBridge = controlBridge;
    /**
     * @type {OpcodeExecutor}
     */
    this.opcodeExecutor = opcodeExecutor;
    /**
     * @type {OpcodeFetcherRepository}
     */
    this.opcodeFetcherRepository = opcodeFetcherRepository;
    /**
     * @type {OpcodeRescuer}
     */
    this.opcodeRescuer = opcodeRescuer;
}

_.extend(OpcodeHandlerFactory.prototype, {
    /**
     * Wraps the given opcode handler function of the given type.
     *
     * @param {Function} opcodeHandler
     * @param {string} opcodeFetcherType
     * @returns {Function}
     */
    createTracedHandler: function (opcodeHandler, opcodeFetcherType) {
        var wrapper = this,
            opcodeFetcher = wrapper.opcodeFetcherRepository.getFetcher(opcodeFetcherType);

        // Check max handler arity is not exceeded.
        if (opcodeHandler.length > MAX_OPCODE_HANDLER_ARITY) {
            throw new Exception(
                'Opcode handler arity of ' +
                opcodeHandler.length +
                ' exceeds max of ' +
                MAX_OPCODE_HANDLER_ARITY
            );
        }

        return function tracedOpcodeHandler(arg1, arg2, arg3, arg4, arg5) {
            var trace = wrapper.callStack.getCurrentTrace(),
                // Note that this limit on arity must match MAX_OPCODE_HANDLER_ARITY.
                args = [arg1, arg2, arg3, arg4, arg5],
                // Note that Opcode objects are pooled to minimise GC pressure.
                opcode = trace.fetchOpcode(opcodeFetcher, opcodeHandler, args),
                resumeValue = opcode.resume(),
                result;

            if (resumeValue !== null) {
                // We are currently resuming from a pause.
                return resumeValue;
            }

            // Call the actual wrapped opcode handler.
            try {
                result = wrapper.opcodeExecutor.execute(opcode);

                if (wrapper.controlBridge.isFuture(result)) {
                    // Evaluate any futures, any pauses will be handled by this try..catch.
                    result = result.yield();
                }
            } catch (error) {
                wrapper.opcodeRescuer.rescuePauseOrError(error, opcode, trace);
                return;
            }

            // Mark this opcode's execution in the trace data record.
            opcode.traceResult(result);

            trace.advanceOpIndex();

            return result;
        };
    }
});

module.exports = OpcodeHandlerFactory;
