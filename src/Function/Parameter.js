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
    Exception = phpCommon.Exception,
    PHPError = phpCommon.PHPError,
    Value = require('../Value').sync(),

    CALL_TO_BUILTIN = 'core.call_to_builtin',
    DEFINED_IN_USERLAND = 'core.defined_in_userland',
    INSTANCE_OF_TYPE_ACTUAL = 'core.instance_of_type_actual',
    INVALID_BY_REFERENCE_ARGUMENT = 'core.invalid_by_reference_argument',
    INVALID_VALUE_FOR_TYPE_BUILTIN = 'core.invalid_value_for_type_builtin',
    INVALID_VALUE_FOR_TYPE_USERLAND = 'core.invalid_value_for_type_userland',
    UNKNOWN = 'core.unknown';

/**
 * Represents a parameter to a PHP function.
 *
 * @param {CallStack} callStack
 * @param {ValueFactory} valueFactory
 * @param {Translator} translator
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @param {Userland} userland
 * @param {string} name
 * @param {number} index
 * @param {TypeInterface} typeObject
 * @param {FunctionContextInterface} context
 * @param {NamespaceScope} namespaceScope
 * @param {boolean} passedByReference
 * @param {boolean} variadic
 * @param {Function|null} defaultValueProvider
 * @param {string|null} filePath
 * @param {number|null} lineNumber
 * @constructor
 */
function Parameter(
    callStack,
    valueFactory,
    translator,
    futureFactory,
    flow,
    userland,
    name,
    index,
    typeObject,
    context,
    namespaceScope,
    passedByReference,
    variadic,
    defaultValueProvider,
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
     * @type {Function|null}
     */
    this.defaultValueProvider = defaultValueProvider;
    /**
     * @type {string|null}
     */
    this.filePath = filePath;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {number}
     */
    this.index = index;
    /**
     * @type {number|null}
     */
    this.lineNumber = lineNumber;
    /**
     * @type {string}
     */
    this.name = name;
    /**
     * @type {NamespaceScope}
     */
    this.namespaceScope = namespaceScope;
    /**
     * @type {boolean}
     */
    this.passedByReference = passedByReference;
    /**
     * @type {Translator}
     */
    this.translator = translator;
    /**
     * @type {TypeInterface}
     */
    this.typeObject = typeObject;
    /**
     * @type {Userland}
     */
    this.userland = userland;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @type {boolean}
     */
    this.variadic = variadic;
}

_.extend(Parameter.prototype, {
    /**
     * Coerces the given argument for this parameter to a suitable value,
     * causing the correct notice to be raised if an undefined variable or reference
     * is given where a value was expected.
     *
     * @param {Reference|Value|Variable} argumentReference
     * @returns {Value}
     */
    coerceArgument: function (argumentReference) {
        var parameter = this,
            value = parameter.passedByReference ?
                // It is valid to pass an undefined variable/reference to a by-ref parameter:
                // .getValueOrNull() will return a NullValue (with no notice raised) in that scenario.
                argumentReference.getValueOrNull() :
                // Otherwise use .getValue() to ensure a notice is raised on undefined variable or reference.
                argumentReference.getValue();

        if (parameter.callStack.isStrictTypesMode()) {
            // No value coercion to perform in strict-types mode.
            return value;
        }

        value = value.next(function (presentValue) {
            /*
             * Coerce the argument to match the parameter's type: for example, when the parameter
             * is of type "float" but the argument is a string containing a float, a FloatValue
             * will be returned with the value parsed from the string.
             */
            return parameter.typeObject.coerceValue(presentValue)
                .next(function (coercedValue) {
                    // Write the coerced argument value back to the reference if needed.
                    if (
                        parameter.passedByReference &&
                        coercedValue !== presentValue &&
                        !(argumentReference instanceof Value)
                    ) {
                        return argumentReference.setValue(coercedValue);
                    }

                    return coercedValue;
                });
        });

        return value;
    },

    /**
     * Fetches the line number this parameter was defined on, if known
     *
     * @returns {number|null}
     */
    getLineNumber: function () {
        return this.lineNumber;
    },

    /**
     * Fetches the name of this parameter, if known.
     *
     * @returns {string}
     */
    getName: function () {
        return this.name;
    },

    /**
     * Fetches this parameter's type.
     *
     * @returns {TypeInterface}
     */
    getType: function () {
        return this.typeObject;
    },

    /**
     * Determines whether this parameter is passed by reference.
     *
     * @returns {boolean}
     */
    isPassedByReference: function () {
        return this.passedByReference;
    },

    /**
     * Determines whether this parameter must have an argument provided.
     * Arguments are required for PHP function parameters unless that parameter defines a default value
     *
     * @returns {boolean}
     */
    isRequired: function () {
        return this.defaultValueProvider === null;
    },

    /**
     * Determines whether this parameter is variadic.
     *
     * @returns {boolean}
     */
    isVariadic: function () {
        return this.variadic;
    },

    /**
     * Loads a reference or value argument for this parameter into:
     * - The variable in the call scope (for a positional parameter), or
     * - An element of the array (for a variadic parameter).
     *
     * @param {Reference[]|Value[]|Variable[]} argumentReferenceList
     * @param {Reference|Variable} reference Local variable defined by parameter or array element if variadic.
     */
    loadArgument: function (argumentReference, reference) {
        var parameter = this;

        if (!parameter.passedByReference) {
            // Most common case: argument is not provided by reference.
            reference.setValue(argumentReference.getValue());
            return;
        }

        if (!parameter.defaultValueProvider) {
            // Argument is passed by reference, and has no default so must have had a reference provided.
            reference.setReference(argumentReference.getReference());
            return;
        }

        if (parameter.valueFactory.isValue(argumentReference)) {
            // Argument is passed by reference, but we're relying on its default value.
            reference.setValue(argumentReference);
            return;
        }

        // Argument is passed by reference and a reference was passed.
        reference.setReference(argumentReference.getReference());
    },

    /**
     * Fetches the default value for this parameter if its argument is missing.
     *
     * @param {Reference|Value|Variable|null=} argumentReference
     * @returns {ChainableInterface<Reference|Value|Variable>}
     */
    populateDefaultArgument: function (argumentReference) {
        var parameter = this;

        if (!argumentReference) {
            if (parameter.isRequired()) {
                // This should never happen - the scenario is captured within FunctionSpec.
                throw new Exception('Missing argument for required parameter "' + parameter.name + '"');
            }

            // Note that the result could be a Future, e.g. if a constant of an asynchronously autoloaded class.
            argumentReference = parameter.userland.enterIsolated(function () {
                return parameter.defaultValueProvider();
            });

            // No need to set NamespaceScope as it will already have been done (see FunctionFactory).
        }

        // TODO: For PHP 7, if the caller is in weak mode then we need to coerce if the type is scalar.

        // Make sure we preserve any reference rather than always casting to value.
        return parameter.flow.chainify(argumentReference);
    },

    /**
     * Validates whether the given argument is valid for this parameter.
     *
     * @param {Reference|Value|Variable|null} argumentReference Raw reference or value of the argument
     * @param {Value|null} argumentValue Resolved value of the argument
     * @param {number} argumentIndex
     * @returns {FutureInterface<void>} Resolved if the argument is valid or rejected with an Error otherwise
     */
    validateArgument: function (argumentReference, argumentValue, argumentIndex) {
        var parameter = this;

        return parameter.flow.chainifyResultOf(function () {
            if (parameter.passedByReference && argumentReference instanceof Value) {
                // Parameter expects a reference but was given a value - error
                parameter.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    INVALID_BY_REFERENCE_ARGUMENT,
                    {
                        index: argumentIndex + 1,
                        // Variadic parameters' names are not displayed.
                        context: parameter.variadic ? '' : ' ($' + parameter.name + ')',
                        func: parameter.context.getName()
                    },
                    null,
                    false,
                    parameter.callStack.getCallerFilePath(),
                    parameter.callStack.getCallerLastLine(),
                    null,
                    null,
                    // Unlike type errors, for this failure the frame is always skipped.
                    true
                );
            }

            if (!argumentReference) {
                if (parameter.isRequired()) {
                    // This should never happen - the scenario is captured within FunctionSpec
                    throw new Exception('Missing argument for required parameter "' + parameter.name + '"');
                }

                // Argument was omitted but its parameter is optional: allow it through, we'll use its default value
                return;
            }

            // Check whether the type allows the given argument (including null,
            // if it is a nullable type) or ...
            return parameter.typeObject.allowsValue(argumentValue)
                .next(function (allowsValue) {
                    var actualType,
                        argumentIsValid = allowsValue ||
                            (
                                // ... otherwise if null is given but not allowed by the type,
                                // null will need to have been given as the default value in order to be allowed
                                argumentValue.getType() === 'null' &&
                                parameter.defaultValueProvider &&
                                parameter.defaultValueProvider().getUnderlyingType() === 'null'
                            ),
                        callerFilePath = null,
                        callerLineNumber = null,
                        definitionFilePath,
                        definitionLineNumber,
                        expectedType,
                        isUserland;

                    if (argumentIsValid) {
                        // Nothing to do; argument is allowed
                        return;
                    }

                    // TODO: For PHP 7, if the caller is in weak mode then we need to coerce if the type is scalar

                    definitionFilePath = parameter.filePath || parameter.translator.translate(UNKNOWN);
                    definitionLineNumber = parameter.lineNumber || parameter.translator.translate(UNKNOWN);

                    if (parameter.callStack.getCurrent()) {
                        callerFilePath = parameter.callStack.getCallerFilePath();

                        if (callerFilePath === null) {
                            callerFilePath = parameter.translator.translate(UNKNOWN);
                        }

                        callerLineNumber = parameter.callStack.getCallerLastLine();

                        if (callerLineNumber === null) {
                            callerLineNumber = parameter.translator.translate(UNKNOWN);
                        }
                    }

                    actualType = argumentValue.getDisplayType();
                    expectedType = parameter.typeObject.getExpectedMessage(parameter.translator);

                    if (argumentValue.getType() === 'object') {
                        actualType = parameter.translator.translate(INSTANCE_OF_TYPE_ACTUAL, {
                            actualType: actualType
                        });
                    }

                    isUserland = parameter.callStack.isUserland();

                    // Parameter is typehinted as expecting values of a certain type,
                    // but the given argument does not match.
                    parameter.callStack.raiseTranslatedError(
                        PHPError.E_ERROR,
                        isUserland ?
                            INVALID_VALUE_FOR_TYPE_USERLAND :
                            INVALID_VALUE_FOR_TYPE_BUILTIN,
                        {
                            index: argumentIndex + 1,
                            // Variadic parameters' names are not displayed.
                            context: parameter.variadic ? '' : ' ($' + parameter.name + ')',
                            func: parameter.context.getName(),
                            expectedType: expectedType,
                            actualType: actualType,
                            callerFile: callerFilePath,
                            callerLine: callerLineNumber
                        },
                        'TypeError',
                        true,
                        isUserland ? definitionFilePath : callerFilePath,
                        isUserland ? definitionLineNumber : callerLineNumber,
                        isUserland ? DEFINED_IN_USERLAND : CALL_TO_BUILTIN,
                        isUserland ?
                            {
                                definitionFile: definitionFilePath,
                                definitionLine: definitionLineNumber
                            } :
                            {
                                callerFile: callerFilePath,
                                callerLine: callerLineNumber,
                            },
                        // Unlike for ArgumentCountErrors, for argument TypeErrors the frame is skipped for builtins.
                        !isUserland
                    );
                });
        });
    }
});

module.exports = Parameter;
