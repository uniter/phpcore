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
    tools = require('../tools'),
    NumericParse = require('../../../src/Semantics/NumericParse');

describe('NumericParse', function () {
    var futureFactory,
        match,
        parse,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        match = [];
        match[3] = '';

        parse = new NumericParse(valueFactory, match);
    });

    describe('getType()', function () {
        it('should return "float" when a float string was matched', function () {
            match[0] = '  12.345 ';
            match[1] = '12.345';

            expect(parse.getType()).to.equal('float');
        });

        it('should return "int" when an integer string was matched', function () {
            match[0] = '  123 ';
            match[2] = '123';

            expect(parse.getType()).to.equal('int');
        });
    });

    describe('isFullyNumeric()', function () {
        it('should return true when the extra capture is empty', function () {
            expect(parse.isFullyNumeric()).to.be.true;
        });

        it('should return false when the extra capture is not empty', function () {
            match[3] = 'some extra';

            expect(parse.isFullyNumeric()).to.be.false;
        });
    });

    describe('toFloatValue()', function () {
        it('should return a float when a float string was matched', function () {
            var value;
            match[1] = 123.456;

            value = parse.toFloatValue();

            expect(value.getType()).to.equal('float');
            expect(value.getNative()).to.equal(123.456);
        });

        it('should return a float even when an integer string was matched', function () {
            var value;
            match[2] = 567;

            value = parse.toFloatValue();

            expect(value.getType()).to.equal('float');
            expect(value.getNative()).to.equal(567);
        });
    });

    describe('toIntegerValue()', function () {
        it('should return an integer as the float truncated when a float string was matched', function () {
            var value;
            match[1] = 123.456;

            value = parse.toIntegerValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(123);
        });

        it('should return an integer when an integer string was matched', function () {
            var value;
            match[2] = 567;

            value = parse.toIntegerValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(567);
        });
    });

    describe('toValue()', function () {
        it('should return a float when a float string was matched', function () {
            var value;
            match[1] = 123.456;

            value = parse.toValue();

            expect(value.getType()).to.equal('float');
            expect(value.getNative()).to.equal(123.456);
        });

        it('should return an integer when an integer string was matched', function () {
            var value;
            match[2] = 567;

            value = parse.toValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(567);
        });
    });
});
