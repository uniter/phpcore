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
    AT_LEAST = 'core.at_least',
    AT_MOST = 'core.at_most',
    NO_OVERLOAD_VARIANT_FOR_PARAMETER_COUNT = 'core.no_overload_variant_for_parameter_count',
    WRONG_ARG_COUNT_BUILTIN = 'core.wrong_arg_count_builtin',
    WRONG_ARG_COUNT_BUILTIN_SINGLE = 'core.wrong_arg_count_builtin_single',
    Exception = phpCommon.Exception,
    PHPError = phpCommon.PHPError,
    UNKNOWN = 'core.unknown';

/**
 * Represents an overloaded function that has no variant for a given argument count.
 *
 * @param {CallStack} callStack
 * @param {Translator} translator
 * @param {Flow} flow
 * @param {OverloadedFunctionSpec} overloadedFunctionSpec
 * @param {number} argumentCount
 * @constructor
 */
function InvalidOverloadedFunctionSpec(
    callStack,
    translator,
    flow,
    overloadedFunctionSpec,
    argumentCount
) {
    /**
     * @type {number}
     */
    this.argumentCount = argumentCount;
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {OverloadedFunctionSpec}
     */
    this.overloadedFunctionSpec = overloadedFunctionSpec;
    /**
     * @type {Translator}
     */
    this.translator = translator;
}

_.extend(InvalidOverloadedFunctionSpec.prototype, {
    /**
     * Coerces the given set of arguments for this function as needed.
     *
     * @param {Reference[]|Value[]|Variable[]} argumentReferenceList
     * @returns {FutureInterface<Value[]>} Returns all arguments resolved to values
     */
    coerceArguments: function (argumentReferenceList) {
        var coercedArguments = [],
            spec = this;

        return spec.flow.eachAsync(argumentReferenceList, function (argumentReference, index) {
            coercedArguments[index] = argumentReference.getValueOrNull();
        }).next(function () {
            return coercedArguments;
        });
    },

    /**
     * Coerces a return value or reference for this function as per its return type, if any.
     *
     * @throws {Exception} As this is not supported.
     */
    coerceReturnReference: function () {
        throw new Exception('Not supported');
    },

    /**
     * Creates a new function (and its FunctionSpec) for an alias of the current FunctionSpec.
     *
     * @throws {Exception} As this is not supported.
     */
    createAliasFunction: function () {
        throw new Exception('Not supported');
    },

    /**
     * Fetches the path to the file this function was defined in.
     * May be null, if the function is a built-in.
     *
     * @throws {Exception} As this is not supported.
     */
    getFilePath: function () {
        throw new Exception('Not supported');
    },

    /**
     * Fetches the implementation of the resolved function/variant.
     *
     * @returns {Function}
     */
    getFunction: function () {
        return function () {
            // FunctionFactory should never get as far as attempting to invoke the function.
            throw new Exception('InvalidOverloadedFunctionSpec function should not be called');
        };
    },

    /**
     * Fetches the fully-qualified name of the function.
     *
     * @returns {string}
     */
    getFunctionName: function () {
        return this.overloadedFunctionSpec.getName();
    },

    /**
     * Fetches the fully-qualified name of the function
     *
     * @throws {Exception} As this is not supported.
     */
    getFunctionTraceFrameName: function () {
        throw new Exception('Not supported');
    },

    /**
     * Fetches the line number of this function within the file it was defined in.
     * May be null, if the function is a built-in or line number tracking is disabled.
     *
     * @throws {Exception} As this is not supported.
     */
    getLineNumber: function () {
        throw new Exception('Not supported');
    },

    /**
     * Fetches the parameter of this function at the specified 0-based position
     * in the parameter list.
     * Note that some of its parameters and return type may not be given
     * at runtime due to bundle-size optimisations, for example
     *
     * @throws {Exception} As this is not supported.
     */
    getParameterByPosition: function () {
        throw new Exception('Not supported');
    },

    /**
     * Fetches the positional parameters of this function.
     * If there is a variadic parameter at the end, it will not be included in this list.
     *
     * @throws {Exception} As this is not supported.
     */
    getParameters: function () {
        throw new Exception('Not supported');
    },

    /**
     * Fetches a bound variable reference for the function.
     *
     * @throws {Exception} As this is not supported.
     */
    getReferenceBinding: function () {
        throw new Exception('Not supported');
    },

    /**
     * Fetches the number of required parameters.
     * Note that if an optional parameter appears before a required one, the optional one
     * is effectively required as its argument cannot validly be omitted.
     *
     * @throws {Exception} As this is not supported.
     */
    getRequiredParameterCount: function () {
        throw new Exception('Not supported');
    },

    /**
     * Fetches the name of this function, without any qualifying namespace and/or class prefix
     *
     * @throws {Exception} As this is not supported.
     */
    getUnprefixedFunctionName: function () {
        throw new Exception('Not supported');
    },

    /**
     * Fetches a bound variable value for the function.
     *
     * @throws {Exception} As this is not supported.
     */
    getValueBinding: function () {
        throw new Exception('Not supported');
    },

    /**
     * Determines whether this function has any optional parameter.
     *
     * Note that any optional parameters not in the final position will be ignored,
     * as if any required ones come afterwards then they cannot actually be omitted.
     *
     * If the function has no parameters then false will be returned.
     *
     * @throws {Exception} As this is not supported.
     */
    hasOptionalParameter: function () {
        throw new Exception('Not supported');
    },

    /**
     * Determines whether this is a built-in PHP function (rather than defined in userland).
     *
     * @throws {Exception} As this is not supported.
     */
    isBuiltin: function () {
        throw new Exception('Not supported');
    },

    /**
     * Determines whether this function returns by reference.
     *
     * @returns {boolean} Note that an error will be raised regardless.
     */
    isReturnByReference: function () {
        return false;
    },

    /**
     * Determines whether this is a userland PHP function (rather than a builtin).
     *
     * @throws {Exception} As this is not supported.
     */
    isUserland: function () {
        throw new Exception('Not supported');
    },

    /**
     * Declares a variable in the call scope for each parameter with the value or reference given as its argument.
     *
     * @throws {Exception} As this is not supported.
     */
    loadArguments: function () {
        throw new Exception('Not supported');
    },

    /**
     * Populates any unspecified arguments with their default values from parameters
     *
     * @throws {Exception} As this is not supported.
     */
    populateDefaultArguments: function () {
        throw new Exception('Not supported');
    },

    /**
     * Validates that the given set of arguments are valid for this function.
     * In weak type-checking mode, the arguments will also be coerced if needed.
     *
     * @returns {FutureInterface<void>} Resolved if the arguments are valid or rejected with an Error otherwise
     */
    validateArguments: function () {
        var spec = this,
            maximumParameterCount = spec.overloadedFunctionSpec.getMaximumParameterCount(),
            minimumParameterCount = spec.overloadedFunctionSpec.getMinimumParameterCount();

        if (spec.argumentCount < minimumParameterCount) {
            spec.callStack.raiseTranslatedError(
                PHPError.E_ERROR,
                minimumParameterCount === 1 ? WRONG_ARG_COUNT_BUILTIN_SINGLE : WRONG_ARG_COUNT_BUILTIN,
                {
                    func: spec.overloadedFunctionSpec.getName(),
                    bound: spec.translator.translate(AT_LEAST),
                    expectedCount: minimumParameterCount,
                    actualCount: spec.argumentCount,
                    callerFile: '(' + spec.translator.translate(UNKNOWN) + ')',
                    callerLine: '(' + spec.translator.translate(UNKNOWN) + ')'
                },
                'ArgumentCountError'
            );
        }

        if (spec.argumentCount > maximumParameterCount) {
            spec.callStack.raiseTranslatedError(
                PHPError.E_ERROR,
                maximumParameterCount === 1 ? WRONG_ARG_COUNT_BUILTIN_SINGLE : WRONG_ARG_COUNT_BUILTIN,
                {
                    func: spec.overloadedFunctionSpec.getName(),
                    bound: spec.translator.translate(AT_MOST),
                    expectedCount: maximumParameterCount,
                    actualCount: spec.argumentCount,
                    callerFile: '(' + spec.translator.translate(UNKNOWN) + ')',
                    callerLine: '(' + spec.translator.translate(UNKNOWN) + ')'
                },
                'ArgumentCountError'
            );
        }

        spec.callStack.raiseTranslatedError(
            PHPError.E_ERROR,
            NO_OVERLOAD_VARIANT_FOR_PARAMETER_COUNT,
            {
                func: spec.overloadedFunctionSpec.getName(),
                parameterCount: spec.argumentCount
            },
            'ArgumentCountError'
        );
    },

    /**
     * Validates that the given return value or reference matches this function's return type, if any.
     *
     * @throws {Exception} As this is not supported.
     */
    validateReturnReference: function () {
        throw new Exception('Not supported');
    }
});

module.exports = InvalidOverloadedFunctionSpec;
