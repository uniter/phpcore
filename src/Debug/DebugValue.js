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
 * Represents a PHP value to be displayed in the devtools debugger
 *
 * @param {Value} value
 * @constructor
 */
function DebugValue(value) {
    /**
     * @type {Value}
     */
    this.value = value;
}

_.extend(DebugValue.prototype, {
    /**
     * Fetches the value this debug value represents
     *
     * @returns {Value}
     */
    getValue: function () {
        return this.value;
    },

    /**
     * Determines whether the value is defined: should always be true
     * (this is shared by the interface of DebugVariable, which may return false
     * if the variable has not (yet) been defined in the scope)
     *
     * @returns {boolean}
     */
    isDefined: function () {
        return true;
    }
});

module.exports = DebugValue;
