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
    require('./Variable')
], function (
    _,
    Variable
) {
    var hasOwn = {}.hasOwnProperty;

    /**
     * @param {CallStack} callStack
     * @param {ValueFactory} valueFactory
     * @constructor
     */
    function SuperGlobalScope(callStack, valueFactory) {
        /**
         * @type {CallStack}
         */
        this.callStack = callStack;
        /**
         * @type {ValueFactory}
         */
        this.valueFactory = valueFactory;
        /**
         * @type {Object.<string, Variable>}
         */
        this.variables = {};
    }

    _.extend(SuperGlobalScope.prototype, {
        /**
         * Defines a new variable in the super global scope and returns it
         *
         * @param {string} name
         * @returns {Variable}
         */
        defineVariable: function (name) {
            var scope = this,
                variable = new Variable(scope.callStack, scope.valueFactory, name);

            scope.variables[name] = variable;

            return variable;
        },

        /**
         * Returns a hash with the values of all variables defined
         * for the super global scope. The $GLOBALS superglobal is excluded
         *
         * @returns {Object.<string, Value>}
         */
        exportVariables: function () {
            var values = {};

            _.forOwn(this.variables, function (variable, variableName) {
                // Avoid infinite recursion by not attempting to export GLOBALS itself
                if (variableName === 'GLOBALS') {
                    return;
                }

                values[variableName] = variable.getValue();
            });

            return values;
        },

        /**
         * Fetches an existing variable from the super global scope
         *
         * @param {string} name
         * @returns {Variable|null}
         */
        getVariable: function (name) {
            var scope = this;

            return hasOwn.call(scope.variables, name) ? scope.variables[name] : null;
        }
    });

    return SuperGlobalScope;
}, {strict: true});
