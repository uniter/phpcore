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
    EXACTLY = 'core.exactly',
    INVALID_RETURN_VALUE_TYPE = 'core.invalid_return_value_type',
    ONLY_REFERENCES_RETURNED_BY_REFERENCE = 'core.only_references_returned_by_reference',
    WRONG_ARG_COUNT_USERLAND = 'core.wrong_arg_count_userland',
    WRONG_ARG_COUNT_BUILTIN = 'core.wrong_arg_count_builtin',
    WRONG_ARG_COUNT_BUILTIN_SINGLE = 'core.wrong_arg_count_builtin_single',
    PHPError = phpCommon.PHPError,
    Reference = require('../Reference/Reference'),
    ReferenceSnapshot = require('../Reference/ReferenceSnapshot'),
    UNKNOWN = 'core.unknown',
    Value = require('../Value').sync();

/**
 * Represents the parameters, return type and location of a PHP function.
 *
 * @param {CallStack} callStack
 * @param {Translator} translator
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @param {FunctionContextInterface} context
 * @param {NamespaceScope} namespaceScope
 * @param {Parameter[]} parameterList
 * @param {Function} func
 * @param {TypeInterface|null} returnType
 * @param {boolean} returnByReference
 * @param {string|null} filePath
 * @param {number|null} lineNumber
 * @constructor
 */
function FunctionSpec(
    callStack,
    translator,
    valueFactory,
    referenceFactory,
    futureFactory,
    flow,
    context,
    namespaceScope,
    parameterList,
    func,
    returnType,
    returnByReference,
    filePath,
    lineNumber
) {
    var parameter,
        variadicParameter = null;

    if (parameterList.length > 0) {
        parameter = parameterList[parameterList.length - 1];

        if (parameter.isVariadic()) {
            variadicParameter = parameter;

            // Remove the variadic parameter from the positional parameter list,
            // as it will be handled specially.
            parameterList.pop();
        }
    }

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
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {Function}
     */
    this.func = func;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
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
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
    /**
     * @type {boolean}
     */
    this.returnByReference = returnByReference;
    /**
     * @type {TypeInterface|null}
     */
    this.returnType = returnType;
    /**
     * @type {Translator}
     */
    this.translator = translator;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @type {Parameter|null}
     */
    this.variadicParameter = variadicParameter;
}

_.extend(FunctionSpec.prototype, {
    /**
     * Coerces the given set of arguments for this function as needed.
     *
     * @param {Reference[]|Value[]|Variable[]} argumentReferenceList
     * @returns {FutureInterface<Value[]>} Returns all arguments resolved to values
     */
    coerceArguments: function (argumentReferenceList) {
        var coercedArguments = argumentReferenceList.slice(),
            spec = this,
            parameterCount = spec.parameterList.length;

        return spec.flow.eachAsync(coercedArguments, function (argumentReference, index) {
            var parameter = spec.parameterList[index];

            if (index >= parameterCount && spec.variadicParameter) {
                parameter = spec.variadicParameter;
            } else if (!parameter) {
                // Parameter is omitted due to bundle-size optimisations or similar, no coercion
                // to perform, but do ensure we have a value.
                coercedArguments[index] = argumentReference.getValue();

                return;
            }

            /*
             * Coerce the argument as the parameter requires (e.g. for scalar types in PHP 7+ weak type-checking mode).
             *
             * Note that it will be resolved to a value at this point if not already.
             * For by-reference parameters in weak-type checking mode, the coerced value will be written back
             * to the reference, i.e. <reference>.setValue(<coerced value>).
             */
            return parameter.coerceArgument(argumentReference)
                .next(function (coercedArgument) {
                    coercedArguments[index] = coercedArgument;

                    if (parameter.isPassedByReference()) {
                        if (
                            argumentReference instanceof Reference &&
                            !(argumentReference instanceof ReferenceSnapshot)
                        ) {
                            // Argument is a non-snapshot reference: wrap it in a snapshot
                            // to allow consistent synchronous access to the snapshotted value.
                            argumentReferenceList[index] = spec.referenceFactory.createSnapshot(
                                argumentReference,
                                coercedArgument
                            );
                        }
                    } else {
                        // Arguments for this parameter are passed by value, so also
                        // overwrite with the coerced argument in the reference list passed to the function.
                        argumentReferenceList[index] = coercedArgument;
                    }
                });
        }).next(function () {
            return coercedArguments;
        });
    },

    /**
     * Coerces a return value or reference for this function as per its return type, if any.
     *
     * @param {Reference|Value|Variable} returnReference
     * @returns {ChainableInterface<Value>} Returns the result coerced to a value
     */
    coerceReturnReference: function (returnReference) {
        var spec = this,
            value = spec.returnByReference ?
                // It is valid to return an undefined variable/reference from a return-by-reference function:
                // .getValueOrNull() will return a NullValue (with no notice raised) in that scenario.
                returnReference.getValueOrNull() :
                // Otherwise use .getValue() to ensure a notice is raised on undefined variable or reference.
                returnReference.getValue();

        if (!spec.returnType) {
            // No additional coercion to perform if there is no return type.
            // TODO: Always define a return type, as MixedType if none.
            return value;
        }

        if (spec.callStack.isStrictTypesMode()) {
            // No value coercion to perform in strict-types mode.
            return value;
        }

        value = value.next(function (presentValue) {
            /*
             * Coerce the result to match the return type: for example, when the return type
             * is "float" but the result is a string containing a float, a FloatValue
             * will be returned with the value parsed from the string.
             */
            var coercedValue = spec.returnType.coerceValue(presentValue);

            // Write the coerced return value back to the reference if needed.
            if (
                spec.returnByReference &&
                coercedValue !== presentValue &&
                !(returnReference instanceof Value)
            ) {
                return returnReference.setValue(coercedValue);
            }

            return coercedValue;
        });

        return value;
    },

    /**
     * Creates a new function (and its FunctionSpec) for an alias of the current FunctionSpec.
     *
     * @param {string} aliasName
     * @param {FunctionSpecFactory} functionSpecFactory
     * @param {FunctionFactory} functionFactory
     * @return {Function}
     */
    createAliasFunction: function (aliasName, functionSpecFactory, functionFactory) {
        var spec = this,
            aliasFunctionSpec = functionSpecFactory.createAliasFunctionSpec(
                spec.namespaceScope,
                aliasName,
                spec.parameterList,
                spec.func,
                spec.returnType,
                spec.returnByReference,
                spec.filePath,
                spec.lineNumber
            );

        return functionFactory.create(
            spec.namespaceScope,
            // Class will always be null for 'normal' functions
            // as defining a function inside a class will define it
            // inside the current namespace instead.
            null,
            null,
            null,
            aliasFunctionSpec
        );
    },

    /**
     * Fetches the path to the file this function was defined in.
     * May be null, if the function is a built-in.
     *
     * @returns {string|null}
     */
    getFilePath: function () {
        return this.filePath;
    },

    /**
     * Fetches the implementation of the resolved function/variant.
     *
     * @returns {Function}
     */
    getFunction: function () {
        return this.func;
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
     * Fetches the line number of this function within the file it was defined in.
     * May be null, if the function is a built-in or line number tracking is disabled.
     *
     * @returns {string|null}
     */
    getLineNumber: function () {
        return this.lineNumber;
    },

    /**
     * Fetches the name of the function.
     *
     * @returns {string}
     */
    getName: function () {
        return this.context.getName();
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
     * Fetches the positional parameters of this function.
     * If there is a variadic parameter at the end, it will not be included in this list.
     *
     * @returns {Parameter[]}
     */
    getParameters: function () {
        return this.parameterList;
    },

    /**
     * Fetches a bound variable reference for the function.
     *
     * @param {string} name
     * @returns {ReferenceSlot}
     */
    getReferenceBinding: function (name) {
        return this.context.getReferenceBinding(name);
    },

    /**
     * Fetches the number of required parameters.
     * Note that if an optional parameter appears before a required one, the optional one
     * is effectively required as its argument cannot validly be omitted.
     *
     * @returns {number}
     */
    getRequiredParameterCount: function () {
        var spec = this,
            count;

        for (count = spec.parameterList.length; count > 0; count--) {
            if (spec.parameterList[count - 1].isRequired()) {
                break;
            }
        }

        return count;
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
     * Fetches a bound variable value for the function.
     *
     * @param {string} name
     * @returns {Value}
     */
    getValueBinding: function (name) {
        return this.context.getValueBinding(name);
    },

    /**
     * Determines whether this function has any optional parameter.
     *
     * Note that any optional parameters not in the final position will be ignored,
     * as if any required ones come afterwards then they cannot actually be omitted.
     *
     * If the function has no parameters then false will be returned.
     *
     * @returns {boolean}
     */
    hasOptionalParameter: function () {
        var spec = this;

        return spec.parameterList.length > 0 && !spec.parameterList[spec.parameterList.length - 1].isRequired();
    },

    /**
     * Determines whether this is a built-in PHP function (rather than defined in userland).
     *
     * @returns {boolean}
     */
    isBuiltin: function () {
        return this.namespaceScope.isGlobal();
    },

    /**
     * Determines whether this function returns by reference.
     *
     * @returns {boolean}
     */
    isReturnByReference: function () {
        return this.returnByReference;
    },

    /**
     * Determines whether this is a userland PHP function (rather than a builtin).
     *
     * @returns {boolean}
     */
    isUserland: function () {
        return !this.namespaceScope.isGlobal();
    },

    /**
     * Declares a variable in the call scope for each parameter with the value or reference given as its argument.
     *
     * @param {Reference[]|Value[]|Variable[]} argumentReferenceList
     * @param {Scope} scope
     */
    loadArguments: function (argumentReferenceList, scope) {
        var index,
            spec = this,
            variadicArgumentCount,
            variadicArrayValue;

        _.each(spec.parameterList, function (parameter, index) {
            var localVariable = scope.getVariable(parameter.getName());

            parameter.loadArgument(argumentReferenceList[index], localVariable);
        });

        if (spec.variadicParameter) {
            // Parameter is variadic: collect all remaining arguments, build an array containing them
            // (with references if the parameter is by-reference) and store in the parameter's local variable.
            variadicArgumentCount = argumentReferenceList.length;
            variadicArrayValue = spec.valueFactory.createArray([]);

            for (index = spec.parameterList.length; index < variadicArgumentCount; index++) {
                spec.variadicParameter.loadArgument(argumentReferenceList[index], variadicArrayValue.getPushElement());
            }

            scope.getVariable(spec.variadicParameter.getName()).setValue(variadicArrayValue);
        }
    },

    /**
     * Populates any unspecified arguments with their default values from parameters
     *
     * @param {Reference[]|Value[]|Variable[]} argumentReferenceList
     * @returns {FutureInterface<Reference[]|Value[]|Variable[]>}
     */
    populateDefaultArguments: function (argumentReferenceList) {
        var coercedArguments = argumentReferenceList.slice(),
            currentParameter,
            spec = this;

        // Provide special line number instrumentation while loading default arguments
        spec.callStack.instrumentCurrent(function () {
            if (!currentParameter) {
                return null; // TODO: Return spec.lineNumber here?
            }

            return currentParameter.getLineNumber();
        });

        return spec.flow
            .eachAsync(spec.parameterList, function (parameter, index) {
                if (!parameter) {
                    // Parameter is omitted due to bundle-size optimisations or similar, ignore

                    return;
                }

                if (parameter.isRequired() && argumentReferenceList.length <= index) {
                    // No argument is given for this required parameter - should fail validation later

                    return;
                }

                currentParameter = parameter;

                // Coerce the argument as the parameter requires, allowing for async operation
                return parameter.populateDefaultArgument(argumentReferenceList[index])
                    .next(function (argumentValue) {
                        coercedArguments[index] = argumentValue;
                    });
            })
            .next(function () {
                return coercedArguments;
            });
    },

    /**
     * Non-overloaded functions have no inner spec to resolve to.
     *
     * @returns {FunctionSpec}
     */
    resolveFunctionSpec: function () {
        return this;
    },

    /**
     * Validates that the given set of arguments are valid for this function.
     * In weak type-checking mode, the arguments will also be coerced if needed.
     *
     * @param {Reference[]|Value[]|Variable[]} argumentReferenceList Raw argument values or references as passed in
     * @param {Value[]} argumentValueList Arguments resolved to values from their references
     * @returns {FutureInterface<void>} Resolved if the arguments are valid or rejected with an Error otherwise
     */
    validateArguments: function (argumentReferenceList, argumentValueList) {
        var positionalParameterCount,
            resultChainable,
            spec = this;

        resultChainable = spec.flow.eachAsync(spec.parameterList, function (parameter, index) {
            var expectedCount,
                filePath = null,
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

                expectedCount = spec.getRequiredParameterCount();

                // No argument is given for this required parameter - error
                // TODO: Consider using callStack.raiseTranslatedError(...) instead, as we do in Parameter -
                //       then remove this .createTranslatedErrorObject() method?
                throw spec.valueFactory.createTranslatedErrorObject(
                    'ArgumentCountError',
                    spec.callStack.isUserland() ?
                        WRONG_ARG_COUNT_USERLAND :
                        (expectedCount === 1 ? WRONG_ARG_COUNT_BUILTIN_SINGLE : WRONG_ARG_COUNT_BUILTIN),
                    {
                        func: spec.context.getName(),
                        bound: spec.hasOptionalParameter() ?
                            spec.translator.translate(AT_LEAST) :
                            spec.translator.translate(EXACTLY),
                        expectedCount: expectedCount,
                        actualCount: argumentReferenceList.length,
                        callerFile: filePath !== null ? filePath : '(' + spec.translator.translate(UNKNOWN) + ')',
                        callerLine: lineNumber !== null ? lineNumber : '(' + spec.translator.translate(UNKNOWN) + ')'
                    },
                    null,
                    null,
                    // For unknown file or line, pass undefined to indicate we should display "unknown".
                    spec.filePath !== null ? spec.filePath : undefined,
                    spec.lineNumber !== null ? spec.lineNumber : undefined
                );
            }

            // Validate the argument as the parameter requires.
            return parameter.validateArgument(argumentReferenceList[index], argumentValueList[index], index);
        });

        if (spec.variadicParameter) {
            positionalParameterCount = spec.parameterList.length;

            if (argumentReferenceList.length > positionalParameterCount) {
                resultChainable = resultChainable.next(function () {
                    var variadicArgumentReferenceList = argumentReferenceList.slice(positionalParameterCount),
                        variadicArgumentValueList = argumentValueList.slice(positionalParameterCount);

                    return spec.flow.eachAsync(variadicArgumentReferenceList, function (argumentReference, index) {
                        return spec.variadicParameter.validateArgument(
                            argumentReference,
                            variadicArgumentValueList[index],
                            positionalParameterCount + index
                        );
                    });
                });
            }
        }

        return resultChainable;
    },

    /**
     * Validates that the given return value or reference matches this function's return type, if any.
     *
     * @param {Reference|Value|Variable} returnReference
     * @param {Value} returnValue Result resolved to a value
     * @returns {ChainableInterface<Reference|Value|Variable>} Resolved with the return value or reference if valid or rejected with an Error otherwise
     */
    validateReturnReference: function (returnReference, returnValue) {
        var spec = this;

        if (!spec.returnType) {
            // Function has no return type declared, so there is nothing to check.
            // TODO: Always define a return type, as MixedType if none.
            return spec.futureFactory.createPresent(
                spec.returnByReference ?
                    returnReference :
                    returnValue
            );
        }

        if (spec.returnByReference && !returnReference.isReferenceable()) {
            // Function is return-by-reference, but a non-reference was returned.
            spec.callStack.raiseTranslatedError(
                PHPError.E_NOTICE,
                ONLY_REFERENCES_RETURNED_BY_REFERENCE
            );
        }

        return spec.returnType.allowsValue(returnValue).next(function (allowed) {
            if (allowed) {
                return spec.returnByReference ?
                    returnReference :
                    returnValue;
            }

            // Function is typehinted as returning values of a certain type,
            // but the given return value does not match.
            spec.callStack.raiseTranslatedError(
                PHPError.E_ERROR,
                INVALID_RETURN_VALUE_TYPE,
                {
                    func: spec.context.getName(),
                    expectedType: spec.returnType.getDisplayName(),
                    actualType: returnValue.getDisplayType()
                },
                'TypeError',
                false,
                // Use the current file & line context and not that of this function spec when userland.
                spec.isUserland() ? undefined : spec.filePath,
                spec.isUserland() ? undefined : spec.lineNumber
            );
        });
    }
});

module.exports = FunctionSpec;
