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
    ElementReference = require('../Element');

/**
 * Creates standard (unhooked) array elements
 *
 * @param {Flow} flow
 * @constructor
 */
function ElementProvider(flow) {
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {ReferenceFactory|null}
     */
    this.referenceFactory = null;
}

_.extend(ElementProvider.prototype, {
    /**
     * Creates a standard (unhooked) array element
     *
     * @param {ValueFactory} valueFactory
     * @param {CallStack} callStack
     * @param {ArrayValue} arrayValue
     * @param {Value} key
     * @param {Value|null} value
     * @param {Reference|null} reference
     * @returns {ElementReference}
     */
    createElement: function (valueFactory, callStack, arrayValue, key, value, reference) {
        var provider = this;

        return new ElementReference(
            valueFactory,
            provider.referenceFactory,
            callStack,
            provider.flow,
            arrayValue,
            key,
            value,
            reference
        );
    },

    /**
     * Sets the ReferenceFactory
     *
     * @param {ReferenceFactory} referenceFactory
     */
    setReferenceFactory: function (referenceFactory) {
        this.referenceFactory = referenceFactory;
    }
});

module.exports = ElementProvider;
