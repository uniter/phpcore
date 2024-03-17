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
 * Creates opcode handlers that support typing of their parameters.
 * Arguments of typed parameters that coerce to Futures will automatically be awaited if needed.
 *
 * @param {ControlBridge} controlBridge
 * @constructor
 */
function TypedOpcodeHandlerFactory(controlBridge) {
    /**
     * @type {ControlBridge}
     */
    this.controlBridge = controlBridge;
}

_.extend(TypedOpcodeHandlerFactory.prototype, {
    /**
     * Creates a typed opcode handler with the given signature.
     *
     * @param {Signature} signature
     * @param {Function} handler
     * @returns {Function}
     */
    typeHandler: function (signature, handler) {
        var factory = this,
            parameterCount = signature.getParameterCount(),
            parameters = signature.getParameters(),
            typedHandler,
            variadicParameter = signature.getVariadicParameter();

        function coerceReturnValue(returnValue) {
            return signature.coerceReturnValue(returnValue);
        }

        typedHandler = variadicParameter ?
            function withVariadicParameter() {
                var argIndex = 0,
                    args = slice.call(arguments),
                    argCount = args.length,
                    coercedArgs = [],
                    variadicArg = [];

                function getParameter(argIndex) {
                    if (argIndex < parameterCount - 1) {
                        return parameters[argIndex];
                    }

                    return variadicParameter;
                }

                function finishHandling() {
                    var returnValue;

                    coercedArgs.push(variadicArg);

                    returnValue = handler.apply(null, coercedArgs);

                    if (factory.controlBridge.isFuture(returnValue)) {
                        return returnValue
                            .next(coerceReturnValue);
                    }

                    return coerceReturnValue(returnValue);
                }

                function coerceArgs() {
                    var coercedArg,
                        parameter,
                        parameterIndex;

                    function pushCoercedArg(coercedArg) {
                        if (parameter === variadicParameter) {
                            variadicArg.push(coercedArg);
                        } else {
                            coercedArgs.push(coercedArg);
                        }
                    }

                    function handlePresentArg(presentCoercedArg) {
                        pushCoercedArg(presentCoercedArg);

                        return coerceArgs();
                    }

                    while (argIndex < argCount) {
                        parameter = getParameter(argIndex);
                        coercedArg = parameter.coerceArgument(args[argIndex]);

                        argIndex++;

                        if (factory.controlBridge.isFuture(coercedArg)) {
                            // Coerced arg is a Future, so we need to await it before continuing.
                            return coercedArg.next(handlePresentArg);
                        }

                        pushCoercedArg(coercedArg);
                    }

                    for (parameterIndex = argCount; parameterIndex < parameterCount; parameterIndex++) {
                        parameter = parameters[parameterIndex];

                        if (parameter !== variadicParameter && parameter.isRequired()) {
                            throw new Exception(
                                'Missing argument for required parameter "' + parameter.getName() + '"'
                            );
                        }
                    }

                    return finishHandling();
                }

                return coerceArgs();
            } :
            function withoutVariadicParameter() {
                var argIndex = 0,
                    args = slice.call(arguments),
                    argCount = args.length,
                    coercedArgs = [];

                function getParameter(argIndex) {
                    if (argIndex < parameterCount) {
                        return parameters[argIndex];
                    }

                    throw new Exception(
                        'Too many opcode arguments provided - expected ' +
                        parameterCount + ', got ' + argCount
                    );
                }

                function finishHandling() {
                    var returnValue = handler.apply(null, coercedArgs);

                    if (factory.controlBridge.isFuture(returnValue)) {
                        return returnValue
                            .next(coerceReturnValue);
                    }

                    return coerceReturnValue(returnValue);
                }

                function coerceArgs() {
                    var coercedArg,
                        parameter,
                        parameterIndex;

                    function handlePresentArg(presentCoercedArg) {
                        coercedArgs.push(presentCoercedArg);

                        return coerceArgs();
                    }

                    while (argIndex < argCount) {
                        parameter = getParameter(argIndex);
                        coercedArg = parameter.coerceArgument(args[argIndex]);

                        argIndex++;

                        if (factory.controlBridge.isFuture(coercedArg)) {
                            // Coerced arg is a Future, so we need to await it before continuing.
                            return coercedArg.next(handlePresentArg);
                        }

                        coercedArgs.push(coercedArg);
                    }

                    for (parameterIndex = argCount; parameterIndex < parameterCount; parameterIndex++) {
                        parameter = parameters[parameterIndex];

                        if (parameter.isRequired()) {
                            throw new Exception(
                                'Missing argument for required parameter "' + parameter.getName() + '"'
                            );
                        }

                        coercedArgs[parameterIndex] = parameter.getDefaultArgument();
                    }

                    return finishHandling();
                }

                return coerceArgs();
            };

        typedHandler.typedOpcodeHandler = handler;

        return typedHandler;
    }
});

module.exports = TypedOpcodeHandlerFactory;
