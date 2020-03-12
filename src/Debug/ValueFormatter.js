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
    /**
     * Formats the elements of an ArrayValue as a devtools formatter structure
     *
     * @param {ArrayValue} arrayValue
     * @param {DebugFactory} debugFactory
     * @returns {*[]}
     */
    formatArrayElements = function (arrayValue, debugFactory) {
        var elements = [
                'table',
                {}
            ];

        _.each(arrayValue.getKeys(), function (keyValue) {
            var element = arrayValue.getElementByKey(keyValue),
                keyString = keyValue.getNative();

            // Display the keys of elements with string keys in quotes
            if (keyValue.getType() === 'string') {
                keyString = '"' + keyString + '"';
            }

            elements.push([
                'tr',
                {},
                [
                    'td',
                    {
                        'style': 'font-weight: bold;'
                    },
                    // Prefix the key of elements that are references with an ampersand
                    (element.isReference() ? '&' : '') + keyString + ':'
                ],
                [
                    'td',
                    {},
                    // Format the element recursively with a DebugValue
                    // (custom object formatter should be called again if/when expanded in debugger)
                    ['object', {object: debugFactory.createValue(element.getValue())}]
                ]
            ]);
        });

        return elements;
    };

/**
 * Debugging value formatter for Chrome's Developer Tools
 *
 * @param {DebugFactory} debugFactory
 * @constructor
 */
function ValueFormatter(debugFactory) {
    /**
     * @type {DebugFactory}
     */
    this.debugFactory = debugFactory;
}

_.extend(ValueFormatter.prototype, {
    /**
     * Formats a value for display in Chrome's dev tools
     *
     * @param {Value} value
     * @returns {{headingStyle: string, headingValue: (string|number), attributes: object[]}}
     */
    format: function (value) {
        var attributes = [],
            formatter = this,
            headingValue = null,
            headingStyle = '',
            nativeValue = value.getNative(),
            prototype;

        if (value.getType() === 'array') {
            headingValue = 'Array[' + value.getLength() + ']';
            attributes.push(
                {
                    name: 'length',
                    value: value.getLength(),
                    style: 'color: blue;'
                },
                {
                    name: 'elements',
                    value: formatArrayElements(value, formatter.debugFactory)
                }
            );
        } else if (value.getType() === 'null') {
            headingValue = '<null>';
            headingStyle = 'font-weight: bold;';
        } else if (value.getType() === 'object') {
            if (value.getClassName() === 'JSObject') {
                attributes.push({
                    name: 'PHP class',
                    value: 'JSObject'
                });

                if (typeof nativeValue === 'function') {
                    headingValue = '<JS:function ' + nativeValue.name + '()>';

                    attributes.push({
                        name: 'JS class',
                        value: '(Function)'
                    });
                } else {
                    prototype = Object.getPrototypeOf(nativeValue);

                    if (prototype.constructor) {
                        headingValue = '<JS:' + prototype.constructor.name + '>';

                        attributes.push({
                            name: 'JS class',
                            value: prototype.constructor.name
                        });
                    } else {
                        headingValue = '<JS:Object>';

                        attributes.push({
                            name: 'JS class',
                            value: '(anonymous)'
                        });
                    }
                }
            } else {
                headingValue = '<' + value.getClassName() + '>';

                attributes.push({
                    name: 'class',
                    value: value.getClassName()
                });
            }
        } else if (
            value.getType() === 'int' ||
            value.getType() === 'float' ||
            value.getType() === 'boolean'
        ) {
            headingValue = nativeValue;
            headingStyle = 'color: blue;';
        } else if (value.getType() === 'string') {
            headingValue = '"' + nativeValue + '"';
            headingStyle = 'color: red;';
        }

        return {
            attributes: attributes,
            headingStyle: headingStyle,
            headingValue: headingValue
        };
    }
});

module.exports = ValueFormatter;
