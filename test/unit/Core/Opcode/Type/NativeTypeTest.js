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
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception,
    NativeType = require('../../../../../src/Core/Opcode/Type/NativeType');

describe('Opcode NativeType', function () {
    var createType,
        type;

    beforeEach(function () {
        createType = function (nativeTypeName) {
            type = new NativeType(nativeTypeName);
        };
    });

    describe('coerceValue()', function () {
        describe('when "string"', function () {
            it('should return a value of correct native type', function () {
                createType('string');

                expect(type.coerceValue('my string')).to.equal('my string');
            });

            it('should throw when given an incorrect type', function () {
                createType('string');

                expect(function () {
                    type.coerceValue(1234);
                }).to.throw(
                    Exception,
                    'Unexpected value of type "number" provided for NativeType<string>'
                );
            });
        });

        describe('when "number"', function () {
            it('should return a value of correct native type', function () {
                createType('number');

                expect(type.coerceValue(321)).to.equal(321);
            });

            it('should throw when given an incorrect type', function () {
                createType('number');

                expect(function () {
                    type.coerceValue('not a number');
                }).to.throw(
                    Exception,
                    'Unexpected value of type "string" provided for NativeType<number>'
                );
            });
        });
    });
});
