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
    Pause = require('../../../Control/Pause');

/**
 * @param {ControlBridge} controlBridge
 * @constructor
 */
function OpcodeRescuer(controlBridge) {
    /**
     * @type {ControlBridge}
     */
    this.controlBridge = controlBridge;
}

_.extend(OpcodeRescuer.prototype, {
    /**
     * Called when a pause or error occurred while handling an opcode.
     * Note that the error thrown could be a Future(Value), in which case we need to yield to it
     * so that a pause occurs if required.
     *
     * @param {Error|Future|Pause} error
     * @param {OpcodeInterface} opcode
     * @param {Trace} trace
     * @throws {Error|Pause}
     */
    rescuePauseOrError: function (error, opcode, trace) {
        var rescuer = this;

        if (rescuer.controlBridge.isFuture(error)) {
            // Special case: the thrown error is itself a Future(Value), so we need
            // to yield to it to either resolve it to the eventual error or pause.
            try {
                error = error.yield();
            } catch (furtherError) {
                rescuer.rescuePauseOrError(furtherError, opcode, trace);
                return;
            }
        }

        if (error instanceof Pause) {
            error.next(function (result) {
                // Mark this opcode's execution in the trace data record.
                opcode.traceResult(result);

                return result;
            }, function (error) {
                // Mark this opcode's failure in the trace data record.
                opcode.traceThrow(error);

                throw error;
            });
        } else {
            // Mark this opcode's failure in the trace data record.
            opcode.traceThrow(error);

            trace.advanceOpIndex();
        }

        throw error;
    }
});

module.exports = OpcodeRescuer;
