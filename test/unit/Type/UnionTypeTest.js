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
    CallableType = require('../../../src/Type/CallableType'),
    Class = require('../../../src/Class').sync(),
    ClassType = require('../../../src/Type/ClassType'),
    ScalarType = require('../../../src/Type/ScalarType'),
    Translator = phpCommon.Translator,
    UnionType = require('../../../src/Type/UnionType');

describe('UnionType', function () {
    var callableSubType,
        classSubType,
        classSubTypes,
        createType,
        flow,
        futureFactory,
        otherSubTypes,
        scalarBooleanSubType,
        scalarFloatSubType,
        scalarSubTypesByPriority,
        scalarSubTypesByValueType,
        state,
        translator,
        type,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        translator = sinon.createStubInstance(Translator);
        translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });

        callableSubType = sinon.createStubInstance(CallableType);
        classSubType = sinon.createStubInstance(ClassType);
        scalarBooleanSubType = sinon.createStubInstance(ScalarType);
        scalarFloatSubType = sinon.createStubInstance(ScalarType);

        callableSubType.allowsValue.callsFake(function (value) {
            return futureFactory.createPresent(value.getNative() === 'my_callable');
        });
        callableSubType.coerceValue.returnsArg(0);
        callableSubType.getDisplayName.returns('callable');
        classSubType.allowsValue.returns(futureFactory.createPresent(false));
        classSubType.coerceValue.returnsArg(0);
        classSubType.getDisplayName.returns('MyClass');
        scalarBooleanSubType.allowsValue.callsFake(function (value) {
            return futureFactory.createPresent(value.getType() === 'boolean');
        });
        scalarBooleanSubType.coerceValue.callsFake(function (value) {
            return value.convertForBooleanType();
        });
        scalarBooleanSubType.getDisplayName.returns('bool');
        scalarFloatSubType.allowsValue.callsFake(function (value) {
            return futureFactory.createPresent(value.getType() === 'float');
        });
        scalarFloatSubType.coerceValue.callsFake(function (value) {
            return value.convertForFloatType();
        });
        scalarFloatSubType.getDisplayName.returns('float');

        classSubTypes = [
            classSubType
        ];
        otherSubTypes = [
            callableSubType
        ];
        scalarSubTypesByPriority = [
            scalarFloatSubType,
            scalarBooleanSubType
        ];
        scalarSubTypesByValueType = {
            'boolean': scalarBooleanSubType,
            'float': scalarFloatSubType
        };

        createType = function (nullIsAllowed) {
            type = new UnionType(
                futureFactory,
                flow,
                scalarSubTypesByValueType,
                scalarSubTypesByPriority,
                classSubTypes,
                otherSubTypes,
                nullIsAllowed
            );
        };
        createType(false);
    });

    describe('allowsNull()', function () {
        it('should return true when set', function () {
            createType(true);

            expect(type.allowsNull()).to.be.true;
        });

        it('should return false when set', function () {
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('allowsValue()', function () {
        it('should return true for a matching callable type', async function () {
            expect(await type.allowsValue(valueFactory.createString('my_callable')).toPromise()).to.be.true;
        });

        it('should return true for a matching boolean type', async function () {
            expect(await type.allowsValue(valueFactory.createBoolean(true)).toPromise()).to.be.true;
        });

        it('should return true for a matching float type', async function () {
            expect(await type.allowsValue(valueFactory.createFloat(987.123)).toPromise()).to.be.true;
        });

        it('should return true for a coercible integer type', async function () {
            expect(await type.allowsValue(valueFactory.createInteger(123)).toPromise()).to.be.true;
        });

        it('should return true for a coercible (to boolean) string type', async function () {
            expect(await type.allowsValue(valueFactory.createString('my string')).toPromise()).to.be.true;
        });

        it('should return true for null when allowed', async function () {
            createType(true);

            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.true;
        });

        it('should return false for null when not allowed', async function () {
            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.false;
        });

        it('should return false for all other types', async function () {
            var classObject = sinon.createStubInstance(Class);

            expect(await type.allowsValue(valueFactory.createArray([21, 101])).toPromise()).to.be.false;
            expect(await type.allowsValue(valueFactory.createObject({}, classObject)).toPromise()).to.be.false;
        });
    });

    describe('coerceValue()', function () {
        it('should return the value unchanged if one subtype matches exactly', async function () {
            var resultValue = await type.coerceValue(valueFactory.createBoolean(true)).toPromise();

            expect(resultValue.getType()).to.equal('boolean');
            expect(resultValue.getNative()).to.be.true;
        });

        it('should coerce a scalar appropriately', async function () {
            var resultValue = await type.coerceValue(valueFactory.createInteger(123)).toPromise();

            expect(resultValue.getType()).to.equal('float'); // Note int->float conversion.
            expect(resultValue.getNative()).to.equal(123);
        });

        it('should return the value unchanged if no subtypes match', async function () {
            var resource = {my: 'resource'},
                resultValue = await type.coerceValue(valueFactory.createResource('my-type', resource))
                    .toPromise();

            expect(resultValue.getType()).to.equal('resource');
            expect(resultValue.getResource()).to.equal(resource);
        });
    });

    describe('getDisplayName()', function () {
        it('should return the correct concatenated display string', function () {
            expect(type.getDisplayName()).to.equal('MyClass|callable|float|bool');
        });

        it('should return the correct concatenated display string when nullable with multiple other types', function () {
            createType(true);

            expect(type.getDisplayName()).to.equal(
                'MyClass|callable|float|bool|null'
            );
        });

        it('should return the correct concatenated display string when nullable with a single other type', function () {
            classSubTypes = [];
            scalarSubTypesByPriority = [];
            scalarSubTypesByValueType = {};

            createType(true);

            expect(type.getDisplayName()).to.equal(
                // Note use of "?<Type>" shorthand in this scenario.
                '?callable'
            );
        });
    });

    describe('getExpectedMessage()', function () {
        it('should return the correct message', function () {
            expect(type.getExpectedMessage(translator)).to.equal(
                '[Translated] core.of_generic_type_expected {"expectedType":"MyClass|callable|float|bool"}'
            );
        });
    });

    describe('isScalar()', function () {
        it('should return false', function () {
            expect(type.isScalar()).to.be.false;
        });
    });
});
