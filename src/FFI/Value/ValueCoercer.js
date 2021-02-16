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
 * @param {boolean} autoCoercionEnabled
 * @constructor
 */
function ValueCoercer(autoCoercionEnabled) {
    /**
     * @type {boolean}
     */
    this.autoCoercionEnabled = autoCoercionEnabled;
}

_.extend(ValueCoercer.prototype, {
    /**
     * Unwraps arguments for a method based on the coercion mode for the class
     *
     * @param {Value[]} argumentValues
     * @returns {Value[]|*[]}
     */
    coerceArguments: function (argumentValues) {
        var coercer = this;

        if (coercer.autoCoercionEnabled) {
            argumentValues = _.map(argumentValues, function (argumentValue) {
                return argumentValue.getNative();
            });
        }

        return argumentValues;
    },

    /**
     * Determines whether auto-coercion is enabled
     *
     * @returns {boolean}
     */
    isAutoCoercionEnabled: function () {
        return this.autoCoercionEnabled;
    }
});

module.exports = ValueCoercer;
