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
    OverloadedFunctionVariant = require('../../Function/Overloaded/OverloadedFunctionVariant'),
    TypedFunction = require('../../Function/TypedFunction');

/**
 * @param {Internals} baseInternals
 * @param {ValueFactory} valueFactory
 * @param {FFIFactory} ffiFactory
 * @param {Namespace} globalNamespace
 * @param {NamespaceScope} globalNamespaceScope
 * @param {SignatureParser} signatureParser
 * @constructor
 */
function OverloadedFunctionInternalsClassFactory(
    baseInternals,
    valueFactory,
    ffiFactory,
    globalNamespace,
    globalNamespaceScope,
    signatureParser
) {
    /**
     * @type {Internals}
     */
    this.baseInternals = baseInternals;
    /**
     * @type {FFIFactory}
     */
    this.ffiFactory = ffiFactory;
    /**
     * @type {Namespace}
     */
    this.globalNamespace = globalNamespace;
    /**
     * @type {NamespaceScope}
     */
    this.globalNamespaceScope = globalNamespaceScope;
    /**
     * @type {SignatureParser}
     */
    this.signatureParser = signatureParser;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(OverloadedFunctionInternalsClassFactory.prototype, {
    /**
     * Creates a FunctionInternals class for use when defining an overloaded function using JS.
     *
     * @return {class}
     */
    create: function () {
        var factory = this;

        /**
         * @param {string} fqfn
         * @constructor
         */
        function OverloadedFunctionInternals(fqfn) {
            /**
             * @type {boolean}
             */
            this.enableAutoCoercion = true;
            /**
             * @type {string}
             */
            this.fqfn = fqfn;
            /**
             * Defined overload variants of the function.
             *
             * @type {TypedFunction[]}
             */
            this.variantTypedFunctions = [];
        }

        // Extend the base Internals object so that we inherit all the public service properties etc.
        OverloadedFunctionInternals.prototype = Object.create(factory.baseInternals);

        _.extend(OverloadedFunctionInternals.prototype, {
            /**
             * Defines the overloaded function.
             *
             * @param {Function} definitionFactory
             */
            defineFunction: function (definitionFactory) {
                var internals = this,
                    name,
                    namespace,
                    parsed = factory.globalNamespace.parseName(internals.fqfn),
                    valueCoercer,
                    variants;

                // The factory is expected to define all the variants by calling .defineVariant(...).
                definitionFactory(internals);

                valueCoercer = factory.ffiFactory.createValueCoercer(internals.enableAutoCoercion);

                variants = internals.variantTypedFunctions.map(function (variantTypedFunction) {
                    var func = variantTypedFunction.getFunction(),
                        signature = factory.signatureParser.parseSignature(variantTypedFunction.getSignature());

                    return new OverloadedFunctionVariant(
                        signature,
                        function () {
                            // Unwrap args from PHP-land to JS-land to native values if/as appropriate.
                            return valueCoercer.coerceArguments(arguments)
                                .next(function __uniterOutboundStackMarker__(effectiveArguments) {
                                    return func.apply(internals, effectiveArguments);
                                });
                        }
                    );
                });

                namespace = parsed.namespace;
                name = parsed.name;

                namespace.defineOverloadedFunction(name, variants, factory.globalNamespaceScope);
            },

            /**
             * Defines a variant of the overloaded function.
             *
             * @param {string} signature
             * @param {Function} func
             */
            defineVariant: function (signature, func) {
                var internals = this;

                internals.variantTypedFunctions.push(new TypedFunction(signature, func));
            },

            /**
             * Disables auto-coercion for the function.
             */
            disableAutoCoercion: function () {
                this.enableAutoCoercion = false;
            }
        });

        return OverloadedFunctionInternals;
    }
});

module.exports = OverloadedFunctionInternalsClassFactory;
