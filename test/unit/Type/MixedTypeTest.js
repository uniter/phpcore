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
    MixedType = require('../../../src/Type/MixedType'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    Translator = phpCommon.Translator,
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('MixedType', function () {
    var type,
        valueFactory;

    beforeEach(function () {
        valueFactory = new ValueFactory();

        type = new MixedType(false);
    });

    describe('allowsNull()', function () {
        it('should return true', function () {
            expect(type.allowsNull()).to.be.true;
        });
    });

    describe('allowsValue()', function () {
        it('should return true for an array', function () {
            var value = valueFactory.createArray([21]);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return true for a boolean', function () {
            var value = valueFactory.createBoolean(false);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return true for a float', function () {
            var value = valueFactory.createFloat(123.456);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return true for an integer', function () {
            var value = valueFactory.createInteger(21);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return true for null', function () {
            var value = valueFactory.createNull();

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return true for an object', function () {
            var value = sinon.createStubInstance(ObjectValue);
            value.getType.returns('object');

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return true for a string', function () {
            var value = valueFactory.createString('my string');

            expect(type.allowsValue(value)).to.be.true;
        });
    });

    describe('getDisplayName()', function () {
        it('should return "mixed"', function () {
            expect(type.getDisplayName()).to.equal('mixed');
        });
    });

    describe('getExpectedMessage()', function () {
        it('should return the correct message', function () {
            var translator = sinon.createStubInstance(Translator);
            translator.translate
                .callsFake(function (translationKey, placeholderVariables) {
                    return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
                });

            expect(type.getExpectedMessage(translator)).to.equal('mixed');
        });
    });

    describe('isScalar()', function () {
        it('should return false', function () {
            expect(type.isScalar()).to.be.false;
        });
    });
});
