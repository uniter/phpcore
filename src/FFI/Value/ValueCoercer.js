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
 * @param {Flow} flow
 * @param {boolean} autoCoercionEnabled
 * @constructor
 */
function ValueCoercer(flow, autoCoercionEnabled) {
    /**
     * @type {boolean}
     */
    this.autoCoercionEnabled = autoCoercionEnabled;
    /**
     * @type {Flow}
     */
    this.flow = flow;
}

_.extend(ValueCoercer.prototype, {
    /**
     * Unwraps arguments for a method based on the coercion mode for the class
     *
     * @param {Reference[]|Value[]|Variable[]} argumentReferences
     * @returns {FutureInterface<Value[]|*[]>}
     */
    coerceArguments: function (argumentReferences) {
        var coercer = this;

        if (!coercer.autoCoercionEnabled) {
            return coercer.flow.createPresent(argumentReferences);
        }

        return coercer.flow.mapAsync(argumentReferences, function (argumentReference) {
            return argumentReference.getValue()
                .next(function (argumentValue) {
                    return argumentValue.getNative();
                });
        });
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
