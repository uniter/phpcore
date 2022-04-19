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
 * @param {ValueFactory} valueFactory
 * @param {Flow} flow
 * @constructor
 */
function ValueProvider(valueFactory, flow) {
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(ValueProvider.prototype, {
    /**
     * Creates an ArrayValue with the given elements.
     * Allows creation of an array from a reference & value list to values,
     * where any FutureValues have been resolved.
     *
     * @param {KeyReferencePair[]|KeyValuePair[]|Reference[]|Value[]|Variable[]} elements
     * @returns {FutureValue<ArrayValue>}
     */
    createFutureArray: function (elements) {
        var provider = this;

        return provider.flow
            .mapAsync(elements || [], function (element) {
                /*
                 * Note that for KeyReferencePair, KeyValuePair and ReferenceSlot
                 * the element will be returned unchanged. For all other types
                 * its value will be extracted - if this is a FutureValue then it will be awaited by Flow.
                 */
                return element.asArrayElement();
            })
            .next(function (presentElements) {
                return provider.valueFactory.createArray(presentElements);
            })
            .asValue();
    }
});

module.exports = ValueProvider;
