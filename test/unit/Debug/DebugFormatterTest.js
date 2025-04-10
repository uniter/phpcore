/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var expect = require('chai').expect,
    sinon = require('sinon'),
    DebugFormatter = require('../../../src/Debug/DebugFormatter'),
    DebugValue = require('../../../src/Debug/DebugValue'),
    DebugVariable = require('../../../src/Debug/DebugVariable'),
    Value = require('../../../src/Value').sync(),
    ValueFormatter = require('../../../src/Debug/ValueFormatter');

describe('DebugFormatter', function () {
    var debugValue,
        debugVariable,
        formattedValueAttributes,
        formatter,
        value,
        valueFormatter;

    beforeEach(function () {
        debugValue = sinon.createStubInstance(DebugValue);
        debugVariable = sinon.createStubInstance(DebugVariable);
        value = sinon.createStubInstance(Value);
        valueFormatter = sinon.createStubInstance(ValueFormatter);

        debugValue.getValue.returns(value);
        debugValue.isDefined.returns(true);
        debugVariable.getValue.returns(value);
        debugVariable.isDefined.returns(true);
        value.getType.returns('string');
        formattedValueAttributes = [];
        valueFormatter.format.withArgs(sinon.match.same(value)).returns({
            headingStyle: 'font-weight: bold;color: red;',
            headingValue: 'some display value',
            attributes: formattedValueAttributes
        });

        formatter = new DebugFormatter(valueFormatter);
    });

    describe('body()', function () {
        it('should display the value correctly when value formatter returns no specific attributes', function () {
            expect(formatter.body(debugVariable)).to.deep.equal([
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
                        'string'
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
                            'style': 'font-weight: bold;color: red;'
                        },
                        'some display value'
                    ]
                ]
            ]);
        });

        it('should display the value correctly when value formatter returns two specific attributes', function () {
            formattedValueAttributes.push(
                {
                    name: 'firstAttr',
                    value: 'my first value',
                    style: 'font-size: 4em;'
                },
                {
                    name: 'secondAttr',
                    value: 'my second value',
                    style: 'font-weight: bold;'
                }
            );

            expect(formatter.body(debugVariable)).to.deep.equal([
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
                        'string'
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
                        'firstAttr:'
                    ],
                    [
                        'td',
                        {
                            'style': 'font-size: 4em;'
                        },
                        'my first value'
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
                        'secondAttr:'
                    ],
                    [
                        'td',
                        {
                            'style': 'font-weight: bold;'
                        },
                        'my second value'
                    ]
                ]
            ]);
        });
    });

    describe('hasBody()', function () {
        it('should return true for a defined PHP variable', function () {
            expect(formatter.hasBody(debugVariable)).to.be.true;
        });

        it('should return true for a DebugValue', function () {
            expect(formatter.hasBody(debugValue)).to.be.true;
        });

        it('should return false for an undefined PHP variable', function () {
            debugVariable.isDefined.returns(false);

            expect(formatter.hasBody(debugVariable)).to.be.false;
        });

        it('should return false for a non-DebugVariable value', function () {
            expect(formatter.hasBody(212)).to.be.false;
        });
    });

    describe('header()', function () {
        it('should display a defined variable\'s value correctly', function () {
            expect(formatter.header(debugVariable)).to.deep.equal([
                'span',
                {'style': 'font-weight: bold;color: red;'},
                'some display value'
            ]);
        });

        it('should display an undefined variable correctly', function () {
            debugVariable.isDefined.returns(false);

            expect(formatter.header(debugVariable)).to.deep.equal([
                'span',
                {'style': 'font-style: italic; color: gray;'},
                '<undefined>'
            ]);
        });

        it('should display a DebugValue correctly', function () {
            expect(formatter.header(debugValue)).to.deep.equal([
                'span',
                {'style': 'font-weight: bold;color: red;'},
                'some display value'
            ]);
        });

        it('should ignore non-DebugVariable and non-DebugValue values', function () {
            expect(formatter.header(21)).to.be.null;
        });
    });
});
