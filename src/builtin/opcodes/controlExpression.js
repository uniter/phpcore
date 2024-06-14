/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var phpCommon = require('phpcommon'),
    PHPError = phpCommon.PHPError,

    CAN_ONLY_THROW_OBJECTS = 'core.can_only_throw_objects',
    CANNOT_THROW_NON_THROWABLE_OBJECTS = 'core.cannot_throw_non_throwable_objects';

/**
 * Provides the control flow opcodes for the runtime API that the JS output by the transpiler calls into.
 *
 * @param {OpcodeInternals} internals
 * @constructor
 */
module.exports = function (internals) {
    var callStack = internals.callStack,
        valueFactory = internals.valueFactory;

    internals.setOpcodeFetcher('controlExpression');

    return {
        /**
         * Fetches an iterator for the object given to iterate over. Note that for a foreach,
         * we must retain the iterator object in the iterator variable across pauses - the loop(...)
         * opcode will clear down all opcodes prior to the condition clause, which includes the initialiser
         * where the iterator variable is assigned.
         *
         * Used by "foreach (...)" constructs.
         */
        getIterator: internals.typeHandler('val array', function (arrayValue) {
            return arrayValue.getIterator();
        }),

        /**
         * Fetches the given reference's value, coerces it to boolean and then returns the native boolean value.
         * Used by transpiled logical "AND" and "OR" expressions to implement short-circuiting.
         */
        logicalTerm: internals.typeHandler('val term : bool', function (termValue) {
            return termValue.coerceToBoolean().next(function (booleanTermValue) {
                return booleanTermValue.getNative();
            });
        }),

        /**
         * Handles the condition expression of a ternary, evaluating and coercing it to a native boolean.
         */
        ternary: internals.typeHandler('val condition : bool', function (conditionValue) {
            return conditionValue.coerceToBoolean().next(function (booleanConditionValue) {
                return booleanConditionValue.getNative();
            });
        }),

        /**
         * Throws the given operand.
         *
         * Used by "throw ...;" statements.
         *
         * @param {Reference|Value|Variable} operandReference
         * @returns {Value}
         * @throws {Value}
         */
        throw_: internals.typeHandler('val operand', function (throwableValue) {
            if (throwableValue.getType() !== 'object') {
                // Fatal error: Uncaught Error: Can only throw objects.
                callStack.raiseTranslatedError(PHPError.E_ERROR, CAN_ONLY_THROW_OBJECTS);
            }

            if (!throwableValue.classIs('Throwable')) {
                // Fatal error: Uncaught Error: Cannot throw objects that do not implement Throwable.
                callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_THROW_NON_THROWABLE_OBJECTS);
            }

            throw throwableValue;
        }),

        /**
         * Handles the operand of a return statement inside a try {...} block.
         * Exists because we must preserve the result through pauses etc.
         * if there is a finally clause that does not override it.
         *
         * Used by "try {...}" blocks that contain a return statement.
         */
        tryReturn: internals.typeHandler('slot operand', function (operandReference) {
            return operandReference;
        }),

        /**
         * Used by generator functions.
         */
        wrapGenerator: internals.typeHandler('any func : any', function (func) {
            return function generator() {
                var currentCall = callStack.getCurrent();

                return valueFactory.createGeneratorObject(currentCall, func)
                    .next(function (generatorObjectValue) {
                        currentCall.setGenerator(generatorObjectValue);

                        return generatorObjectValue;
                    });
            };
        })
    };
};
