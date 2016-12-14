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
 * @param {Scope} scope
 * @param {string} variableName
 * @constructor
 */
function DebugVariable(scope, variableName) {
    /**
     * @type {Scope}
     */
    this.scope = scope;
    /**
     * @type {string}
     */
    this.variableName = variableName;
}

_.extend(DebugVariable.prototype, {
    /**
     * Fetches the value currently assigned to the variable this DebugVariable is tracking
     *
     * @returns {Value}
     */
    getValue: function () {
        var variable = this;

        return variable.scope.getVariable(variable.variableName).getValue();
    },

    /**
     * Determines whether the wrapped Value is defined
     *
     * @returns {boolean}
     */
    isDefined: function () {
        var variable = this;

        return variable.scope.getVariable(variable.variableName).isDefined();
    }
});

module.exports = DebugVariable;
