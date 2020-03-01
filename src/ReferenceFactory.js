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
     * @param {class} NullReference
     * @param {ValueFactory} valueFactory
     * @constructor
     */
    function ReferenceFactory(
        AccessorReference,
        NullReference,
        valueFactory
    ) {
        /**
         * @type {class}
         */
        this.AccessorReference = AccessorReference;
        /**
         * @type {class}
         */
        this.NullReference = NullReference;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(ReferenceFactory.prototype, {
        /**
         * Creates an AccessorReference
         *
         * @param {function} valueGetter
         * @param {function} valueSetter
         * @returns {AccessorReference}
         */
        createAccessor: function (valueGetter, valueSetter) {
            var factory = this;

            return new factory.AccessorReference(factory.valueFactory, valueGetter, valueSetter);
        },

        /**
         * Creates a NullReference
         *
         * @returns {NullReference}
         */
        createNull: function () {
            var factory = this;

            return new factory.NullReference(factory.valueFactory);
        }
    });

    return ReferenceFactory;
}, {strict: true});
