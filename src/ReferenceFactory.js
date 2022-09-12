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
     * @param {class} ReferenceSnapshot
     * @param {class} StaticPropertyReference
     * @param {class} UndeclaredStaticPropertyReference
     * @param {ValueFactory} valueFactory
     * @param {FutureFactory} futureFactory
     * @param {CallStack} callStack
     * @constructor
     */
    function ReferenceFactory(
        AccessorReference,
        ElementReference,
        NullReference,
        ObjectElement,
        PropertyReference,
        ReferenceSlot,
        ReferenceSnapshot,
        StaticPropertyReference,
        UndeclaredStaticPropertyReference,
        valueFactory,
        futureFactory,
        callStack
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
         * @type {FutureFactory}
         */
        this.futureFactory = futureFactory;
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
        this.ReferenceSnapshot = ReferenceSnapshot;
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
         * Creates an AccessorReference.
         *
         * @param {Function} valueGetter
         * @param {Function=} valueSetter
         * @param {Function=} referenceGetter
         * @param {Function=} referenceSetter
         * @param {Function=} referenceClearer
         * @param {Function|null} definednessGetter
         * @param {Function|null} emptinessGetter
         * @param {Function|null} setnessGetter
         * @param {Function|null} undefinednessRaiser
         * @returns {AccessorReference}
         */
        createAccessor: function (
            valueGetter,
            valueSetter,
            referenceGetter,
            referenceSetter,
            referenceClearer,
            definednessGetter,
            emptinessGetter,
            setnessGetter,
            undefinednessRaiser
        ) {
            var factory = this;

            return new factory.AccessorReference(
                factory.valueFactory,
                factory,
                valueGetter,
                valueSetter || null,
                referenceGetter || null,
                referenceSetter || null,
                referenceClearer || null,
                definednessGetter || null,
                emptinessGetter || null,
                setnessGetter || null,
                undefinednessRaiser || null
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
                factory.futureFactory,
                factory.callStack,
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

            return new factory.NullReference(factory.valueFactory, factory.futureFactory, options);
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
                factory.futureFactory,
                factory.callStack,
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

            return new factory.ReferenceSlot(factory.valueFactory, factory);
        },

        /**
         * Creates a ReferenceSnapshot.
         *
         * @param {Reference|Variable} wrappedReference Reference that was snapshotted
         * @param {Value=} value Current snapshotted value of the reference if defined, null if undefined
         * @returns {ReferenceSnapshot}
         */
        createSnapshot: function (
            wrappedReference,
            value
        ) {
            var factory = this;

            return new factory.ReferenceSnapshot(
                factory.valueFactory,
                factory,
                factory.futureFactory,
                wrappedReference,
                value || null,
                wrappedReference.isReference() ? wrappedReference.getReference() : null
            );
        },

        /**
         * Creates a StaticPropertyReference
         *
         * @param {string} name
         * @param {Class} classObject Class in the hierarchy that defines the property - may be an ancestor
         * @param {string} visibility "private", "protected" or "public"
         * @returns {StaticPropertyReference}
         */
        createStaticProperty: function (
            name,
            classObject,
            visibility
        ) {
            var factory = this;

            return new factory.StaticPropertyReference(
                factory.valueFactory,
                factory,
                factory.callStack,
                classObject,
                name,
                visibility
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
                factory.futureFactory,
                factory.callStack,
                classObject,
                name
            );
        }
    });

    return ReferenceFactory;
}, {strict: true});
