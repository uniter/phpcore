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
    ClassType = require('../../../src/Type/ClassType'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    Translator = phpCommon.Translator;

describe('ClassType', function () {
    var futureFactory,
        state,
        type,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        type = new ClassType(futureFactory, 'My\\Fqcn\\ToMyClass', false);
    });

    describe('allowsNull()', function () {
        it('should return true when set', function () {
            type = new ClassType(futureFactory, 'My\\Fqcn\\ToMyClass', true);

            expect(type.allowsNull()).to.be.true;
        });

        it('should return false when set', function () {
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('allowsValue()', function () {
        it('should return true for an instance of the class', async function () {
            var objectValue = sinon.createStubInstance(ObjectValue);
            objectValue.classIs
                .withArgs('My\\Fqcn\\ToMyClass')
                .returns(true);
            objectValue.getType.returns('object');

            expect(await type.allowsValue(objectValue).toPromise()).to.be.true;
        });

        it('should return false for an object that is not an instance of the class', async function () {
            var objectValue = sinon.createStubInstance(ObjectValue);
            objectValue.classIs
                .withArgs('My\\Fqcn\\ToMyClass')
                .returns(false);
            objectValue.getType.returns('object');

            expect(await type.allowsValue(objectValue).toPromise()).to.be.false;
        });

        it('should return false for an array', async function () {
            var value = valueFactory.createArray([21]);

            expect(await type.allowsValue(value).toPromise()).to.be.false;
        });

        it('should return false for a boolean', async function () {
            var value = valueFactory.createBoolean(true);

            expect(await type.allowsValue(value).toPromise()).to.be.false;
        });

        it('should return false for a float', async function () {
            var value = valueFactory.createFloat(123.456);

            expect(await type.allowsValue(value).toPromise()).to.be.false;
        });

        it('should return false for an integer', async function () {
            var value = valueFactory.createInteger(4321);

            expect(await type.allowsValue(value).toPromise()).to.be.false;
        });

        it('should return false for null', async function () {
            var value = valueFactory.createNull();

            expect(await type.allowsValue(value).toPromise()).to.be.false;
        });

        it('should return false for a string', async function () {
            var value = valueFactory.createString('my string');

            expect(await type.allowsValue(value).toPromise()).to.be.false;
        });

        it('should return true when null given and null is allowed', async function () {
            type = new ClassType(futureFactory, 'My\\Fqcn\\ToMyClass', true);

            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.true;
        });

        it('should return false when null given but null is disallowed', async function () {
            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.false;
        });
    });

    describe('getDisplayName()', function () {
        it('should return the FQCN', function () {
            expect(type.getDisplayName()).to.equal('My\\Fqcn\\ToMyClass');
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
                '[Translated] core.instance_of_type_expected {"expectedType":"My\\\\Fqcn\\\\ToMyClass"}'
            );
        });
    });

    describe('isScalar()', function () {
        it('should return false', function () {
            expect(type.isScalar()).to.be.false;
        });
    });
});
