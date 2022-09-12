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
    slice = [].slice,
    Exception = phpCommon.Exception;

/**
 * Creates typed opcode handlers.
 *
 * @param {ControlBridge} controlBridge
 * @param {OpcodeHandlerFactory} opcodeHandlerFactory
 * @constructor
 */
function TypedOpcodeHandlerFactory(
    controlBridge,
    opcodeHandlerFactory
) {
    /**
     * @type {ControlBridge}
     */
    this.controlBridge = controlBridge;
    /**
     * @type {OpcodeHandlerFactory}
     */
    this.opcodeHandlerFactory = opcodeHandlerFactory;
}

_.extend(TypedOpcodeHandlerFactory.prototype, {
    /**
     * Creates a typed opcode handler with the given signature.
     *
     * @param {Signature} signature
     * @param {Function} handler
     * @param {string} opcodeFetcherType
     * @returns {Function}
     */
    typeHandler: function (signature, handler, opcodeFetcherType) {
        var factory = this,
            hasVariadicParameter = signature.hasVariadicParameter(),
            parameterCount = signature.getParameterCount(),
            parameters = signature.getParameters(),
            typedHandler;

        typedHandler = function () {
            var coercedInitialArg,
                coercedFormalArgs = [],
                coercedVariadicArgs,
                formalCaptureHandler,
                initialArgs = slice.call(arguments),
                initialArgCount = initialArgs.length,
                initialArgIndex,
                parameter,
                variadicCaptureHandler;

            function coerceReturnValue(returnValue) {
                return signature.coerceReturnValue(returnValue);
            }

            function finishHandling() {
                var returnValue,
                    coercedArgs = coercedFormalArgs;

                if (hasVariadicParameter) {
                    // Provide the variadic parameter's arguments as an array.
                    coercedArgs.push(coercedVariadicArgs);
                }

                returnValue = handler.apply(null, coercedArgs);

                if (factory.controlBridge.isFuture(returnValue)) {
                    return returnValue
                        .asFuture()
                        .next(coerceReturnValue);
                }

                return coerceReturnValue(returnValue);
            }

            if (hasVariadicParameter) {
                variadicCaptureHandler = factory.opcodeHandlerFactory.createTracedHandler(
                    function (partialArg) {
                        var coercedPartialArg,
                            partialArgs = arguments.length;

                        if (partialArgs === 0) {
                            // Opcode has a variadic parameter, and we've received all its arguments.
                            return finishHandling();
                        }

                        if (partialArgs > 1) {
                            throw new Exception('Only one partial argument may be provided at a time');
                        }

                        coercedPartialArg = parameter.coerceArgument(partialArg);

                        function finishArg(presentCoercedPartialArg) {
                            coercedVariadicArgs.push(presentCoercedPartialArg);

                            // Return the handler for capturing the next argument (or the end of the list).
                            return variadicCaptureHandler;
                        }

                        if (factory.controlBridge.isFuture(coercedPartialArg)) {
                            // Coerced partial arg is a future, so we need to await it before continuing.
                            return coercedPartialArg
                                .asFuture()
                                .next(finishArg);
                        }

                        // Coerced partial arg is not a future, capture it and return
                        // the handler for capturing the next argument (or the end of the list).
                        return finishArg(coercedPartialArg);
                    },
                    opcodeFetcherType
                );

                coercedVariadicArgs = [];
            }

            function finishInitialArgs() {
                var nextInitialArgIndex = coercedFormalArgs.length;

                if (nextInitialArgIndex === parameterCount) {
                    // Fastest case: all parameters have received their arguments
                    // and there is no variadic final parameter.
                    return finishHandling();
                }

                if (nextInitialArgIndex === parameterCount - 1) {
                    // Only exactly one parameter remains: check whether it is variadic.
                    parameter = parameters[nextInitialArgIndex];

                    if (parameter.isVariadic()) {
                        return variadicCaptureHandler;
                    }
                }

                // We have some remaining parameters that have not yet received their arguments:
                // return a handler to capture them one at a time.
                formalCaptureHandler = factory.opcodeHandlerFactory.createTracedHandler(
                    function (partialArg) {
                        var coercedPartialArg;

                        if (arguments.length > 1) {
                            throw new Exception('Only one partial argument may be provided at a time');
                        }

                        coercedPartialArg = parameter.coerceArgument(partialArg);

                        function finishArg(presentCoercedPartialArg) {
                            var argCount;

                            coercedFormalArgs.push(presentCoercedPartialArg);

                            argCount = coercedFormalArgs.length;

                            if (argCount === parameterCount) {
                                // All parameters have received their arguments.
                                return finishHandling();
                            }

                            // Return the handler for capturing the next argument based on the next parameter.
                            return parameters[argCount].isVariadic() ?
                                variadicCaptureHandler :
                                formalCaptureHandler;
                        }

                        if (factory.controlBridge.isFuture(coercedPartialArg)) {
                            // Coerced partial arg is a future, so we need to await it before continuing.
                            return coercedPartialArg
                                .asFuture()
                                .next(finishArg);
                        }

                        // Coerced partial arg is not a future, capture it and return
                        // the handler for capturing the next argument.
                        return finishArg(coercedPartialArg);
                    },
                    opcodeFetcherType
                );

                return formalCaptureHandler;
            }

            function finishFinalFutureArg(presentCoercedInitialArg) {
                coercedFormalArgs.push(presentCoercedInitialArg);

                return finishInitialArgs();
            }

            for (initialArgIndex = 0; initialArgIndex < initialArgCount; initialArgIndex++) {
                if (initialArgIndex >= parameterCount) {
                    throw new Exception(
                        'Too many opcode arguments provided - expected ' +
                        parameterCount + ', got ' + initialArgCount
                    );
                }

                parameter = parameters[initialArgIndex];

                if (parameter.isVariadic()) {
                    throw new Exception('Variadic opcode arguments should be provided separately');
                }

                coercedInitialArg = parameter.coerceArgument(initialArgs[initialArgIndex]);

                if (factory.controlBridge.isFuture(coercedInitialArg)) {
                    if (initialArgIndex === initialArgCount - 1) {
                        // Final coerced initial arg is a future, so we need to await it before continuing.
                        return coercedInitialArg
                            .asFuture()
                            .next(finishFinalFutureArg);
                    }

                    throw new Exception(
                        'Argument #' + initialArgIndex + ' for opcode parameter "' +
                        parameter.getName() +
                        '" is not the final one but has coerced to a Future - ' +
                        'this should be handled by chained function calls'
                    );
                }

                coercedFormalArgs.push(coercedInitialArg);
            }

            return finishInitialArgs();
        };

        typedHandler.typedOpcodeHandler = handler;

        return typedHandler;
    }
});

module.exports = TypedOpcodeHandlerFactory;
