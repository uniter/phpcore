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
    ObjectType = require('../../../src/Type/ObjectType'),
    Class = require('../../../src/Class').sync(),
    Translator = phpCommon.Translator;

describe('ObjectType', function () {
    var futureFactory,
        state,
        type,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        type = new ObjectType(futureFactory, false);
    });

    describe('allowsNull()', function () {
        it('should return true when set', function () {
            type = new ObjectType(futureFactory, true);

            expect(type.allowsNull()).to.be.true;
        });

        it('should return false when set', function () {
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('allowsValue()', function () {
        it('should return true for an object', async function () {
            var classObject = sinon.createStubInstance(Class);

            expect(await type.allowsValue(valueFactory.createObject({}, classObject)).toPromise()).to.be.true;
        });

        it('should return false for all other types', async function () {
            expect(await type.allowsValue(valueFactory.createArray([21])).toPromise()).to.be.false;
            expect(await type.allowsValue(valueFactory.createBoolean(true)).toPromise()).to.be.false;
            expect(await type.allowsValue(valueFactory.createFloat(987.123)).toPromise()).to.be.false;
            expect(await type.allowsValue(valueFactory.createInteger(123)).toPromise()).to.be.false;
            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.false;
            expect(await type.allowsValue(valueFactory.createString('my string')).toPromise()).to.be.false;
        });
    });

    describe('coerceValue()', function () {
        it('should return the value unchanged', function () {
            var classObject = sinon.createStubInstance(Class),
                value = valueFactory.createObject({}, classObject);

            expect(type.coerceValue(value)).to.equal(value);
        });
    });

    describe('createEmptyScalarValue()', function () {
        it('should return null since objects are not scalar types', function () {
            expect(type.createEmptyScalarValue()).to.be.null;
        });
    });

    describe('getDisplayName()', function () {
        it('should return "object"', function () {
            expect(type.getDisplayName()).to.equal('object');
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
                '[Translated] core.of_generic_type_expected {"expectedType":"object"}'
            );
        });
    });

    describe('isScalar()', function () {
        it('should return false', function () {
            expect(type.isScalar()).to.be.false;
        });
    });
});
