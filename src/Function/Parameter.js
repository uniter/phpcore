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
    PHPError = phpCommon.PHPError,
    Value = require('../Value').sync(),

    INSTANCE_OF_TYPE_ACTUAL = 'core.instance_of_type_actual',
    INVALID_VALUE_FOR_TYPE = 'core.invalid_value_for_type',
    ONLY_VARIABLES_BY_REFERENCE = 'core.only_variables_by_reference',
    UNKNOWN = 'core.unknown';

/**
 * Represents a parameter to a PHP function
 *
 * @param {CallStack} callStack
 * @param {Translator} translator
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @param {Userland} userland
 * @param {string|null} name
 * @param {number} index
 * @param {TypeInterface} typeObject
 * @param {FunctionContextInterface} context
 * @param {NamespaceScope} namespaceScope
 * @param {boolean} passedByReference
 * @param {Function|null} defaultValueProvider
 * @param {string|null} filePath
 * @param {number|null} lineNumber
 * @constructor
 */
function Parameter(
    callStack,
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
     * @type {string|null}
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
}

_.extend(Parameter.prototype, {
    /**
     * Coerces the given argument for this parameter to a suitable value or reference,
     * causing the correct notice to be raised if an undefined variable or reference
     * is given where a value was expected
     *
     * @param {Reference|Value|Variable} argumentReference
     * @returns {Reference|Value|Variable}
     */
    coerceArgument: function (argumentReference) {
        var parameter = this;

        if (parameter.passedByReference) {
            // It is valid to pass an undefined variable/reference to a by-ref parameter
            return argumentReference;
        }

        return argumentReference.getValue();
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
     * Determines whether this parameter must have an argument provided.
     * Arguments are required for PHP function parameters unless that parameter defines a default value
     *
     * @returns {boolean}
     */
    isRequired: function () {
        return this.defaultValueProvider === null;
    },

    /**
     * Fetches the default value for this parameter if its argument is missing
     *
     * @param {Reference|Value|Variable|null=} argumentReference
     * @returns {Future<Reference|Variable>|Value}
     */
    populateDefaultArgument: function (argumentReference) {
        var parameter = this;

        if (!argumentReference) {
            if (parameter.isRequired()) {
                // This should never happen - the scenario is captured within FunctionSpec
                throw new Error('Missing argument for required parameter "' + parameter.name + '"');
            }

            // Note that the result could be a FutureValue, eg. if a constant of an asynchronously autoloaded class
            argumentReference = parameter.userland.enterIsolated(function () {
                return parameter.defaultValueProvider();
            }); // No need to set NamespaceScope as it will already have been done (see FunctionFactory)
        }

        // TODO: For PHP 7, if the caller is in weak mode then we need to coerce if the type is scalar

        // Make sure we preserve any reference rather than always casting to value
        return parameter.flow.chainify(argumentReference);
    },

    /**
     * Validates whether the given argument is valid for this parameter
     *
     * @param {Reference|Value|Variable|null=} argumentReference
     * @returns {Future<void>} Resolved if the argument is valid or rejected with an Error otherwise
     */
    validateArgument: function (argumentReference) {
        var argumentValue,
            parameter = this;

        return parameter.futureFactory.createFuture(function (resolve, reject) {
            if (parameter.passedByReference && argumentReference instanceof Value) {
                // Parameter expects a reference but was given a value - error
                parameter.callStack.raiseTranslatedError(
                    PHPError.E_ERROR,
                    ONLY_VARIABLES_BY_REFERENCE,
                    {},
                    null,
                    false,
                    parameter.callStack.getCallerFilePath(),
                    parameter.callStack.getCallerLastLine()
                );
            }

            if (!argumentReference) {
                if (parameter.isRequired()) {
                    // This should never happen - the scenario is captured within FunctionSpec
                    reject(new Error('Missing argument for required parameter "' + parameter.name + '"'));
                    return;
                }

                // Argument was omitted but its parameter is optional: allow it through, we'll use its default value
                resolve();
                return;
            }

            argumentValue = argumentReference.getValueOrNull();

            // Check whether the type allows the given argument (including null,
            // if it is a nullable type) or ...
            parameter.typeObject.allowsValue(argumentValue)
                .next(function (allowsValue) {
                    var actualType,
                        argumentIsValid = allowsValue ||
                            (
                                // ... otherwise if null is given but not allowed by the type,
                                // null will need to have been given as the default value in order to be allowed
                                argumentValue.getType() === 'null' &&
                                parameter.defaultValueProvider &&
                                parameter.defaultValueProvider().getType() === 'null'
                            ),
                        callerFilePath = null,
                        callerLineNumber = null,
                        definitionFilePath,
                        definitionLineNumber,
                        expectedType;

                    if (argumentIsValid) {
                        // Nothing to do; argument is allowed
                        return;
                    }

                    // TODO: For PHP 7, if the caller is in weak mode then we need to coerce if the type is scalar

                    definitionFilePath = parameter.filePath || parameter.translator.translate(UNKNOWN);
                    definitionLineNumber = parameter.lineNumber || parameter.translator.translate(UNKNOWN);

                    if (parameter.callStack.getCurrent()) {
                        callerFilePath = parameter.callStack.getCallerFilePath();
                        callerLineNumber = parameter.callStack.getCallerLastLine();
                    }

                    actualType = argumentValue.getDisplayType();
                    expectedType = parameter.typeObject.getExpectedMessage(parameter.translator);

                    if (argumentValue.getType() === 'object') {
                        actualType = parameter.translator.translate(INSTANCE_OF_TYPE_ACTUAL, {
                            actualType: actualType
                        });
                    }

                    // Parameter is typehinted as expecting instances of a class or interface,
                    // but the given argument does not match
                    parameter.callStack.raiseTranslatedError(
                        PHPError.E_ERROR,
                        INVALID_VALUE_FOR_TYPE,
                        {
                            index: parameter.index + 1,
                            func: parameter.context.getName(),
                            expectedType: expectedType,
                            actualType: actualType,
                            callerFile: callerFilePath !== null ? callerFilePath : parameter.translator.translate(UNKNOWN),
                            callerLine: callerLineNumber !== null ? callerLineNumber : parameter.translator.translate(UNKNOWN),
                            definitionFile: definitionFilePath,
                            definitionLine: definitionLineNumber
                        },
                        'TypeError',
                        true,
                        definitionFilePath,
                        definitionLineNumber
                    );
                })
                .next(resolve, reject);
        });
    }
});

module.exports = Parameter;
