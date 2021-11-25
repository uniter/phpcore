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
 * Provides the loop structure control opcodes for the runtime API that the JS output by the transpiler calls into.
 *
 * @param {OpcodeInternals} internals
 * @constructor
 */
module.exports = function (internals) {
    internals.setOpcodeFetcher('loopStructure');

    return {
        /**
         * Determines whether this iterator is pointing past the end of the array being iterated over
         *
         * @param {ArrayIterator|ObjectValue} iterator
         * @returns {boolean|Future<boolean>}
         */
        isNotFinished: function (iterator) {
            return iterator.isNotFinished();
        },

        /**
         * Handles the condition expression of a loop, evaluating and coercing it to a native boolean.
         * Note that the condition is sometimes optional, eg. for a "for" loop.
         *
         * @param {Reference|Value|Variable=} conditionReference
         * @returns {boolean}
         */
        loop: function (conditionReference) {
            if (!conditionReference) {
                // Empty for loop condition always continues iteration
                return true;
            }

            return conditionReference.getValue().coerceToBoolean().getNative();
        }
    };
};
