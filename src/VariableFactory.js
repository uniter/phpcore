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
     * @param {class} Variable
     * @param {CallStack} callStack
     * @param {ValueFactory} valueFactory
     * @param {ReferenceFactory} referenceFactory
     * @param {Flow} flow
     * @constructor
     */
    function VariableFactory(
        Variable,
        callStack,
        valueFactory,
        referenceFactory,
        flow
    ) {
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {Flow}
         */
        this.flow = flow;
        /**
         * @type {ReferenceFactory}
         */
        this.referenceFactory = referenceFactory;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
        /**
         * @type {class}
         */
        this.Variable = Variable;
    }

    _.extend(VariableFactory.prototype, {
        /**
         * Creates a new Variable
         *
         * @param {string} variableName
         * @returns {Variable}
         */
        createVariable: function (variableName) {
            var factory = this;

            return new factory.Variable(
                factory.callStack,
                factory.valueFactory,
                factory.referenceFactory,
                factory.flow,
                variableName
            );
        }
    });

    return VariableFactory;
}, {strict: true});
