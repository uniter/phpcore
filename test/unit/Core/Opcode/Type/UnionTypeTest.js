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
    sinon = require('sinon'),
    Exception = phpCommon.Exception,
    TypeInterface = require('../../../../../src/Core/Opcode/Type/TypeInterface'),
    UnionType = require('../../../../../src/Core/Opcode/Type/UnionType');

describe('Opcode UnionType', function () {
    var subType1,
        subType2,
        type;

    beforeEach(function () {
        subType1 = sinon.createStubInstance(TypeInterface);
        subType2 = sinon.createStubInstance(TypeInterface);

        subType1.allowsValue
            .withArgs('my first allowed value')
            .returns(true);
        subType1.allowsValue
            .returns(false);
        subType1.coerceValue
            .withArgs('my first allowed value')
            .returns('my first coerced value');
        subType1.getDisplayName
            .returns('first_type');
        subType2.allowsValue
            .withArgs('my second allowed value')
            .returns(true);
        subType2.allowsValue
            .returns(false);
        subType2.coerceValue
            .withArgs('my second allowed value')
            .returns('my second coerced value');
        subType2.getDisplayName
            .returns('second_type');

        type = new UnionType([subType1, subType2]);
    });

    describe('allowsValue()', function () {
        it('should return true for a value that matches subtype 1', function () {
            expect(type.allowsValue('my first allowed value')).to.be.true;
        });

        it('should return true for a value that matches subtype 2', function () {
            expect(type.allowsValue('my second allowed value')).to.be.true;
        });

        it('should return false for a value that matches neither subtype', function () {
            expect(type.allowsValue('my disallowed value')).to.be.false;
        });
    });

    describe('coerceValue()', function () {
        it('should return the value coerced via subtype 1 when that matches', function () {
            expect(type.coerceValue('my first allowed value')).to.equal('my first coerced value');
        });

        it('should return the value coerced via subtype 2 when that matches', function () {
            expect(type.coerceValue('my second allowed value')).to.equal('my second coerced value');
        });

        it('should throw when given a value that matches neither subtype', function () {
            expect(function () {
                type.coerceValue('my disallowed value');
            }).to.throw(
                Exception,
                'Unexpected value provided for UnionType<first_type|second_type>'
            );
        });
    });

    describe('getDisplayName()', function () {
        it('should return a representation of all the subtypes', function () {
            expect(type.getDisplayName()).to.equal('first_type|second_type');
        });
    });
});
