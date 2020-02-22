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
    IterableType = require('../../../src/Type/IterableType'),
    Translator = phpCommon.Translator,
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('IterableType', function () {
    var type,
        valueFactory;

    beforeEach(function () {
        valueFactory = new ValueFactory();

        type = new IterableType(false);
    });

    describe('allowsNull()', function () {
        it('should return true when set', function () {
            type = new IterableType(true);

            expect(type.allowsNull()).to.be.true;
        });

        it('should return false when set', function () {
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('allowsValue()', function () {
        it('should return true for an iterable', function () {
            var iterableValue = sinon.createStubInstance(Value);
            iterableValue.isIterable.returns(true);

            expect(type.allowsValue(iterableValue)).to.be.true;
        });

        it('should return false for a non-iterable', function () {
            var iterableValue = sinon.createStubInstance(Value);
            iterableValue.isIterable.returns(false);

            expect(type.allowsValue(iterableValue)).to.be.false;
        });

        it('should return true when null given and null is allowed', function () {
            type = new IterableType(true);

            expect(type.allowsValue(valueFactory.createNull())).to.be.true;
        });

        it('should return false when null given but null is disallowed', function () {
            expect(type.allowsValue(valueFactory.createNull())).to.be.false;
        });
    });

    describe('getDisplayName()', function () {
        it('should return "iterable"', function () {
            expect(type.getDisplayName()).to.equal('iterable');
        });
    });

    describe('getExpectedMessage()', function () {
        it('should return the correct message', function () {
            var translator = sinon.createStubInstance(Translator);
            translator.translate
                .callsFake(function (translationKey, placeholderVariables) {
                    return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
                });

            expect(type.getExpectedMessage(translator)).to.equal('iterable');
        });
    });

    describe('isScalar()', function () {
        it('should return false', function () {
            expect(type.isScalar()).to.be.false;
        });
    });
});
