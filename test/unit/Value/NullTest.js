/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    expect = require('chai').expect,
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    ArrayValue = require('../../../src/Value/Array').sync(),
    BooleanValue = require('../../../src/Value/Boolean').sync(),
    CallStack = require('../../../src/CallStack'),
    FloatValue = require('../../../src/Value/Float').sync(),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    KeyValuePair = require('../../../src/KeyValuePair'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    NullValue = require('../../../src/Value/Null').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Null', function () {
    var callStack,
        createKeyValuePair,
        createValue,
        factory,
        value;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        factory = new ValueFactory();

        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        createKeyValuePair = function (key, value) {
            var keyValuePair = sinon.createStubInstance(KeyValuePair);
            keyValuePair.getKey.returns(key);
            keyValuePair.getValue.returns(value);
            return keyValuePair;
        };

        createValue = function () {
            value = new NullValue(factory, callStack);
        };
        createValue();
    });

    describe('addToArray()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                value.addToArray(factory.createArray([]));
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('callMethod()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                value.callMethod('myMethod', [factory.createString('my arg')]);
            }).to.throw(
                'Fake PHP Fatal error for #core.non_object_method_call with {"name":"myMethod","type":"null"}'
            );
        });
    });

    describe('callStaticMethod()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                value.callStaticMethod(
                    factory.createString('myMethod'),
                    [factory.createString('my arg')]
                );
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('clone()', function () {
        it('should raise an error', function () {
            expect(function () {
                value.clone();
            }).to.throw(
                'Fake PHP Fatal error for #core.method_called_on_non_object with {"method":"__clone"}'
            );
        });
    });

    describe('coerceToNativeError()', function () {
        it('should throw an error as this is invalid', function () {
            expect(function () {
                value.coerceToNativeError();
            }).to.throw(
                'Only instances of Throwable may be thrown: tried to throw a(n) null'
            );
        });
    });

    describe('divide()', function () {
        it('should hand off to the right-hand operand to divide by null', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            createValue();
            rightOperand.divideByNull.withArgs(value).returns(result);

            expect(value.divide(rightOperand)).to.equal(result);
        });
    });

    describe('divideByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createArray([]);
            createValue();

            expect(function () {
                value.divideByArray(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('divideByBoolean()', function () {
        var leftValue;

        _.each([
            {
                left: true,
                expectedResultType: BooleanValue,
                expectedResult: false
            },
            {
                left: false,
                expectedResultType: BooleanValue,
                expectedResult: false
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / null`', function () {
                beforeEach(function () {
                    leftValue = factory.createBoolean(scenario.left);
                    createValue();
                });

                it('should return the correct value', function () {
                    var result = value.divideByBoolean(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a warning due to division by zero', function () {
                    value.divideByBoolean(leftValue);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError)
                        .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                });
            });
        });
    });

    describe('divideByFloat()', function () {
        var leftValue;

        _.each([
            {
                left: 12.0,
                expectedResultType: BooleanValue,
                expectedResult: false
            },
            {
                left: 0.0,
                expectedResultType: BooleanValue,
                expectedResult: false
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / null`', function () {
                beforeEach(function () {
                    leftValue = factory.createFloat(scenario.left);
                    createValue();
                });

                it('should return the correct value', function () {
                    var result = value.divideByFloat(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a warning due to division by zero', function () {
                    value.divideByFloat(leftValue);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError)
                        .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                });
            });
        });
    });

    describe('divideByInteger()', function () {
        var leftValue;

        _.each([
            {
                left: 100,
                expectedResultType: BooleanValue,
                expectedResult: false
            },
            {
                left: 0,
                expectedResultType: BooleanValue,
                expectedResult: false
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / null`', function () {
                beforeEach(function () {
                    leftValue = factory.createInteger(scenario.left);
                    createValue();
                });

                it('should return the correct value', function () {
                    var result = value.divideByInteger(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a warning due to division by zero', function () {
                    value.divideByInteger(leftValue);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError)
                        .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                });
            });
        });
    });

    describe('divideByNull()', function () {
        var coercedLeftValue,
            leftValue;

        beforeEach(function () {
            leftValue = sinon.createStubInstance(NullValue);
            createValue();
            leftValue.getNative.returns(null);

            coercedLeftValue = sinon.createStubInstance(IntegerValue);
            coercedLeftValue.getNative.returns(0);
            leftValue.coerceToNumber.returns(coercedLeftValue);
        });

        it('should return the correct value', function () {
            var result = value.divideByNull(leftValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });

        it('should raise a warning due to division by zero', function () {
            value.divideByNull(leftValue);

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError)
                .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
        });
    });

    describe('divideByObject()', function () {
        var coercedLeftValue,
            leftValue;

        beforeEach(function () {
            leftValue = sinon.createStubInstance(ObjectValue);
            leftValue.getNative.returns({});

            coercedLeftValue = sinon.createStubInstance(IntegerValue);
            coercedLeftValue.getNative.returns(1);
            leftValue.coerceToNumber.returns(coercedLeftValue);

            createValue();
        });

        it('should return bool(false)', function () {
            var result = value.divideByObject(leftValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });

        it('should raise a warning due to division by zero', function () {
            value.divideByObject(leftValue);

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError)
                .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
        });
    });

    describe('divideByString()', function () {
        var leftValue;

        _.each([
            {
                left: 'my string',
                coercedLeftClass: IntegerValue,
                coercedLeftType: 'int',
                coercedLeft: 0,
                expectedResultType: BooleanValue,
                expectedResult: false
            },
            {
                left: '21',
                coercedLeftClass: IntegerValue,
                coercedLeftType: 'int',
                coercedLeft: 21,
                expectedResultType: BooleanValue,
                expectedResult: false
            },
            {
                left: '0',
                coercedLeftClass: IntegerValue,
                coercedLeftType: 'int',
                coercedLeft: 0,
                expectedResultType: BooleanValue,
                expectedResult: false
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / null`', function () {
                beforeEach(function () {
                    leftValue = factory.createString(scenario.left);
                    createValue();
                });

                it('should return the correct value', function () {
                    var result = value.divideByString(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a warning due to division by zero', function () {
                    value.divideByString(leftValue);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError)
                        .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                });
            });
        });
    });

    describe('formatAsString()', function () {
        it('should just return "NULL"', function () {
            createValue();

            expect(value.formatAsString()).to.equal('NULL');
        });
    });

    describe('getConstantByName()', function () {
        it('should throw a "Class name must be a valid object or a string" error', function () {
            var namespaceScope = sinon.createStubInstance(NamespaceScope);

            expect(function () {
                value.getConstantByName('MY_CONST', namespaceScope);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('getDisplayType()', function () {
        it('should return the value type', function () {
            expect(value.getDisplayType()).to.equal('null');
        });
    });

    describe('getNative()', function () {
        it('should return null', function () {
            expect(value.getNative()).to.be.null;
        });
    });

    describe('getProxy()', function () {
        it('should return null', function () {
            expect(value.getProxy()).to.be.null;
        });
    });

    describe('getReference()', function () {
        it('should throw an error', function () {
            expect(function () {
                value.getReference();
            }).to.throw('Cannot get a reference to a value');
        });
    });

    describe('getStaticPropertyByName()', function () {
        it('should raise a fatal error', function () {
            var namespaceScope = sinon.createStubInstance(NamespaceScope);

            expect(function () {
                value.getStaticPropertyByName(factory.createString('myProp'), namespaceScope);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('getValueOrNull()', function () {
        it('should just return this value, as values are always classed as "defined"', function () {
            expect(value.getValueOrNull()).to.equal(value);
        });
    });

    describe('instantiate()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                value.instantiate();
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isAnInstanceOf()', function () {
        it('should hand off to the right-hand operand to determine the result', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.isTheClassOfNull.withArgs(value).returns(result);

            expect(value.isAnInstanceOf(rightOperand)).to.equal(result);
        });
    });

    describe('isCallable()', function () {
        it('should return false', function () {
            expect(value.isCallable()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true', function () {
            expect(value.isEmpty()).to.be.true;
        });
    });

    describe('isIterable()', function () {
        it('should return false', function () {
            expect(value.isIterable()).to.be.false;
        });
    });

    describe('isNumeric()', function () {
        it('should return false', function () {
            expect(value.isNumeric()).to.be.false;
        });
    });

    describe('isTheClassOfArray()', function () {
        it('should raise a fatal error', function () {
            var classValue = sinon.createStubInstance(ArrayValue);

            expect(function () {
                value.isTheClassOfArray(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfBoolean()', function () {
        it('should raise a fatal error', function () {
            var classValue = factory.createBoolean(true);

            expect(function () {
                value.isTheClassOfBoolean(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfFloat()', function () {
        it('should raise a fatal error', function () {
            var classValue = factory.createFloat(22.4);

            expect(function () {
                value.isTheClassOfFloat(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfInteger()', function () {
        it('should raise a fatal error', function () {
            var classValue = factory.createInteger(21);

            expect(function () {
                value.isTheClassOfInteger(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfNull()', function () {
        it('should raise a fatal error', function () {
            var classValue = factory.createNull();

            expect(function () {
                value.isTheClassOfNull(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfObject()', function () {
        it('should raise a fatal error', function () {
            var classValue = factory.createObject({});

            expect(function () {
                value.isTheClassOfObject(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfString()', function () {
        it('should raise a fatal error', function () {
            var classValue = factory.createString('a string');

            expect(function () {
                value.isTheClassOfString(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('modulo()', function () {
        it('should always return 0, as null will always coerce to 0', function () {
            var result,
                rightValue = factory.createInteger(5);

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });
    });

    describe('multiply()', function () {
        it('should hand off to the right-hand operand to multiply by null', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            createValue();
            rightOperand.multiplyByNull.withArgs(value).returns(result);

            expect(value.multiply(rightOperand)).to.equal(result);
        });
    });

    describe('multiplyByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createArray([]);
            createValue();

            expect(function () {
                value.multiplyByArray(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('multiplyByBoolean()', function () {
        var leftValue;

        _.each([
            {
                left: true,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: false,
                expectedResultType: IntegerValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * null`', function () {
                beforeEach(function () {
                    leftValue = factory.createBoolean(scenario.left);
                    createValue();
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByBoolean(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any extra notices', function () {
                    value.multiplyByBoolean(leftValue);

                    expect(callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('multiplyByFloat()', function () {
        var leftValue;

        _.each([
            {
                left: 12.0,
                expectedResultType: FloatValue,
                expectedResult: 0
            },
            {
                left: 0.0,
                expectedResultType: FloatValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * null`', function () {
                beforeEach(function () {
                    leftValue = factory.createFloat(scenario.left);
                    createValue();
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByFloat(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any extra notices', function () {
                    value.multiplyByFloat(leftValue);

                    expect(callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('multiplyByInteger()', function () {
        var leftValue;

        _.each([
            {
                left: 100,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: 0,
                expectedResultType: IntegerValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * null`', function () {
                beforeEach(function () {
                    leftValue = factory.createInteger(scenario.left);
                    createValue();
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByInteger(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any extra notices', function () {
                    value.multiplyByInteger(leftValue);

                    expect(callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('multiplyByNull()', function () {
        var coercedLeftValue,
            leftValue;

        beforeEach(function () {
            leftValue = sinon.createStubInstance(NullValue);
            createValue();
            leftValue.getNative.returns(null);

            coercedLeftValue = sinon.createStubInstance(IntegerValue);
            coercedLeftValue.getNative.returns(0);
            leftValue.coerceToNumber.returns(coercedLeftValue);
        });

        it('should return the correct value', function () {
            var result = value.multiplyByNull(leftValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });

        it('should not raise any extra notices', function () {
            value.multiplyByNull(leftValue);

            expect(callStack.raiseError).not.to.have.been.called;
        });
    });

    describe('multiplyByObject()', function () {
        var coercedLeftValue,
            leftValue;

        beforeEach(function () {
            leftValue = sinon.createStubInstance(ObjectValue);
            leftValue.getNative.returns({});

            coercedLeftValue = sinon.createStubInstance(IntegerValue);
            coercedLeftValue.getNative.returns(1);
            leftValue.coerceToNumber.returns(coercedLeftValue);

            createValue();
        });

        it('should return int(0)', function () {
            var result = value.multiplyByObject(leftValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });

        it('should not raise any extra notices', function () {
            value.multiplyByObject(leftValue);

            expect(callStack.raiseError).not.to.have.been.called;
        });
    });

    describe('multiplyByString()', function () {
        var leftValue;

        _.each([
            {
                left: 'my string',
                coercedLeftClass: IntegerValue,
                coercedLeftType: 'int',
                coercedLeft: 0,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: '21',
                coercedLeftClass: IntegerValue,
                coercedLeftType: 'int',
                coercedLeft: 21,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: '27.2',
                coercedLeftClass: FloatValue,
                coercedLeftType: 'float',
                coercedLeft: 27.2,
                expectedResultType: FloatValue, // Result will be float because one operand was a float
                expectedResult: 0
            },
            {
                left: '0',
                coercedLeftClass: IntegerValue,
                coercedLeftType: 'int',
                coercedLeft: 0,
                expectedResultType: IntegerValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * null`', function () {
                beforeEach(function () {
                    leftValue = factory.createString(scenario.left);
                    createValue();
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByString(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any extra notices', function () {
                    value.multiplyByString(leftValue);

                    expect(callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('subtractFromNull()', function () {
        it('should throw an "Unsupported operand" error', function () {
            expect(function () {
                value.subtractFromNull();
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });
});
