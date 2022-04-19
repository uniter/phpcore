/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

/**
 * @param {Internals} baseInternals
 * @param {ValueFactory} valueFactory
 * @param {FFIFactory} ffiFactory
 * @param {Namespace} globalNamespace
 * @param {NamespaceScope} globalNamespaceScope
 * @param {SignatureParser} signatureParser
 * @constructor
 */
function FunctionInternalsClassFactory(
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

_.extend(FunctionInternalsClassFactory.prototype, {
    /**
     * Creates a FunctionInternals class for use when defining a function using JS
     *
     * @return {class}
     */
    create: function () {
        var factory = this;

        /**
         * @param {string} fqfn
         * @constructor
         */
        function FunctionInternals(fqfn) {
            /**
             * @type {boolean}
             */
            this.enableAutoCoercion = true;
            /**
             * @type {string}
             */
            this.fqfn = fqfn;
            /**
             * Signature for the function; optionally set by .defineSignature().
             *
             * @type {string|null}
             */
            this.signature = null;
        }

        // Extend the base Internals object so we inherit all the public service properties etc.
        FunctionInternals.prototype = Object.create(factory.baseInternals);

        _.extend(FunctionInternals.prototype, {
            /**
             * Defines the function
             *
             * @param {Function} definitionFactory
             */
            defineFunction: function (definitionFactory) {
                var internals = this,
                    name,
                    func = definitionFactory(internals),
                    namespace,
                    parametersSpecData = null,
                    parsed = factory.globalNamespace.parseName(internals.fqfn),
                    returnByReference = false,
                    returnTypeSpecData = null,
                    signature,
                    valueCoercer = factory.ffiFactory.createValueCoercer(internals.enableAutoCoercion);

                namespace = parsed.namespace;
                name = parsed.name;

                if (internals.signature) {
                    signature = factory.signatureParser.parseSignature(internals.signature);
                    parametersSpecData = signature.getParametersSpecData();
                    returnTypeSpecData = signature.getReturnTypeSpecData();
                    returnByReference = signature.isReturnByReference();
                }

                namespace.defineFunction(
                    name,
                    function () {
                        // Unwrap args from PHP-land to JS-land to native values if/as appropriate.
                        return valueCoercer.coerceArguments(arguments).next(function __uniterOutboundStackMarker__(effectiveArguments) {
                            return func.apply(internals, effectiveArguments);
                        });
                    },
                    factory.globalNamespaceScope,
                    parametersSpecData,
                    returnTypeSpecData,
                    returnByReference
                );
            },

            /**
             * Specifies a signature to use for the function.
             *
             * @param {string} signature
             */
            defineSignature: function (signature) {
                this.signature = signature;
            },

            /**
             * Disables auto-coercion for the function.
             */
            disableAutoCoercion: function () {
                this.enableAutoCoercion = false;
            }
        });

        return FunctionInternals;
    }
});

module.exports = FunctionInternalsClassFactory;
