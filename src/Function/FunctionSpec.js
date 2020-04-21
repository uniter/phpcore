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
    TOO_FEW_ARGS_FOR_EXACT_COUNT = 'core.too_few_args_for_exact_count';

/**
 * Represents the parameters for a PHP function
 *
 * @param {CallStack} callStack
 * @param {ValueFactory} valueFactory
 * @param {FunctionContextInterface} context
 * @param {NamespaceScope} namespaceScope
 * @param {Parameter[]} parameterList
 * @param {string|null} filePath
 * @param {number|null} lineNumber
 * @constructor
 */
function FunctionSpec(
    callStack,
    valueFactory,
    context,
    namespaceScope,
    parameterList,
    filePath,
    lineNumber
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {FunctionContextInterface}
     */
    this.context = context;
    /**
     * @type {string|null}
     */
    this.filePath = filePath;
    /**
     * @type {number|null}
     */
    this.lineNumber = lineNumber;
    /**
     * @type {NamespaceScope}
     */
    this.namespaceScope = namespaceScope;
    /**
     * @type {Parameter[]|null[]}
     */
    this.parameterList = parameterList;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(FunctionSpec.prototype, {
    /**
     * Coerces the given set of arguments for this function as needed
     *
     * @param {Reference[]|Value[]|Variable[]} argumentReferenceList
     * @returns {Reference[]|Value[]|Variable[]}
     */
    coerceArguments: function (argumentReferenceList) {
        var coercedArguments = argumentReferenceList.slice(),
            spec = this;

        _.each(spec.parameterList, function (parameter, index) {
            if (!parameter) {
                // Parameter is omitted due to bundle-size optimisations or similar, ignore
                return;
            }

            if (argumentReferenceList.length <= index) {
                // Argument is not provided: do not attempt to fetch it
                return;
            }

            // Coerce the argument as the parameter requires
            coercedArguments[index] = parameter.coerceArgument(argumentReferenceList[index]);
        });

        // TODO: PHP7 scalar types should be coerced at this point, assuming caller
        //       was in weak-types mode
        return coercedArguments;
    },

    /**
     * Creates a new function (and its FunctionSpec) for an alias of the current FunctionSpec
     *
     * @param {string} aliasName
     * @param {Function} func
     * @param {FunctionSpecFactory} functionSpecFactory
     * @param {FunctionFactory} functionFactory
     * @return {Function}
     */
    createAliasFunction: function (aliasName, func, functionSpecFactory, functionFactory) {
        var spec = this,
            aliasFunctionSpec = functionSpecFactory.createAliasFunctionSpec(
                spec.namespaceScope,
                aliasName,
                spec.parameterList,
                spec.filePath,
                spec.lineNumber
            );

        return functionFactory.create(
            spec.namespaceScope,
            // Class will always be null for 'normal' functions
            // as defining a function inside a class will define it
            // inside the current namespace instead.
            null,
            func,
            aliasName,
            null,
            null,
            aliasFunctionSpec
        );
    },

    /**
     * Fetches the fully-qualified name of the function
     *
     * @param {boolean} isStaticCall
     * @returns {string}
     */
    getFunctionName: function (isStaticCall) {
        return this.context.getName(isStaticCall);
    },

    /**
     * Fetches the fully-qualified name of the function
     *
     * @param {boolean} isStaticCall
     * @returns {string}
     */
    getFunctionTraceFrameName: function (isStaticCall) {
        return this.context.getTraceFrameName(isStaticCall);
    },

    /**
     * Fetches the parameter of this function at the specified 0-based position
     * in the parameter list.
     * Note that some of its parameters and return type may not be given
     * at runtime due to bundle-size optimisations, for example
     *
     * @param {number} position
     * @returns {Parameter}
     */
    getParameterByPosition: function (position) {
        var spec = this;

        if (position >= spec.parameterList.length || !spec.parameterList[position]) {
            throw new Error('Unable to fetch parameter #' + position + ' of function "' + spec.context.getName() + '"');
        }

        return spec.parameterList[position];
    },

    /**
     * Fetches the name of this function, without any qualifying namespace and/or class prefix
     *
     * @returns {string}
     */
    getUnprefixedFunctionName: function () {
        return this.context.getUnprefixedName();
    },

    /**
     * Populates any unspecified arguments with their default values from parameters
     *
     * @param {Reference[]|Value[]|Variable[]} argumentReferenceList
     * @returns {Reference[]|Value[]|Variable[]}
     */
    populateDefaultArguments: function (argumentReferenceList) {
        var coercedArguments = argumentReferenceList.slice(),
            currentParameter,
            spec = this;

        // Provide special line number instrumentation while loading default arguments
        spec.callStack.instrumentCurrent(function () {
            if (!currentParameter) {
                return null;
            }

            return currentParameter.getLineNumber();
        });

        _.each(spec.parameterList, function (parameter, index) {
            if (!parameter) {
                // Parameter is omitted due to bundle-size optimisations or similar, ignore

                return;
            }

            if (parameter.isRequired() && argumentReferenceList.length <= index) {
                // No argument is given for this required parameter - should fail validation later

                return;
            }

            currentParameter = parameter;

            // Coerce the argument as the parameter requires
            coercedArguments[index] = parameter.populateDefaultArgument(argumentReferenceList[index]);
        });

        return coercedArguments;
    },

    /**
     * Validates that the given set of arguments are valid for this function
     *
     * @param {Reference[]|Value[]|Variable[]} argumentReferenceList
     */
    validateArguments: function (argumentReferenceList) {
        var spec = this;

        _.each(spec.parameterList, function (parameter, index) {
            var filePath = null,
                lineNumber = null;

            if (!parameter) {
                // Parameter is omitted due to bundle-size optimisations or similar, ignore
                return;
            }

            if (parameter.isRequired() && argumentReferenceList.length <= index) {
                if (spec.callStack.getCurrent()) {
                    filePath = spec.callStack.getCallerFilePath();
                    lineNumber = spec.callStack.getCallerLastLine();
                }

                // No argument is given for this required parameter - error
                throw spec.valueFactory.createTranslatedErrorObject(
                    'ArgumentCountError',
                    TOO_FEW_ARGS_FOR_EXACT_COUNT,
                    {
                        func: spec.context.getName(),
                        expectedCount: spec.parameterList.length,
                        actualCount: argumentReferenceList.length,
                        callerFile: filePath !== null ? filePath : '(unknown)',
                        callerLine: lineNumber !== null ? lineNumber : '(unknown)'
                    },
                    null,
                    null,
                    spec.filePath,
                    spec.lineNumber
                );
            }

            // Validate the argument as the parameter requires
            parameter.validateArgument(argumentReferenceList[index]);
        });
    }
});

module.exports = FunctionSpec;
