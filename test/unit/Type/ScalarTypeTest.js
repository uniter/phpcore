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
    Class = require('../../../src/Class').sync(),
    ScalarType = require('../../../src/Type/ScalarType'),
    Translator = phpCommon.Translator,
    Value = require('../../../src/Value').sync();

describe('ScalarType', function () {
    var createType,
        futureFactory,
        state,
        type,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        createType = function (scalarType) {
            type = new ScalarType(valueFactory, futureFactory, scalarType, false);
        };
        createType('int');
    });

    describe('allowsNull()', function () {
        it('should return true when set', function () {
            type = new ScalarType(valueFactory, futureFactory, 'boolean', true);

            expect(type.allowsNull()).to.be.true;
        });

        it('should return false when set', function () {
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('allowsValue()', function () {
        describe('when type is boolean', function () {
            beforeEach(function () {
                createType('bool');
            });

            it('should return true for a value of the correct type', async function () {
                var scalarValue = valueFactory.createBoolean(true);

                expect(await type.allowsValue(scalarValue).toPromise()).to.be.true;
            });

            it('should return false for an array', async function () {
                var value = valueFactory.createArray([21]);

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

            it('should return false for null', async function () {
                var value = valueFactory.createNull();

                expect(await type.allowsValue(value).toPromise()).to.be.false;
            });

            it('should return false for an object', async function () {
                var value = valueFactory.createObject({}, sinon.createStubInstance(Class));

                expect(await type.allowsValue(value).toPromise()).to.be.false;
            });

            it('should return false for a string', async function () {
                var value = valueFactory.createString('my string');

                expect(await type.allowsValue(value).toPromise()).to.be.false;
            });
        });

        describe('when type is integer', function () {
            it('should return true for a value of the correct type', async function () {
                var scalarValue = valueFactory.createInteger(21);

                expect(await type.allowsValue(scalarValue).toPromise()).to.be.true;
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

            it('should return false for null', async function () {
                var value = valueFactory.createNull();

                expect(await type.allowsValue(value).toPromise()).to.be.false;
            });

            it('should return false for a string', async function () {
                var value = valueFactory.createString('my string');

                expect(await type.allowsValue(value).toPromise()).to.be.false;
            });
        });

        it('should return true when null given and null is allowed', async function () {
            type = new ScalarType(valueFactory, futureFactory, 'float', true);

            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.true;
        });

        it('should return false when null given but null is disallowed', async function () {
            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.false;
        });
    });

    describe('coerceValue()', function () {
        var convertedValue,
            originalValue;

        beforeEach(function () {
            convertedValue = sinon.createStubInstance(Value);
            originalValue = sinon.createStubInstance(Value);
        });

        it('should convert the value to boolean when the scalar type is boolean', function () {
            originalValue.convertForBooleanType
                .returns(convertedValue);
            createType('bool');

            expect(type.coerceValue(originalValue)).to.equal(convertedValue);
        });

        it('should convert the value to float when the type scalar is float', function () {
            originalValue.convertForFloatType
                .returns(convertedValue);
            createType('float');

            expect(type.coerceValue(originalValue)).to.equal(convertedValue);
        });

        it('should convert the value to integer when the scalar type is integer', function () {
            originalValue.convertForIntegerType
                .returns(convertedValue);
            createType('int');

            expect(type.coerceValue(originalValue)).to.equal(convertedValue);
        });

        it('should convert the value to string when the scalar type is string', function () {
            originalValue.convertForStringType
                .returns(convertedValue);
            createType('string');

            expect(type.coerceValue(originalValue)).to.equal(convertedValue);
        });

        it('should raise an exception for an invalid scalar type', function () {
            createType('invalidtype');

            expect(function () {
                type.coerceValue(originalValue);
            }).to.throw('Unknown scalar type "invalidtype"');
        });
    });

    describe('createEmptyScalarValue()', function () {
        it('should return false for boolean type', function () {
            const type = new ScalarType(valueFactory, futureFactory, 'bool', false);

            const result = type.createEmptyScalarValue();

            expect(result.getType()).to.equal('boolean');
            expect(result.getNative()).to.be.false;
        });

        it('should return 0.0 for float type', function () {
            const type = new ScalarType(valueFactory, futureFactory, 'float', false);

            const result = type.createEmptyScalarValue();

            expect(result.getType()).to.equal('float');
            expect(result.getNative()).to.equal(0);
        });

        it('should return 0 for integer type', function () {
            const type = new ScalarType(valueFactory, futureFactory, 'int', false);

            const result = type.createEmptyScalarValue();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(0);
        });

        it('should return empty string for string type', function () {
            const type = new ScalarType(valueFactory, futureFactory, 'string', false);

            const result = type.createEmptyScalarValue();

            expect(result.getType()).to.equal('string');
            expect(result.getNative()).to.equal('');
        });

        it('should throw an error for an invalid scalar type', function () {
            const type = new ScalarType(valueFactory, futureFactory, 'invalid', false);

            expect(function () {
                type.createEmptyScalarValue();
            }).to.throw('Unknown scalar type "invalid"');
        });
    });

    describe('getDisplayName()', function () {
        it('should return the scalar type name', function () {
            expect(type.getDisplayName()).to.equal('int');
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
                '[Translated] core.of_generic_type_expected {"expectedType":"int"}'
            );
        });
    });

    describe('getScalarValueType()', function () {
        it('should return the type for non-boolean', function () {
            expect(type.getScalarValueType()).to.equal('int');
        });

        it('should return "boolean" for boolean', function () {
            createType('bool');

            expect(type.getScalarValueType()).to.equal('boolean');
        });
    });

    describe('isScalar()', function () {
        it('should return true', function () {
            expect(type.isScalar()).to.be.true;
        });
    });
});
