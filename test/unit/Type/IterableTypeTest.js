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
    tools = require('../tools'),
    IterableType = require('../../../src/Type/IterableType'),
    Translator = phpCommon.Translator,
    Value = require('../../../src/Value').sync();

describe('IterableType', function () {
    var futureFactory,
        state,
        type,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        type = new IterableType(futureFactory, false);
    });

    describe('allowsNull()', function () {
        it('should return true when set', function () {
            type = new IterableType(futureFactory, true);

            expect(type.allowsNull()).to.be.true;
        });

        it('should return false when set', function () {
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('allowsValue()', function () {
        it('should return true for an iterable', async function () {
            var iterableValue = sinon.createStubInstance(Value);
            iterableValue.isIterable.returns(true);

            expect(await type.allowsValue(iterableValue).toPromise()).to.be.true;
        });

        it('should return false for a non-iterable', async function () {
            var iterableValue = sinon.createStubInstance(Value);
            iterableValue.isIterable.returns(false);

            expect(await type.allowsValue(iterableValue).toPromise()).to.be.false;
        });

        it('should return true when null given and null is allowed', async function () {
            type = new IterableType(futureFactory, true);

            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.true;
        });

        it('should return false when null given but null is disallowed', async function () {
            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.false;
        });
    });

    describe('coerceValue()', function () {
        it('should return the value unchanged', function () {
            var value = valueFactory.createArray([21]);

            expect(type.coerceValue(value)).to.equal(value);
        });
    });

    describe('createEmptyScalarValue()', function () {
        it('should return null', function () {
            expect(type.createEmptyScalarValue()).to.be.null;
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

            expect(type.getExpectedMessage(translator)).to.equal(
                '[Translated] core.of_generic_type_expected {"expectedType":"iterable"}'
            );
        });
    });

    describe('isScalar()', function () {
        it('should return false', function () {
            expect(type.isScalar()).to.be.false;
        });
    });
});
