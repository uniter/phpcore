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
 * @constructor
 */
function FunctionInternalsClassFactory(
    baseInternals,
    valueFactory,
    ffiFactory,
    globalNamespace,
    globalNamespaceScope
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
                    parsed = factory.globalNamespace.parseName(internals.fqfn),
                    valueCoercer = factory.ffiFactory.createValueCoercer(internals.enableAutoCoercion);

                namespace = parsed.namespace;
                name = parsed.name;

                namespace.defineFunction(
                    name,
                    function __uniterOutboundStackMarker__() {
                        // Unwrap args from PHP-land to JS-land to native values if/as appropriate
                        var effectiveArguments = valueCoercer.coerceArguments(arguments);

                        return func.apply(internals, effectiveArguments);
                    },
                    factory.globalNamespaceScope
                );
            },

            /**
             * Disables auto-coercion for the class
             */
            disableAutoCoercion: function () {
                this.enableAutoCoercion = false;
            }
        });

        return FunctionInternals;
    }
});

module.exports = FunctionInternalsClassFactory;
