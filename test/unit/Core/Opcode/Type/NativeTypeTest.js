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

    describe('allowsValue()', function () {
        describe('when "boolean"', function () {
            it('should return true when given correct native type', function () {
                createType('boolean');

                expect(type.allowsValue(true)).to.be.true;
            });

            it('should return false when given an incorrect type', function () {
                createType('boolean');

                expect(type.allowsValue(1234)).to.be.false;
            });
        });

        describe('when "string"', function () {
            it('should return true when given correct native type', function () {
                createType('string');

                expect(type.allowsValue('my string')).to.be.true;
            });

            it('should return false when given an incorrect type', function () {
                createType('string');

                expect(type.allowsValue(1234)).to.be.false;
            });
        });

        describe('when "null"', function () {
            it('should return true when given correct native type', function () {
                createType('null');

                expect(type.allowsValue(null)).to.be.true;
            });

            it('should return false when given an incorrect type', function () {
                createType('null');

                expect(type.allowsValue('not null')).be.false;
            });
        });

        describe('when "number"', function () {
            it('should return a value of correct native type', function () {
                createType('number');

                expect(type.allowsValue(321)).to.be.true;
            });

            it('should return false when given an incorrect type', function () {
                createType('number');

                expect(type.allowsValue('not a number')).be.false;
            });
        });

        describe('when "undefined"', function () {
            it('should return a value of correct native type', function () {
                createType('undefined');

                expect(type.allowsValue(undefined)).to.be.true;
            });

            it('should return false when given an incorrect type', function () {
                createType('undefined');

                expect(type.allowsValue('not undefined')).be.false;
            });
        });
    });

    describe('coerceValue()', function () {
        describe('when "boolean"', function () {
            it('should return a value of correct native type', function () {
                createType('boolean');

                expect(type.coerceValue(true)).to.equal(true);
            });

            it('should throw when given an incorrect type', function () {
                createType('boolean');

                expect(function () {
                    type.coerceValue(1234);
                }).to.throw(
                    Exception,
                    'Unexpected value of type "number" provided for NativeType<boolean>'
                );
            });
        });

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

        describe('when "null"', function () {
            it('should return a value of correct native type', function () {
                createType('null');

                expect(type.coerceValue(null)).to.be.null;
            });

            it('should throw when given an incorrect type', function () {
                createType('null');

                expect(function () {
                    type.coerceValue('not null');
                }).to.throw(
                    Exception,
                    'Unexpected value of type "string" provided for NativeType<null>'
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

        describe('when "undefined"', function () {
            it('should return a value of correct native type', function () {
                createType('undefined');

                expect(type.coerceValue(undefined)).to.equal(undefined);
            });

            it('should throw when given an incorrect type', function () {
                createType('undefined');

                expect(function () {
                    type.coerceValue('not undefined');
                }).to.throw(
                    Exception,
                    'Unexpected value of type "string" provided for NativeType<undefined>'
                );
            });
        });
    });

    describe('getDisplayName()', function () {
        it('should return the correct string for "boolean" native type', function () {
            createType('boolean');

            // Note that the short form "bool" is used.
            expect(type.getDisplayName()).to.equal('bool');
        });

        it('should return the correct string for "null" native type', function () {
            createType('null');

            expect(type.getDisplayName()).to.equal('null');
        });

        it('should return the correct string for "number" native type', function () {
            createType('number');

            expect(type.getDisplayName()).to.equal('number');
        });

        it('should return the correct string for "string" native type', function () {
            createType('string');

            expect(type.getDisplayName()).to.equal('string');
        });

        it('should return the correct string for "undefined" native type', function () {
            createType('undefined');

            expect(type.getDisplayName()).to.equal('undefined');
        });
    });
});
