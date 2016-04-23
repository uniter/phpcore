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
    require('microdash'),
    require('./Reference/Null'),
    require('./Reference/Variable')
], function (
    _,
    NullReference,
    VariableReference
) {
    /**
     * @param {ValueFactory} valueFactory
     * @constructor
     */
    function ReferenceFactory(valueFactory) {
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
    }

    _.extend(ReferenceFactory.prototype, {
        /**
         * Creates a NullReference
         *
         * @returns {NullReference}
         */
        createNull: function () {
            return new NullReference(this.valueFactory);
        },

        /**
         * Creates a new VariableReference
         *
         * @param {Variable} variable
         * @returns {VariableReference}
         */
        createVariable: function (variable) {
            return new VariableReference(variable);
        }
    });

    return ReferenceFactory;
}, {strict: true});
