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
 * @param {FunctionSpecFactory} functionSpecFactory
 * @param {FunctionFactory} functionFactory
 * @constructor
 */
function OverloadedFunctionDefiner(
    functionSpecFactory,
    functionFactory
) {
    /**
     * @type {FunctionFactory}
     */
    this.functionFactory = functionFactory;
    /**
     * @type {FunctionSpecFactory}
     */
    this.functionSpecFactory = functionSpecFactory;
}

_.extend(OverloadedFunctionDefiner.prototype, {
    /**
     * Builds the overloaded function.
     *
     * @param {string} name
     * @param {OverloadedFunctionVariant[]} variants
     * @param {NamespaceScope} namespaceScope
     * @returns {Function}
     */
    defineFunction: function (
        name,
        variants,
        namespaceScope
    ) {
        var definer = this,
            maximumParameterCount = -Infinity,
            minimumParameterCount = Infinity,
            overloadedFunctionSpec,
            variantFunctionSpecsByParameterCount = [];

        if (variants.length < 2) {
            throw new Exception(
                'Overloaded function "' + name + '" must define at least 2 variants, ' +
                variants.length + ' defined'
            );
        }

        _.each(variants, function (variant) {
            var signature = variant.getSignature(),
                parameterCount = signature.getParameterCount(),
                functionSpec = definer.functionSpecFactory.createFunctionSpec(
                    namespaceScope,
                    name,
                    signature.getParametersSpecData(),
                    variant.getFunction(),
                    signature.getReturnTypeSpecData(),
                    signature.isReturnByReference(),
                    null,
                    null
                );

            if (variantFunctionSpecsByParameterCount[parameterCount]) {
                throw new Exception(
                    'Duplicate variants for overloaded function "' +
                    name + '" with parameter count ' +
                    parameterCount
                );
            }

            variantFunctionSpecsByParameterCount[parameterCount] = functionSpec;

            if (parameterCount < minimumParameterCount) {
                minimumParameterCount = parameterCount;
            }

            if (parameterCount > maximumParameterCount) {
                maximumParameterCount = parameterCount;
            }
        });

        overloadedFunctionSpec = definer.functionSpecFactory.createOverloadedFunctionSpec(
            name,
            variantFunctionSpecsByParameterCount,
            minimumParameterCount,
            maximumParameterCount
        );

        return definer.functionFactory.create(
            namespaceScope,
            // Class will always be null for 'normal' functions
            // as defining a function inside a class will define it
            // inside the current namespace instead.
            null,
            null,
            null,
            overloadedFunctionSpec
        );
    }
});

module.exports = OverloadedFunctionDefiner;
