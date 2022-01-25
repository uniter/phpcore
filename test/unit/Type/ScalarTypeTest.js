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
    ObjectValue = require('../../../src/Value/Object').sync(),
    ScalarType = require('../../../src/Type/ScalarType'),
    Translator = phpCommon.Translator;

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
            type = new ScalarType(futureFactory, scalarType, false);
        };
        createType('int');
    });

    describe('allowsNull()', function () {
        it('should return true when set', function () {
            type = new ScalarType(futureFactory, 'boolean', true);

            expect(type.allowsNull()).to.be.true;
        });

        it('should return false when set', function () {
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('allowsValue()', function () {
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
            type = new ScalarType(futureFactory, 'float', true);

            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.true;
        });

        it('should return false when null given but null is disallowed', async function () {
            expect(await type.allowsValue(valueFactory.createNull()).toPromise()).to.be.false;
        });
    });

    describe('coerceValue()', function () {
        describe('for a boolean type', function () {
            beforeEach(function () {
                createType('boolean');
            });

            it('should return an array value unchanged', function () {
                var arrayValue = valueFactory.createArray([21]);

                expect(type.coerceValue(arrayValue)).to.equal(arrayValue);
            });

            it('should coerce a truthy value to boolean', function () {
                var truthyValue = valueFactory.createString('1'),
                    coercedValue = type.coerceValue(truthyValue);

                expect(coercedValue.getType()).to.equal('boolean');
                expect(coercedValue.getNative()).to.be.true;
            });

            it('should coerce a falsy value to boolean', function () {
                var falsyValue = valueFactory.createString('0'),
                    coercedValue = type.coerceValue(falsyValue);

                expect(coercedValue.getType()).to.equal('boolean');
                expect(coercedValue.getNative()).to.be.false;
            });
        });

        describe('for a float type', function () {
            beforeEach(function () {
                createType('float');
            });

            it('should return an array value unchanged', function () {
                var arrayValue = valueFactory.createArray([21]);

                expect(type.coerceValue(arrayValue)).to.equal(arrayValue);
            });

            it('should coerce a numeric string', function () {
                var stringValue = valueFactory.createString('1234.56 blah blah'),
                    coercedValue = type.coerceValue(stringValue);

                expect(coercedValue.getType()).to.equal('float');
                expect(coercedValue.getNative()).to.be.equal(1234.56);
            });
        });

        describe('for an integer type', function () {
            beforeEach(function () {
                createType('int');
            });

            it('should return an array value unchanged', function () {
                var arrayValue = valueFactory.createArray([21]);

                expect(type.coerceValue(arrayValue)).to.equal(arrayValue);
            });

            it('should coerce a numeric string', function () {
                var stringValue = valueFactory.createString('1234.56 blah blah'),
                    coercedValue = type.coerceValue(stringValue);

                expect(coercedValue.getType()).to.equal('int');
                expect(coercedValue.getNative()).to.be.equal(1234);
            });
        });

        describe('for a string type', function () {
            beforeEach(function () {
                createType('string');
            });

            it('should return an array value unchanged', function () {
                var arrayValue = valueFactory.createArray([21]);

                expect(type.coerceValue(arrayValue)).to.equal(arrayValue);
            });

            it('should coerce a float to string', function () {
                var floatValue = valueFactory.createFloat(456.78),
                    coercedValue = type.coerceValue(floatValue);

                expect(coercedValue.getType()).to.equal('string');
                expect(coercedValue.getNative()).to.be.equal('456.78');
            });
        });

        describe('when coercion fails', function () {
            it('should return the value unchanged', function () {
                var objectValue = sinon.createStubInstance(ObjectValue);
                objectValue.coerceToInteger.throws(new Error('Coercion failed'));

                expect(type.coerceValue(objectValue)).to.equal(objectValue);
            });
        });

        describe('for an invalid scalar type', function () {
            it('should raise an exception', function () {
                createType('invalidtype');

                expect(function () {
                    type.coerceValue(valueFactory.createString('my value'));
                }).to.throw('Unknown scalar type "invalidtype"');
            });
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

    describe('isScalar()', function () {
        it('should return true', function () {
            expect(type.isScalar()).to.be.true;
        });
    });
});
