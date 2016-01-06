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

    function SuperGlobalScope(callStack, valueFactory) {
        this.callStack = callStack;
        this.valueFactory = valueFactory;
        this.variables = {};
    }

    _.extend(SuperGlobalScope.prototype, {
        defineVariable: function (name) {
            var scope = this,
                variable = new Variable(scope.callStack, scope.valueFactory, name);

            scope.variables[name] = variable;

            return variable;
        },

        getVariable: function (name) {
            var scope = this;

            return hasOwn.call(scope.variables, name) ? scope.variables[name] : null;
        }
    });

    return SuperGlobalScope;
}, {strict: true});
