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
    DebugVariable = require('../../../src/Debug/DebugVariable'),
    Value = require('../../../src/Value').sync(),
    ValueFormatter = require('../../../src/Debug/ValueFormatter');

describe('DebugFormatter', function () {
    beforeEach(function () {
        this.debugVariable = sinon.createStubInstance(DebugVariable);
        this.value = sinon.createStubInstance(Value);
        this.valueFormatter = sinon.createStubInstance(ValueFormatter);

        this.debugVariable.getValue.returns(this.value);
        this.debugVariable.isDefined.returns(true);
        this.value.getType.returns('string');
        this.valueFormatter.format.withArgs(this.value).returns({
            style: 'font-weight: bold;color: red;',
            displayValue: 'some display value'
        });

        this.formatter = new DebugFormatter(this.valueFormatter);
    });

    describe('body()', function () {
        it('should display a value correctly', function () {
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
    });

    describe('hasBody()', function () {
        it('should return true for a defined PHP variable', function () {
            expect(this.formatter.hasBody(this.debugVariable)).to.be.true;
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
        it('should display a defined value correctly', function () {
            expect(this.formatter.header(this.debugVariable)).to.deep.equal([
                'span',
                {'style': 'font-weight: bold;color: red;'},
                'some display value'
            ]);
        });

        it('should display an undefined value correctly', function () {
            this.debugVariable.isDefined.returns(false);

            expect(this.formatter.header(this.debugVariable)).to.deep.equal([
                'span',
                {'style': 'text-style: italic; color: gray;'},
                '<undefined>'
            ]);
        });

        it('should ignore non-DebugVariable values', function () {
            expect(this.formatter.header(21)).to.be.null;
        });
    });
});
