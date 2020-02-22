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
 * @param {Parameter[]} parameterList
 * @param {string|null} filePath
 * @param {number|null} lineNumber
 * @constructor
 */
function FunctionSpec(callStack, valueFactory, context, parameterList, filePath, lineNumber) {
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
        // TODO: PHP7 scalar types should be coerced at this point, assuming caller
        //       was in weak-types mode
        return argumentReferenceList;
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
     * @return {Reference[]|Value[]|Variable[]}
     */
    populateDefaultArguments: function (argumentReferenceList) {
        var coercedArguments = argumentReferenceList.slice(),
            spec = this;

        _.each(spec.parameterList, function (parameter, index) {
            if (!parameter) {
                // Parameter is omitted due to bundle-size optimisations or similar, ignore

                return;
            }

            if (parameter.isRequired() && argumentReferenceList.length <= index) {
                // No argument is given for this required parameter - should fail validation later

                return;
            }

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
