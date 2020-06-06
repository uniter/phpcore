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

describe('Float', function () {
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

        createValue = function (nativeValue) {
            value = new FloatValue(factory, callStack, nativeValue);
        };
        createValue(21);
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
                'Fake PHP Fatal error for #core.non_object_method_call with {"name":"myMethod","type":"float"}'
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
                'Only instances of Throwable may be thrown: tried to throw a(n) float'
            );
        });
    });

    describe('divide()', function () {
        it('should hand off to the right-hand operand to divide by this float', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.divideByFloat.withArgs(value).returns(result);

            expect(value.divide(rightOperand)).to.equal(result);
        });
    });

    describe('divideByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createArray([]);

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
                right: 1.25,
                expectedResultType: FloatValue,
                expectedResult: 0.8,
                expectDivisionByZero: false
            },
            {
                left: true,
                right: 0.0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                left: false,
                right: 1.0,
                expectedResultType: FloatValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                left: false,
                right: 0.0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / ' + scenario.right + '`', function () {
                beforeEach(function () {
                    leftValue = factory.createBoolean(scenario.left);
                    createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = value.divideByBoolean(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                if (scenario.expectDivisionByZero) {
                    it('should raise a warning due to division by zero', function () {
                        value.divideByBoolean(leftValue);

                        expect(callStack.raiseError).to.have.been.calledOnce;
                        expect(callStack.raiseError)
                            .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                    });
                } else {
                    it('should not raise any warnings', function () {
                        value.divideByBoolean(leftValue);

                        expect(callStack.raiseError).not.to.have.been.called;
                    });
                }
            });
        });
    });

    describe('divideByFloat()', function () {
        var leftValue;

        _.each([
            {
                left: 12.4,
                right: 1.0,
                expectedResultType: FloatValue,
                expectedResult: 12.4,
                expectDivisionByZero: false
            },
            {
                left: 20.5,
                right: 0.5,
                expectedResultType: FloatValue,
                expectedResult: 41.0,
                expectDivisionByZero: false
            },
            {
                left: 11.0,
                right: 0.0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                left: 0.0,
                right: 0.0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / ' + scenario.right + '`', function () {
                beforeEach(function () {
                    leftValue = factory.createFloat(scenario.left);
                    createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = value.divideByFloat(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                if (scenario.expectDivisionByZero) {
                    it('should raise a warning due to division by zero', function () {
                        value.divideByFloat(leftValue);

                        expect(callStack.raiseError).to.have.been.calledOnce;
                        expect(callStack.raiseError)
                            .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                    });
                } else {
                    it('should not raise any warnings', function () {
                        value.divideByFloat(leftValue);

                        expect(callStack.raiseError).not.to.have.been.called;
                    });
                }
            });
        });
    });

    describe('divideByInteger()', function () {
        var leftValue;

        _.each([
            {
                left: 15,
                right: 1.0,
                expectedResultType: FloatValue,
                expectedResult: 15,
                expectDivisionByZero: false
            },
            {
                left: 100,
                right: 2.5,
                expectedResultType: FloatValue,
                expectedResult: 40.0,
                expectDivisionByZero: false
            },
            {
                left: 11,
                right: 0.0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                left: 0,
                right: 0.0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / ' + scenario.right + '`', function () {
                beforeEach(function () {
                    leftValue = factory.createInteger(scenario.left);
                    createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = value.divideByInteger(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                if (scenario.expectDivisionByZero) {
                    it('should raise a warning due to division by zero', function () {
                        value.divideByInteger(leftValue);

                        expect(callStack.raiseError).to.have.been.calledOnce;
                        expect(callStack.raiseError)
                            .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                    });
                } else {
                    it('should not raise any warnings', function () {
                        value.divideByInteger(leftValue);

                        expect(callStack.raiseError).not.to.have.been.called;
                    });
                }
            });
        });
    });

    describe('divideByNull()', function () {
        var coercedLeftValue,
            leftValue;

        _.each([
            {
                right: 1.0,
                expectedResultType: FloatValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                right: 0.5,
                expectedResultType: FloatValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                right: 0.0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / ' + scenario.right + '`', function () {
                beforeEach(function () {
                    leftValue = sinon.createStubInstance(NullValue);
                    createValue(scenario.right);
                    leftValue.getNative.returns(null);

                    coercedLeftValue = sinon.createStubInstance(IntegerValue);
                    coercedLeftValue.getNative.returns(0);
                    leftValue.coerceToNumber.returns(coercedLeftValue);
                });

                it('should return the correct value', function () {
                    var result = value.divideByNull(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                if (scenario.expectDivisionByZero) {
                    it('should raise a warning due to division by zero', function () {
                        value.divideByNull(leftValue);

                        expect(callStack.raiseError).to.have.been.calledOnce;
                        expect(callStack.raiseError)
                            .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                    });
                } else {
                    it('should not raise any warnings', function () {
                        value.divideByNull(leftValue);

                        expect(callStack.raiseError).not.to.have.been.called;
                    });
                }
            });
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
        });

        describe('when the divisor is `1.0`', function () {
            beforeEach(function () {
                createValue(1.0);
            });

            it('should return int(1)', function () {
                var result = value.divideByObject(leftValue);

                expect(result).to.be.an.instanceOf(FloatValue);
                expect(result.getNative()).to.equal(1);
            });

            it('should not raise any extra notices', function () {
                value.divideByObject(leftValue);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('when the divisor is `0.0`', function () {
            beforeEach(function () {
                createValue(0.0);
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
    });

    describe('divideByString()', function () {
        var leftValue;

        _.each([
            {
                left: 'my string',
                right: 1.0,
                expectedResultType: FloatValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                left: '21', // Int string is coerced to int
                right: 1.0,
                expectedResultType: FloatValue,
                expectedResult: 21,
                expectDivisionByZero: false
            },
            {
                left: '27.2', // Decimal string is coerced to float
                right: 3.4,
                expectedResultType: FloatValue,
                expectedResult: 8.0,
                expectDivisionByZero: false
            },
            {
                left: '25.4.7', // Decimal string prefix is coerced to float
                right: 2.0,
                expectedResultType: FloatValue,
                expectedResult: 12.7,
                expectDivisionByZero: false
            },
            {
                left: '23',
                right: 0.0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / ' + scenario.right + '`', function () {
                beforeEach(function () {
                    leftValue = factory.createString(scenario.left);
                    createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = value.divideByString(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                if (scenario.expectDivisionByZero) {
                    it('should raise a warning due to division by zero', function () {
                        value.divideByString(leftValue);

                        expect(callStack.raiseError).to.have.been.calledOnce;
                        expect(callStack.raiseError)
                            .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                    });
                } else {
                    it('should not raise any warnings', function () {
                        value.divideByString(leftValue);

                        expect(callStack.raiseError).not.to.have.been.called;
                    });
                }
            });
        });
    });

    describe('formatAsString()', function () {
        it('should return the value coerced to a string', function () {
            createValue(127.456);

            expect(value.formatAsString()).to.equal('127.456');
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
            expect(value.getDisplayType()).to.equal('float');
        });
    });

    describe('getNative()', function () {
        it('should return 21.5 when expected', function () {
            createValue(21.5);

            expect(value.getNative()).to.equal(21.5);
        });

        it('should return 0.0 when expected', function () {
            createValue(0.0);

            expect(value.getNative()).to.equal(0.0);
        });
    });

    describe('getProxy()', function () {
        it('should return 21.5 when expected', function () {
            createValue(21.5);

            expect(value.getProxy()).to.equal(21.5);
        });

        it('should return 0.0 when expected', function () {
            createValue(0.0);

            expect(value.getProxy()).to.equal(0.0);
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
            rightOperand.isTheClassOfFloat.withArgs(value).returns(result);

            expect(value.isAnInstanceOf(rightOperand)).to.equal(result);
        });
    });

    describe('isCallable()', function () {
        it('should return false', function () {
            expect(value.isCallable()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return false for a positive float', function () {
            createValue(2.7);

            expect(value.isEmpty()).to.be.false;
        });

        it('should return false for a negative float', function () {
            createValue(-101.4);

            expect(value.isEmpty()).to.be.false;
        });

        it('should return true for zero', function () {
            createValue(0);

            expect(value.isEmpty()).to.be.true;
        });
    });

    describe('isIterable()', function () {
        it('should return false', function () {
            expect(value.isIterable()).to.be.false;
        });
    });

    describe('isNumeric()', function () {
        it('should return true', function () {
            expect(value.isNumeric()).to.be.true;
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
        it('should return the correct remainder of 3 for 23.0 mod 5', function () {
            var result,
                rightValue = factory.createInteger(5);
            createValue(23.0);

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(3);
        });

        it('should return the correct remainder of 0 for 10.0 mod 2', function () {
            var result,
                rightValue = factory.createInteger(2);
            createValue(10.0);

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });

        it('should return the correct remainder of 4 for 24.3 mod 5 (integer division)', function () {
            var result,
                rightValue = factory.createInteger(5);
            createValue(24.3);

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(4);
        });
    });

    describe('multiply()', function () {
        it('should hand off to the right-hand operand to multiply by this float', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.multiplyByFloat.withArgs(value).returns(result);

            expect(value.multiply(rightOperand)).to.equal(result);
        });
    });

    describe('multiplyByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createArray([]);

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
                right: 1.25,
                expectedResultType: FloatValue,
                expectedResult: 1.25
            },
            {
                left: true,
                right: 0.0,
                expectedResultType: FloatValue,
                expectedResult: 0
            },
            {
                left: false,
                right: 1.0,
                expectedResultType: FloatValue,
                expectedResult: 0
            },
            {
                left: false,
                right: 0.0,
                expectedResultType: FloatValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * ' + scenario.right + '`', function () {
                beforeEach(function () {
                    leftValue = factory.createBoolean(scenario.left);
                    createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByBoolean(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
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
                left: 12.4,
                right: 1.0,
                expectedResultType: FloatValue,
                expectedResult: 12.4
            },
            {
                left: 20.5,
                right: 0.5,
                expectedResultType: FloatValue,
                expectedResult: 10.25
            },
            {
                left: 11.0,
                right: 0.0,
                expectedResultType: FloatValue,
                expectedResult: 0.0
            },
            {
                left: 0.0,
                right: 0.0,
                expectedResultType: FloatValue,
                expectedResult: 0.0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * ' + scenario.right + '`', function () {
                beforeEach(function () {
                    leftValue = factory.createFloat(scenario.left);
                    createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByFloat(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
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
                left: 15,
                right: 1.0,
                expectedResultType: FloatValue,
                expectedResult: 15
            },
            {
                left: 100,
                right: 2.5,
                expectedResultType: FloatValue,
                expectedResult: 250.0
            },
            {
                left: 11,
                right: 0.0,
                expectedResultType: FloatValue,
                expectedResult: 0
            },
            {
                left: 0,
                right: 0.0,
                expectedResultType: FloatValue,
                expectedResult: 0.0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * ' + scenario.right + '`', function () {
                beforeEach(function () {
                    leftValue = factory.createInteger(scenario.left);
                    createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByInteger(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    value.multiplyByInteger(leftValue);

                    expect(callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('multiplyByNull()', function () {
        var coercedLeftValue,
            leftValue;

        _.each([
            {
                right: 1.0,
                expectedResultType: FloatValue,
                expectedResult: 0.0
            },
            {
                right: 0.5,
                expectedResultType: FloatValue,
                expectedResult: 0
            },
            {
                right: 0.0,
                expectedResultType: FloatValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * ' + scenario.right + '`', function () {
                beforeEach(function () {
                    leftValue = sinon.createStubInstance(NullValue);
                    createValue(scenario.right);
                    leftValue.getNative.returns(null);

                    coercedLeftValue = sinon.createStubInstance(IntegerValue);
                    coercedLeftValue.getNative.returns(0);
                    leftValue.coerceToNumber.returns(coercedLeftValue);
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByNull(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    value.multiplyByNull(leftValue);

                    expect(callStack.raiseError).not.to.have.been.called;
                });
            });
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
        });

        describe('when the multiplicand is `1.0`', function () {
            beforeEach(function () {
                createValue(1.0);
            });

            it('should return float(1)', function () {
                var result = value.multiplyByObject(leftValue);

                // One operand (this one) is a float, so the result will be a float
                expect(result).to.be.an.instanceOf(FloatValue);
                expect(result.getNative()).to.equal(1);
            });

            it('should not raise any extra notices', function () {
                value.multiplyByObject(leftValue);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('when the multiplicand is `0.0`', function () {
            beforeEach(function () {
                createValue(0.0);
            });

            it('should return float(0)', function () {
                var result = value.multiplyByObject(leftValue);

                // One operand (this one) is a float, so the result will be a float
                expect(result).to.be.an.instanceOf(FloatValue);
                expect(result.getNative()).to.equal(0);
            });

            it('should not raise any extra notices', function () {
                value.multiplyByObject(leftValue);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });
    });

    describe('multiplyByString()', function () {
        var leftValue;

        _.each([
            {
                left: 'my string',
                right: 1.0,
                expectedResultType: FloatValue,
                expectedResult: 0.0
            },
            {
                left: '21', // Int string is coerced to int
                right: 1.0,
                expectedResultType: FloatValue,
                expectedResult: 21.0
            },
            {
                left: '24.2', // Decimal string is coerced to float
                right: 1.5,
                expectedResultType: FloatValue,
                expectedResult: 36.3
            },
            {
                left: '25.4.7', // Decimal string prefix is coerced to float
                right: 2.0,
                expectedResultType: FloatValue,
                expectedResult: 50.8
            },
            {
                left: '23',
                right: 0.0,
                expectedResultType: FloatValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * ' + scenario.right + '`', function () {
                beforeEach(function () {
                    leftValue = factory.createString(scenario.left);
                    createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByString(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
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
