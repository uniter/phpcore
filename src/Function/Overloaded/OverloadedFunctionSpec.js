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
    Exception = phpCommon.Exception;

/**
 * Represents an overloaded PHP function.
 *
 * @param {FunctionSpecFactory} functionSpecFactory
 * @param {NamespaceScope} namespaceScope
 * @param {string} name
 * @param {Array.<number, FunctionSpec>} variantFunctionSpecsByParameterCount
 * @param {number} minimumParameterCount
 * @param {number} maximumParameterCount
 * @constructor
 */
function OverloadedFunctionSpec(
    functionSpecFactory,
    namespaceScope,
    name,
    variantFunctionSpecsByParameterCount,
    minimumParameterCount,
    maximumParameterCount
) {
    /**
     * @type {FunctionSpecFactory}
     */
    this.functionSpecFactory = functionSpecFactory;
    /**
     * @type {number}
     */
    this.maximumParameterCount = maximumParameterCount;
    /**
     * @type {number}
     */
    this.minimumParameterCount = minimumParameterCount;
    /**
     * @type {string}
     */
    this.name = name;
    /**
     * @type {NamespaceScope}
     */
    this.namespaceScope = namespaceScope;
    /**
     * @type {Array<number, FunctionSpec>}
     */
    this.variantFunctionSpecsByParameterCount = variantFunctionSpecsByParameterCount;
}

_.extend(OverloadedFunctionSpec.prototype, {
    /**
     * Creates a new function (and its FunctionSpec) for an alias of the current OverloadedFunctionSpec.
     *
     * @param {string} aliasName
     * @param {FunctionFactory} functionFactory
     * @return {Function}
     */
    createAliasFunction: function (aliasName, functionFactory) {
        var spec = this,
            aliasFunctionSpec,
            aliasVariantFunctionSpecsByParameterCount = {};

        _.forOwn(spec.variantFunctionSpecsByParameterCount, function (variantFunctionSpec, parameterCount) {
            aliasVariantFunctionSpecsByParameterCount[parameterCount] = variantFunctionSpec.createAliasFunctionSpec(
                aliasName
            );
        });

        aliasFunctionSpec = spec.functionSpecFactory.createOverloadedFunctionSpec(
            aliasName,
            aliasVariantFunctionSpecsByParameterCount,
            spec.minimumParameterCount,
            spec.maximumParameterCount
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
     * Fetches the fully-qualified name of the function.
     *
     * @returns {string}
     */
    getFunctionName: function () {
        return this.name;
    },

    /**
     * Fetches the name of the function as required for stack traces.
     *
     * @returns {string}
     */
    getFunctionTraceFrameName: function () {
        return this.name;
    },

    /**
     * Fetches the parameter count for the variant of the overloaded function
     * that defines the highest number of parameters.
     *
     * @returns {number}
     */
    getMaximumParameterCount: function () {
        return this.maximumParameterCount;
    },

    /**
     * Fetches the parameter count for the variant of the overloaded function
     * that defines the lowest number of parameters.
     *
     * @returns {number}
     */
    getMinimumParameterCount: function () {
        return this.minimumParameterCount;
    },

    /**
     * Fetches the name of the overloaded function.
     *
     * @returns {string}
     */
    getName: function () {
        return this.name;
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
     * Fetches the name of this function, without any qualifying namespace and/or class prefix.
     * Counter-intuitively, this must always return the fully-qualified name regardless.
     *
     * @returns {string}
     */
    getUnprefixedFunctionName: function () {
        return this.name; // Functions must always be prefixed.
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
     * Fetches the FunctionSpec of the variant of the overloaded function for the given argument count.
     *
     * @param {number} argumentCount
     * @returns {FunctionSpec}
     */
    resolveFunctionSpec: function (argumentCount) {
        var spec = this,
            wrappedTypedFunction = spec.variantFunctionSpecsByParameterCount[argumentCount];

        if (wrappedTypedFunction) {
            // An overload variant is defined for the given number of arguments.
            return wrappedTypedFunction;
        }

        // Otherwise, no variant is defined for this number of arguments: raise the relevant error.
        return spec.functionSpecFactory.createInvalidOverloadedFunctionSpec(
            spec,
            argumentCount
        );
    }
});

module.exports = OverloadedFunctionSpec;
