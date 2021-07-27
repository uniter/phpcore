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
    slice = [].slice,
    Pause = require('../../Control/Pause');

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

        return function tracedOpcodeHandler() {
            var trace = wrapper.callStack.getCurrentTrace(),
                args = slice.call(arguments),
                // TODO: Implement pooling of these Opcode objects to minimise GC pressure
                opcode = trace.fetchOpcode(opcodeFetcher, opcodeHandler, args),
                resumeValue = opcode.resume(),
                result;

            if (resumeValue !== null) {
                // We are currently resuming from a pause
                return resumeValue;
            }

            // Call the actual wrapped opcode handler
            try {
                result = opcode.handle();

                if (wrapper.controlBridge.isChainable(result)) {
                    // Evaluate any futures, any pauses will be handled by this try..catch
                    result = result.yield();
                }
            } catch (error) {
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

            // Mark this opcode's execution in the trace data record
            opcode.traceResult(result);

            trace.advanceOpIndex();

            return result;
        };
    }
});

module.exports = OpcodeHandlerFactory;
