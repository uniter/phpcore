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
 * Creates a trait from its definition.
 *
 * @param {TraitFactory} traitFactory
 * @param {InstrumentationFactory} instrumentationFactory
 * @constructor
 */
function TraitPromoter(
    traitFactory,
    instrumentationFactory
) {
    /**
     * @type {InstrumentationFactory}
     */
    this.instrumentationFactory = instrumentationFactory;
    /**
     * @type {TraitFactory}
     */
    this.traitFactory = traitFactory;
}

_.extend(TraitPromoter.prototype, {
    /**
     * Promotes a TraitDefinition to a Trait.
     *
     * @param {TraitDefinition} traitDefinition
     * @returns {Trait} Returns the internal Trait instance created
     */
    promoteDefinition: function (traitDefinition) {
        var promoter = this,
            namespaceScope = traitDefinition.getNamespaceScope(),
            instrumentation = traitDefinition.getInstrumentation() ||
                promoter.instrumentationFactory.createCallInstrumentation(null);

        return promoter.traitFactory.createTrait(
            traitDefinition.getName(),
            traitDefinition.getNamespace(),
            namespaceScope,
            traitDefinition.getTraits(),
            traitDefinition.getConstants(),
            traitDefinition.getInstanceProperties(),
            traitDefinition.getStaticProperties(),
            traitDefinition.getMethods(),
            traitDefinition.getValueCoercer(),
            instrumentation
        );
    }
});

module.exports = TraitPromoter;
