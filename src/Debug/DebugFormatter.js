/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    DebugVariable = require('./DebugVariable');

/**
 * Debugging variable formatter for Chrome's Developer Tools
 *
 * @param {ValueFormatter} valueFormatter
 * @constructor
 */
function DebugFormatter(valueFormatter) {
    /**
     * @type {ValueFormatter}
     */
    this.valueFormatter = valueFormatter;
}

_.extend(DebugFormatter.prototype, {
    /**
     * Formats an "expanded" view of a PHP variable in Chrome's dev tools
     *
     * @param {DebugVariable|*} debugVariable
     * @returns {[]}
     */
    body: function (debugVariable) {
        var value = debugVariable.getValue(),
            formattedValue = this.valueFormatter.format(value);

        return [
            'table',
            {},
            [
                'tr',
                {},
                [
                    'td',
                    {
                        'style': 'font-weight: bold;'
                    },
                    'type:'
                ],
                [
                    'td',
                    {},
                    value.getType()
                ]
            ],
            [
                'tr',
                {},
                [
                    'td',
                    {
                        'style': 'font-weight: bold;'
                    },
                    'value:'
                ],
                [
                    'td',
                    {
                        'style': formattedValue.style
                    },
                    formattedValue.displayValue
                ]
            ]
        ];
    },

    /**
     * Returns true if the value can be expanded with .body(...) above, false otherwise
     *
     * @param {DebugVariable|*} debugVariable
     * @returns {boolean|*}
     */
    hasBody: function (debugVariable) {
        return debugVariable instanceof DebugVariable && debugVariable.isDefined();
    },

    /**
     * Formats a minimal/inline view of a PHP variable in Chrome's dev tools
     *
     * @param {DebugVariable|object} debugVariable
     * @returns {[]}
     */
    header: function (debugVariable) {
        var formattedValue,
            value;

        if (!(debugVariable instanceof DebugVariable)) {
            return null;
        }

        if (!debugVariable.isDefined()) {
            return ['span', {'style': 'text-style: italic; color: gray;'}, '<undefined>'];
        }

        value = debugVariable.getValue();

        formattedValue = this.valueFormatter.format(value);

        return ['span', {'style': formattedValue.style}, formattedValue.displayValue];
    }
});

module.exports = DebugFormatter;
