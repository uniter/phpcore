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
 * @param {Flow} flow
 * @param {FutureFactory} futureFactory
 * @param {NativeDefinitionBuilder} nativeDefinitionBuilder
 * @param {UserlandDefinitionBuilder} userlandDefinitionBuilder
 * @param {TraitPromoter} traitPromoter
 * @constructor
 */
function TraitDefiner(
    flow,
    futureFactory,
    nativeDefinitionBuilder,
    userlandDefinitionBuilder,
    traitPromoter
) {
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {NativeDefinitionBuilder}
     */
    this.nativeDefinitionBuilder = nativeDefinitionBuilder;
    /**
     * @type {TraitPromoter}
     */
    this.traitPromoter = traitPromoter;
    /**
     * @type {UserlandDefinitionBuilder}
     */
    this.userlandDefinitionBuilder = userlandDefinitionBuilder;
}

_.extend(TraitDefiner.prototype, {
    /**
     * Defines a trait in the given namespace, either from a JS class/function or from a transpiled PHP trait,
     * where PHPToJS has generated an object containing all the information related to the trait.
     *
     * @param {string} name Trait name, not including its namespace
     * @param {Function|Object} definition Either a Function for a native JS class or a transpiled definition object
     * @param {Namespace} namespace
     * @param {NamespaceScope} namespaceScope
     * @param {boolean} autoCoercionEnabled Whether the trait should be auto-coercing
     * @returns {ChainableInterface<Trait>} Returns the internal Trait instance created
     */
    defineTrait: function (
        name,
        definition,
        namespace,
        namespaceScope,
        autoCoercionEnabled
    ) {
        var definer = this;

        return definer.flow
            // Resolve all traits used by the trait itself.
            .mapAsync(definition.traits ? definition.traits.names : [], function (traitName) {
                return namespaceScope.getTrait(traitName);
            })
            // Build a definition for the trait of the relevant type (native or PHP userland)
            .next(function (traitObjects) {
                if (_.isFunction(definition)) {
                    // Trait is defined using native JavaScript, not PHP.

                    return definer.nativeDefinitionBuilder.buildDefinition(
                        name,
                        definition,
                        namespace,
                        namespaceScope,
                        traitObjects,
                        autoCoercionEnabled
                    );
                }

                // Trait has a definition structure, so it was defined using PHP.

                return definer.userlandDefinitionBuilder.buildDefinition(
                    name,
                    definition,
                    namespace,
                    namespaceScope,
                    traitObjects
                );
            })
            // Finally, promote the definition to the actual Trait instance.
            .next(function (traitDefinition) {
                return definer.traitPromoter.promoteDefinition(traitDefinition);
            });
    }
});

module.exports = TraitDefiner;
