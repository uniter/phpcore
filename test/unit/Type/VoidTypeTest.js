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
    Exception = phpCommon.Exception,
    ObjectValue = require('../../../src/Value/Object').sync(),
    Translator = phpCommon.Translator,
    VoidType = require('../../../src/Type/VoidType');

describe('VoidType', function () {
    var futureFactory,
        state,
        type,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        type = new VoidType(futureFactory);
    });

    describe('allowsNull()', function () {
        it('should throw', function () {
            expect(function () {
                type.allowsNull();
            }).to.throw(
                Exception,
                'VoidType.allowsNull() :: Void can only be used as a return type'
            );
        });
    });

    describe('allowsValue()', function () {
        it('should return false for an array', async function () {
            var value = valueFactory.createArray([21]);

            expect(await type.allowsValue(value).toPromise()).to.be.false;
        });

        it('should return false for a boolean', async function () {
            var value = valueFactory.createBoolean(false);

            expect(await type.allowsValue(value).toPromise()).to.be.false;
        });

        it('should return false for a float', async function () {
            var value = valueFactory.createFloat(123.456);

            expect(await type.allowsValue(value).toPromise()).to.be.false;
        });

        it('should return false for an integer', async function () {
            var value = valueFactory.createInteger(21);

            expect(await type.allowsValue(value).toPromise()).to.be.false;
        });

        it('should return true for null', async function () {
            var value = valueFactory.createNull();

            expect(await type.allowsValue(value).toPromise()).to.be.true;
        });

        it('should return false for an object', async function () {
            var value = sinon.createStubInstance(ObjectValue);
            value.getType.returns('object');

            expect(await type.allowsValue(value).toPromise()).to.be.false;
        });

        it('should return false for a string', async function () {
            var value = valueFactory.createString('my string');

            expect(await type.allowsValue(value).toPromise()).to.be.false;
        });
    });

    describe('coerceValue()', function () {
        it('should return the value unchanged', function () {
            var value = valueFactory.createNull();

            expect(type.coerceValue(value)).to.equal(value);
        });
    });

    describe('getDisplayName()', function () {
        it('should return "void"', function () {
            expect(type.getDisplayName()).to.equal('void');
        });
    });

    describe('getExpectedMessage()', function () {
        it('should return the correct message', function () {
            var translator = sinon.createStubInstance(Translator);
            translator.translate
                .callsFake(function (translationKey, placeholderVariables) {
                    return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
                });

            expect(type.getExpectedMessage(translator)).to.equal('void');
        });
    });

    describe('isScalar()', function () {
        it('should return false', function () {
            expect(type.isScalar()).to.be.false;
        });
    });
});
