/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash')
], function (
    _
) {
    /**
     * @param {class} AccessorReference
     * @param {class} ElementReference
     * @param {class} NullReference
     * @param {class} ObjectElement
     * @param {class} PropertyReference
     * @param {class} ReferenceSlot
     * @param {class} StaticPropertyReference
     * @param {class} UndeclaredStaticPropertyReference
     * @param {ValueFactory} valueFactory
     * @param {CallStack} callStack
     * @param {Flow} flow
     * @constructor
     */
    function ReferenceFactory(
        AccessorReference,
        ElementReference,
        NullReference,
        ObjectElement,
        PropertyReference,
        ReferenceSlot,
        StaticPropertyReference,
        UndeclaredStaticPropertyReference,
        valueFactory,
        callStack,
        flow
    ) {
        /**
         * @type {class}
         */
        this.AccessorReference = AccessorReference;
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {class}
         */
        this.ElementReference = ElementReference;
        /**
         * @type {Flow}
         */
        this.flow = flow;
        /**
         * @type {class}
         */
        this.NullReference = NullReference;
        /**
         * @type {class}
         */
        this.ObjectElement = ObjectElement;
        /**
         * @type {class}
         */
        this.PropertyReference = PropertyReference;
        /**
         * @type {class}
         */
        this.ReferenceSlot = ReferenceSlot;
        /**
         * @type {class}
         */
        this.StaticPropertyReference = StaticPropertyReference;
        /**
         * @type {class}
         */
        this.UndeclaredStaticPropertyReference = UndeclaredStaticPropertyReference;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(ReferenceFactory.prototype, {
        /**
         * Creates an AccessorReference
         *
         * @param {Function} valueGetter
         * @param {Function=} valueSetter
         * @returns {AccessorReference}
         */
        createAccessor: function (valueGetter, valueSetter) {
            var factory = this;

            return new factory.AccessorReference(
                factory.valueFactory,
                factory,
                factory.flow,
                valueGetter,
                valueSetter || null
            );
        },

        /**
         * Creates an ElementReference
         *
         * @param {ArrayValue} arrayValue
         * @param {Value} key
         * @param {Value|null} value
         * @param {ReferenceSlot|null} reference
         * @returns {ElementReference}
         */
        createElement: function (
            arrayValue,
            key,
            value,
            reference
        ) {
            var factory = this;

            return new factory.ElementReference(
                factory.valueFactory,
                factory,
                factory.callStack,
                factory.flow,
                arrayValue,
                key,
                value,
                reference
            );
        },

        /**
         * Creates a NullReference
         *
         * @param {Object=} options
         * @returns {NullReference}
         */
        createNull: function (options) {
            var factory = this;

            return new factory.NullReference(factory.valueFactory, options);
        },

        /**
         * Creates an ObjectElement
         *
         * @param {ObjectValue} objectValue
         * @param {Value} keyValue
         * @returns {ObjectElement}
         */
        createObjectElement: function (objectValue, keyValue) {
            var factory = this;

            return new factory.ObjectElement(
                factory.valueFactory,
                factory,
                factory.flow,
                objectValue,
                keyValue
            );
        },

        /**
         * Creates an PropertyReference (for instance properties)
         *
         * @param {ObjectValue} objectValue
         * @param {Value} keyValue
         * @param {Class} classObject Class in the hierarchy that defines the property - may be an ancestor
         * @param {string} visibility "private", "protected" or "public"
         * @param {number} index
         * @returns {PropertyReference}
         */
        createProperty: function (
            objectValue,
            keyValue,
            classObject,
            visibility,
            index
        ) {
            var factory = this;

            return new factory.PropertyReference(
                factory.valueFactory,
                factory,
                factory.callStack,
                factory.flow,
                objectValue,
                keyValue,
                classObject,
                visibility,
                index
            );
        },

        /**
         * Creates a new ReferenceSlot
         *
         * @returns {ReferenceSlot}
         */
        createReferenceSlot: function () {
            var factory = this;

            return new factory.ReferenceSlot(factory.valueFactory, factory, factory.flow);
        },

        /**
         * Creates a StaticPropertyReference
         *
         * @param {string} name
         * @param {Class} classObject Class in the hierarchy that defines the property - may be an ancestor
         * @param {string} visibility "private", "protected" or "public"
         * @param {Value} value
         * @returns {StaticPropertyReference}
         */
        createStaticProperty: function (
            name,
            classObject,
            visibility,
            value
        ) {
            var factory = this;

            return new factory.StaticPropertyReference(
                factory.valueFactory,
                factory,
                factory.callStack,
                factory.flow,
                classObject,
                name,
                visibility,
                value
            );
        },

        /**
         * Creates an UndeclaredStaticPropertyReference
         *
         * @param {string} name
         * @param {Class} classObject Class in the hierarchy that defines the property - may be an ancestor
         * @returns {UndeclaredStaticPropertyReference}
         */
        createUndeclaredStaticProperty: function (name, classObject) {
            var factory = this;

            return new factory.UndeclaredStaticPropertyReference(
                factory.valueFactory,
                factory,
                factory.callStack,
                factory.flow,
                classObject,
                name
            );
        }
    });

    return ReferenceFactory;
}, {strict: true});
