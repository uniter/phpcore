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
 * Debugging value formatter for Chrome's Developer Tools
 *
 * @constructor
 */
function ValueFormatter() {

}

_.extend(ValueFormatter.prototype, {
    /**
     * Formats a value for display in Chrome's dev tools
     *
     * @param {Value} value
     * @returns {{displayValue: (string|number), style: string}}
     */
    format: function (value) {
        var nativeValue = value.getNative(),
            displayValue = nativeValue,
            prototype,
            style = '';

        if (value.getType() === 'null') {
            displayValue = '<null>';
            style += 'font-weight: bold;';
        } else if (value.getType() === 'object') {
            if (value.getClassName() === 'JSObject') {
                if (typeof nativeValue === 'function') {
                    displayValue = '<JS:function ' + nativeValue.name + '()>';
                } else {
                    prototype = Object.getPrototypeOf(nativeValue);
                    displayValue = prototype.constructor ?
                    '<JS:' + prototype.constructor.name + '>' :
                        '<JS:Object>';
                }
            } else {
                displayValue = '<' + value.getClassName() + '>';
            }
        } else if (
            value.getType() === 'integer' ||
            value.getType() === 'float' ||
            value.getType() === 'boolean'
        ) {
            style += 'color: blue;';
        } else if (value.getType() === 'string') {
            displayValue = '"' + nativeValue + '"';
            style += 'color: red;';
        }

        return {
            displayValue: displayValue,
            style: style
        };
    }
});

module.exports = ValueFormatter;
