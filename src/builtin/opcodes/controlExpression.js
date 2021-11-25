/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

/**
 * Provides the control flow opcodes for the runtime API that the JS output by the transpiler calls into.
 *
 * @param {OpcodeInternals} internals
 * @constructor
 */
module.exports = function (internals) {
    internals.setOpcodeFetcher('controlExpression');

    return {
        /**
         * Fetches an iterator for the object given to iterate over. Note that for a foreach,
         * we must retain the iterator object in the iterator variable across pauses - the loop(...)
         * opcode will clear down all opcodes prior to the condition clause, which includes the initialiser
         * where the iterator variable is assigned.
         *
         * Used by "foreach (...)" constructs.
         *
         * @param {Reference|Value|Variable} arrayReference
         * @returns {Future<ArrayIterator>|FutureValue<ObjectValue>}
         */
        getIterator: function (arrayReference) {
            return arrayReference.getValue().getIterator();
        },

        /**
         * Fetches the given reference's value, coerces it to boolean and then returns the native boolean value.
         * Used by transpiled logical AND and OR expressions to implement short-circuiting.
         *
         * @param {Reference|Value|Variable} reference
         * @returns {boolean}
         */
        logicalTerm: function (reference) {
            return reference.getValue().coerceToBoolean().getNative();
        },

        /**
         * Handles the condition expression of a ternary, evaluating and coercing it to a native boolean.
         *
         * @param {Reference|Value|Variable} conditionReference
         * @returns {boolean}
         */
        ternary: function (conditionReference) {
            return conditionReference.getValue().coerceToBoolean().getNative();
        }
    };
};
