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
 * @param {class} AsyncObjectValue
 * @param {class} PHPObject
 * @param {class} ValueCoercer
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @param {CallStack} callStack
 * @param {NativeCaller} nativeCaller
 * @param {ValueCaller} valueCaller
 * @constructor
 */
function FFIFactory(
    AsyncObjectValue,
    PHPObject,
    ValueCoercer,
    valueFactory,
    referenceFactory,
    futureFactory,
    flow,
    callStack,
    nativeCaller,
    valueCaller
) {
    /**
     * @type {class}
     */
    this.AsyncObjectValue = AsyncObjectValue;
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {Object.<boolean, ValueCoercer}
     */
    this.modeToValueCoercerMap = {};
    /**
     * @type {NativeCaller}
     */
    this.nativeCaller = nativeCaller;
    /**
     * @type {class}
     */
    this.PHPObject = PHPObject;
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
    /**
     * @type {ValueCaller}
     */
    this.valueCaller = valueCaller;
    /**
     * @type {class}
     */
    this.ValueCoercer = ValueCoercer;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(FFIFactory.prototype, {
    /**
     * Creates an AsyncObjectValue that wraps the given ObjectValue
     *
     * @param {Value} wrappedObjectValue
     * @returns {AsyncObjectValue}
     */
    createAsyncObjectValue: function (wrappedObjectValue) {
        var factory = this;

        return new factory.AsyncObjectValue(
            factory.valueFactory,
            factory.referenceFactory,
            factory.futureFactory,
            factory.callStack,
            factory.valueCaller,
            wrappedObjectValue
        );
    },

    /**
     * Creates a PHPObject, which wraps an ObjectValue and allows its methods
     * to be called and passed native values for its parameter arguments
     * and coerces its return value back to a native too.
     *
     * @param {ObjectValue} objectValue
     * @returns {PHPObject}
     */
    createPHPObject: function (objectValue) {
        var factory = this;

        return new factory.PHPObject(factory.valueFactory, factory.nativeCaller, objectValue);
    },

    /**
     * Fetches a value coercer for the given configuration. Note that as there are only
     * two possible modes, the instances are cached on first fetch to save memory usage.
     *
     * @param {boolean} autoCoercionEnabled
     * @returns {ValueCoercer}
     */
    createValueCoercer: function (autoCoercionEnabled) {
        var factory = this;

        if (!factory.modeToValueCoercerMap[autoCoercionEnabled]) {
            factory.modeToValueCoercerMap[autoCoercionEnabled] = new factory.ValueCoercer(
                factory.flow,
                autoCoercionEnabled
            );
        }

        return factory.modeToValueCoercerMap[autoCoercionEnabled];
    }
});

module.exports = FFIFactory;
