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
    beforeEach(function () {
        this.debugValue = sinon.createStubInstance(DebugValue);
        this.debugVariable = sinon.createStubInstance(DebugVariable);
        this.value = sinon.createStubInstance(Value);
        this.valueFormatter = sinon.createStubInstance(ValueFormatter);

        this.debugValue.getValue.returns(this.value);
        this.debugValue.isDefined.returns(true);
        this.debugVariable.getValue.returns(this.value);
        this.debugVariable.isDefined.returns(true);
        this.value.getType.returns('string');
        this.formattedValueAttributes = [];
        this.valueFormatter.format.withArgs(sinon.match.same(this.value)).returns({
            headingStyle: 'font-weight: bold;color: red;',
            headingValue: 'some display value',
            attributes: this.formattedValueAttributes
        });

        this.formatter = new DebugFormatter(this.valueFormatter);
    });

    describe('body()', function () {
        it('should display the value correctly when value formatter returns no specific attributes', function () {
            expect(this.formatter.body(this.debugVariable)).to.deep.equal([
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
            this.formattedValueAttributes.push(
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

            expect(this.formatter.body(this.debugVariable)).to.deep.equal([
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
            expect(this.formatter.hasBody(this.debugVariable)).to.be.true;
        });

        it('should return true for a DebugValue', function () {
            expect(this.formatter.hasBody(this.debugValue)).to.be.true;
        });

        it('should return false for an undefined PHP variable', function () {
            this.debugVariable.isDefined.returns(false);

            expect(this.formatter.hasBody(this.debugVariable)).to.be.false;
        });

        it('should return false for a non-DebugVariable value', function () {
            expect(this.formatter.hasBody(212)).to.be.false;
        });
    });

    describe('header()', function () {
        it('should display a defined variable\'s value correctly', function () {
            expect(this.formatter.header(this.debugVariable)).to.deep.equal([
                'span',
                {'style': 'font-weight: bold;color: red;'},
                'some display value'
            ]);
        });

        it('should display an undefined variable correctly', function () {
            this.debugVariable.isDefined.returns(false);

            expect(this.formatter.header(this.debugVariable)).to.deep.equal([
                'span',
                {'style': 'text-style: italic; color: gray;'},
                '<undefined>'
            ]);
        });

        it('should display a DebugValue correctly', function () {
            expect(this.formatter.header(this.debugValue)).to.deep.equal([
                'span',
                {'style': 'font-weight: bold;color: red;'},
                'some display value'
            ]);
        });

        it('should ignore non-DebugVariable and non-DebugValue values', function () {
            expect(this.formatter.header(21)).to.be.null;
        });
    });
});
