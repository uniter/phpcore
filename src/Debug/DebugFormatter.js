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
    DebugValue = require('./DebugValue'),
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
     * @param {DebugVariable|DebugValue} debugVariable
     * @returns {[]}
     */
    body: function (debugVariable) {
        var value = debugVariable.getValue(),
            formattedValue = this.valueFormatter.format(value),
            structure = [
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
                ]
            ];

        function addAttribute(name, value, style) {
            structure.push([
                'tr',
                {},
                [
                    'td',
                    {
                        'style': 'font-weight: bold;'
                    },
                    name + ':'
                ],
                [
                    'td',
                    {
                        'style': style
                    },
                    value
                ]
            ]);
        }

        if (formattedValue.attributes.length === 0) {
            // No attributes provided, only value, so add value as the only attribute
            // so that the value can be expanded in the debugger to see its type along with value
            addAttribute('value', formattedValue.headingValue, formattedValue.headingStyle);
        } else {
            _.each(formattedValue.attributes, function (attribute) {
                addAttribute(attribute.name, attribute.value, attribute.style);
            });
        }

        return structure;
    },

    /**
     * Returns true if the value can be expanded with .body(...) above, false otherwise
     *
     * @param {DebugVariable|DebugValue|*} debugVariable
     * @returns {boolean}
     */
    hasBody: function (debugVariable) {
        return (debugVariable instanceof DebugVariable && debugVariable.isDefined()) ||
            debugVariable instanceof DebugValue;
    },

    /**
     * Formats a minimal/inline view of a PHP variable in Chrome's dev tools
     *
     * @param {DebugVariable|DebugValue|*} debugVariable
     * @returns {[]}
     */
    header: function (debugVariable) {
        var formattedValue,
            value;

        if (!(debugVariable instanceof DebugVariable) && !(debugVariable instanceof DebugValue)) {
            return null;
        }

        if (!debugVariable.isDefined()) {
            return ['span', {'style': 'text-style: italic; color: gray;'}, '<undefined>'];
        }

        value = debugVariable.getValue();

        formattedValue = this.valueFormatter.format(value);

        return ['span', {'style': formattedValue.headingStyle}, formattedValue.headingValue];
    }
});

module.exports = DebugFormatter;
