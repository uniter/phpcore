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
    expect = require('chai').expect,
    sinon = require('sinon'),
    tools = require('../tools'),
    NumericParse = require('../../../src/Semantics/NumericParse'),
    NumericParseFactory = require('../../../src/Semantics/NumericParseFactory'),
    NumericStringParser = require('../../../src/Semantics/NumericStringParser');

describe('NumericStringParser', function () {
    var futureFactory,
        numericParseFactory,
        parser,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        numericParseFactory = sinon.createStubInstance(NumericParseFactory);
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        numericParseFactory.createParse.callsFake(function (match) {
            return new NumericParse(valueFactory, match);
        });

        parser = new NumericStringParser(valueFactory, numericParseFactory);
    });

    describe('parseNumericString()', function () {
        _.each({
            'parsing a positive plain integer to int': {
                string: '21',
                expectedType: 'int',
                expectedValue: 21,
                expectedFullyNumeric: true
            },
            'parsing a negative plain integer to int': {
                string: '-21',
                expectedType: 'int',
                expectedValue: -21,
                expectedFullyNumeric: true
            },
            'parsing a positive plain float to float': {
                string: '27.123',
                expectedType: 'float',
                expectedValue: 27.123,
                expectedFullyNumeric: true
            },
            'parsing a positive float with no decimal places': {
                string: '27.',
                expectedType: 'float',
                expectedValue: 27,
                expectedFullyNumeric: true
            },
            'parsing a negative plain float to float': {
                string: '-27.123',
                expectedType: 'float',
                expectedValue: -27.123,
                expectedFullyNumeric: true
            },
            'parsing a negative plain float without leading zero to float': {
                string: '-.123',
                expectedType: 'float',
                expectedValue: -0.123,
                expectedFullyNumeric: true
            },
            'parsing an implicitly positive exponent (will give an integer result, but as a float)': {
                string: '1e4',
                expectedType: 'float', // Exponents are always evaluated to floats.
                expectedValue: 10000,
                expectedFullyNumeric: true
            },
            'parsing an explicitly positive exponent (will give an integer result, but as a float)': {
                string: '1e+4',
                expectedType: 'float', // Exponents are always evaluated to floats.
                expectedValue: 10000,
                expectedFullyNumeric: true
            },
            'parsing a lowercase exponent with float result': {
                string: '1e-3',
                expectedType: 'float',
                expectedValue: 0.001,
                expectedFullyNumeric: true
            },
            'parsing an uppercase exponent with float result': {
                string: '1E-3',
                expectedType: 'float',
                expectedValue: 0.001,
                expectedFullyNumeric: true
            },
            'parsing an integer with leading whitespace': {
                string: '     21',
                expectedType: 'int',
                expectedValue: 21,
                expectedFullyNumeric: true
            },
            'parsing an integer with trailing whitespace': {
                string: '21   ',
                expectedType: 'int',
                expectedValue: 21,
                expectedFullyNumeric: true
            },
            'parsing a float with leading and trailing whitespace': {
                string: '     27.123   ',
                expectedType: 'float',
                expectedValue: 27.123,
                expectedFullyNumeric: true
            },
            'parsing an integer followed by lowercase "e"': {
                string: '21 e',
                expectedType: 'int',
                expectedValue: 21,
                expectedFullyNumeric: false // Note this string is only leading-numeric.
            },
            'parsing a non-numeric string': {
                string: 'not a num',
                expectedType: null
            },
            'parsing a non-numeric string that ends with a number': {
                string: 'not a num 987',
                expectedType: null
            },
            'parsing a non-numeric string containing lowercase "e"': {
                string: 'my number',
                expectedType: null
            },
            'parsing a non-numeric string containing uppercase "E"': {
                string: 'my numbEr',
                expectedType: null
            }
        }, function (scenario, description) {
            describe(description, function () {
                var parse;

                beforeEach(function () {
                    parse = parser.parseNumericString(scenario.string);
                });

                if (scenario.expectedType !== null) {
                    it('should parse the correct type', function () {
                        expect(parse.getType()).to.equal(scenario.expectedType);
                    });

                    it('should parse the correct value', function () {
                        var value = parse.toValue();

                        expect(value.getNative()).to.equal(scenario.expectedValue);
                    });

                    it('should' + (scenario.expectedFullyNumeric ? '' : ' not') + ' be fully numeric', function () {
                        expect(parse.isFullyNumeric()).to.equal(scenario.expectedFullyNumeric);
                    });
                } else {
                    it('should return null', function () {
                        expect(parse).to.be.null;
                    });
                }
            });
        });
    });
});
