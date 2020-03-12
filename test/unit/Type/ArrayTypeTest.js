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
    ArrayType = require('../../../src/Type/ArrayType'),
    Class = require('../../../src/Class').sync(),
    Translator = phpCommon.Translator,
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('ArrayType', function () {
    var type,
        valueFactory;

    beforeEach(function () {
        valueFactory = new ValueFactory();

        type = new ArrayType(false);
    });

    describe('allowsNull()', function () {
        it('should return true when set', function () {
            type = new ArrayType(true);

            expect(type.allowsNull()).to.be.true;
        });

        it('should return false when set', function () {
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('allowsValue()', function () {
        it('should return true for an array', function () {
            expect(type.allowsValue(valueFactory.createArray([21, 101]))).to.be.true;
        });

        it('should return false for all other types', function () {
            var classObject = sinon.createStubInstance(Class);

            expect(type.allowsValue(valueFactory.createBoolean(true))).to.be.false;
            expect(type.allowsValue(valueFactory.createFloat(987.123))).to.be.false;
            expect(type.allowsValue(valueFactory.createInteger(123))).to.be.false;
            expect(type.allowsValue(valueFactory.createNull())).to.be.false;
            expect(type.allowsValue(valueFactory.createObject({}, classObject))).to.be.false;
            expect(type.allowsValue(valueFactory.createString('my string'))).to.be.false;
        });
    });

    describe('getDisplayName()', function () {
        it('should return "array"', function () {
            expect(type.getDisplayName()).to.equal('array');
        });
    });

    describe('getExpectedMessage()', function () {
        it('should return the correct message', function () {
            var translator = sinon.createStubInstance(Translator);
            translator.translate
                .callsFake(function (translationKey, placeholderVariables) {
                    return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
                });

            expect(type.getExpectedMessage(translator)).to.equal(
                '[Translated] core.of_generic_type_expected {"expectedType":"array"}'
            );
        });
    });

    describe('isScalar()', function () {
        it('should return false', function () {
            expect(type.isScalar()).to.be.false;
        });
    });
});
