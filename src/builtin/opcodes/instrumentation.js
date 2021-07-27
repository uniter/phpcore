/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var DebugVariable = require('../../Debug/DebugVariable');

/**
 * Provides the instrumentation opcodes for the runtime API that the JS output by the transpiler calls into.
 *
 * When a pause is resumed from, the wrapping function must be called again in order to execute the code
 * back down until we reach the point at which the pause occurred. Opcode handler results are cached
 * by opcode index, however for variables defined in the transpiled JS (eg. the special "line" variable),
 * they will be defined a second time and so we will want any instrumentation to always point to the most
 * recent instance of the variable. This means the results of instrumentation opcodes should not be cached.
 *
 * @param {OpcodeInternals} internals
 * @constructor
 */
module.exports = function (internals) {
    var callStack = internals.callStack,
        controlScope = internals.controlScope,
        valueFactory = internals.valueFactory;

    internals.disableTracing();

    return {
        /**
         * Determines whether the given error is an instance of the given interface or class name.
         *
         * Used by catch clauses.
         *
         * @param {string} throwableClassName Fully-qualified interface or class to catch
         * @param {Error|ObjectValue} error Error that may be a PHP ObjectValue implementing Throwable
         * @returns {boolean}
         */
        caught: function (throwableClassName, error) {
            // TODO: Handle non-Throwable instances being thrown at this point?
            return valueFactory.isValue(error) &&
                error.getType() === 'object' &&
                error.classIs(throwableClassName);
        },

        /**
         * Creates a DebugVariable, for showing the value of a variable in the scope
         * inside Google Chrome's developer tools
         *
         * @param {string} variableName
         * @returns {DebugVariable}
         */
        createDebugVar: function (variableName) {
            var scope = callStack.getCurrentScope();

            return new DebugVariable(scope, variableName);
        },

        /**
         * Used for providing a function for fetching the last line executed in the current scope.
         * Only referenced when line number tracking is enabled.
         *
         * @param {function} finder
         */
        instrument: function (finder) {
            callStack.instrumentCurrent(finder);
        },

        /**
         * Determines whether a pause is currently taking effect (a Pause has been created and thrown,
         * but it has not yet fully unwound the call stack inside the runtime)
         *
         * @returns {boolean}
         */
        pausing: function () {
            var pausing = controlScope.isPausing();

            return pausing;
        }
    };
};
