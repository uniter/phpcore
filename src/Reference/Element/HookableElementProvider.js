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
    HookableElement = require('./HookableElement');

/**
 * Creates hookable array elements, which will invoke hooks in the given collection where applicable.
 *
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @param {ElementProvider} baseElementProvider
 * @param {ElementHookCollection} elementHookCollection
 * @constructor
 */
function HookableElementProvider(
    referenceFactory,
    futureFactory,
    flow,
    baseElementProvider,
    elementHookCollection
) {
    /**
     * @type {ElementProvider}
     */
    this.baseElementProvider = baseElementProvider;
    /**
     * @type {ElementHookCollection}
     */
    this.elementHookCollection = elementHookCollection;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
}

_.extend(HookableElementProvider.prototype, {
    /**
     * Creates a new HookableElement
     *
     * @param {ValueFactory} valueFactory
     * @param {CallStack} callStack
     * @param {ArrayValue} arrayValue
     * @param {Value} key
     * @param {Value|null }value
     * @param {Reference|null} reference
     * @returns {HookableElementReference}
     */
    createElement: function (valueFactory, callStack, arrayValue, key, value, reference) {
        var provider = this,
            decoratedElement = provider.baseElementProvider.createElement(
                valueFactory,
                callStack,
                arrayValue,
                key,
                value,
                reference
            );

        return new HookableElement(
            provider.referenceFactory,
            provider.futureFactory,
            provider.flow,
            decoratedElement,
            provider.elementHookCollection
        );
    }
});

module.exports = HookableElementProvider;
