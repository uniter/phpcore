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
    NullValue = require('../../../src/Value/Null').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Integer', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = new ValueFactory();

        this.callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        this.createKeyValuePair = function (key, value) {
            var keyValuePair = sinon.createStubInstance(KeyValuePair);
            keyValuePair.getKey.returns(key);
            keyValuePair.getValue.returns(value);
            return keyValuePair;
        };

        this.createValue = function (nativeValue) {
            this.value = new IntegerValue(this.factory, this.callStack, nativeValue);
        }.bind(this);
        this.createValue(1);
    });

    describe('addToArray()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                this.value.addToArray(this.factory.createArray([]));
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('callMethod()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                this.value.callMethod('myMethod', [this.factory.createString('my arg')]);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.non_object_method_call with {"name":"myMethod","type":"int"}'
            );
        });
    });

    describe('callStaticMethod()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                this.value.callStaticMethod(
                    this.factory.createString('myMethod'),
                    [this.factory.createString('my arg')]
                );
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('coerceToNativeError()', function () {
        it('should throw an error as this is invalid', function () {
            expect(function () {
                this.value.coerceToNativeError();
            }.bind(this)).to.throw(
                'Only instances of Throwable may be thrown: tried to throw a(n) int'
            );
        });
    });

    describe('divide()', function () {
        it('should hand off to the right-hand operand to divide by this integer', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            this.createValue(1);
            rightOperand.divideByInteger.withArgs(this.value).returns(result);

            expect(this.value.divide(rightOperand)).to.equal(result);
        });
    });

    describe('divideByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createArray([]);
            this.createValue(1);

            expect(function () {
                this.value.divideByArray(leftValue);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('divideByBoolean()', function () {
        _.each([
            {
                left: true,
                right: 2,
                expectedResultType: FloatValue,
                expectedResult: 0.5,
                expectDivisionByZero: false
            },
            {
                left: true,
                right: 0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                left: false,
                right: 1,
                expectedResultType: IntegerValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                left: false,
                right: 0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / ' + scenario.right + '`', function () {
                beforeEach(function () {
                    this.leftValue = this.factory.createBoolean(scenario.left);
                    this.createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = this.value.divideByBoolean(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                if (scenario.expectDivisionByZero) {
                    it('should raise a warning due to division by zero', function () {
                        this.value.divideByBoolean(this.leftValue);

                        expect(this.callStack.raiseError).to.have.been.calledOnce;
                        expect(this.callStack.raiseError)
                            .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                    });
                } else {
                    it('should not raise any warnings', function () {
                        this.value.divideByBoolean(this.leftValue);

                        expect(this.callStack.raiseError).not.to.have.been.called;
                    });
                }
            });
        });
    });

    describe('divideByFloat()', function () {
        _.each([
            {
                left: 12.0,
                right: 1,
                expectedResultType: FloatValue,
                expectedResult: 12.0,
                expectDivisionByZero: false
            },
            {
                left: 20.4,
                right: 2,
                expectedResultType: FloatValue,
                expectedResult: 10.2,
                expectDivisionByZero: false
            },
            {
                left: 11.0,
                right: 0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                left: 0.0,
                right: 0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / ' + scenario.right + '`', function () {
                beforeEach(function () {
                    this.leftValue = this.factory.createFloat(scenario.left);
                    this.createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = this.value.divideByFloat(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                if (scenario.expectDivisionByZero) {
                    it('should raise a warning due to division by zero', function () {
                        this.value.divideByFloat(this.leftValue);

                        expect(this.callStack.raiseError).to.have.been.calledOnce;
                        expect(this.callStack.raiseError)
                            .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                    });
                } else {
                    it('should not raise any warnings', function () {
                        this.value.divideByFloat(this.leftValue);

                        expect(this.callStack.raiseError).not.to.have.been.called;
                    });
                }
            });
        });
    });

    describe('divideByInteger()', function () {
        _.each([
            {
                left: 100,
                right: 2,
                expectedResultType: IntegerValue,
                expectedResult: 50,
                expectDivisionByZero: false
            },
            // Division of int by int may result in remainder, so coerce to float
            {
                left: 5,
                right: 2,
                expectedResultType: FloatValue,
                expectedResult: 2.5,
                expectDivisionByZero: false
            },
            {
                left: 11,
                right: 0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                left: 0,
                right: 0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / ' + scenario.right + '`', function () {
                beforeEach(function () {
                    this.leftValue = this.factory.createInteger(scenario.left);
                    this.createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = this.value.divideByInteger(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                if (scenario.expectDivisionByZero) {
                    it('should raise a warning due to division by zero', function () {
                        this.value.divideByInteger(this.leftValue);

                        expect(this.callStack.raiseError).to.have.been.calledOnce;
                        expect(this.callStack.raiseError)
                            .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                    });
                } else {
                    it('should not raise any warnings', function () {
                        this.value.divideByInteger(this.leftValue);

                        expect(this.callStack.raiseError).not.to.have.been.called;
                    });
                }
            });
        });
    });

    describe('divideByNull()', function () {
        _.each([
            {
                right: 4,
                expectedResultType: IntegerValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                right: 0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / ' + scenario.right + '`', function () {
                beforeEach(function () {
                    this.leftValue = sinon.createStubInstance(NullValue);
                    this.createValue(scenario.right);
                    this.leftValue.getNative.returns(null);

                    this.coercedLeftValue = sinon.createStubInstance(IntegerValue);
                    this.coercedLeftValue.getNative.returns(0);
                    this.leftValue.coerceToNumber.returns(this.coercedLeftValue);
                });

                it('should return the correct value', function () {
                    var result = this.value.divideByNull(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                if (scenario.expectDivisionByZero) {
                    it('should raise a warning due to division by zero', function () {
                        this.value.divideByNull(this.leftValue);

                        expect(this.callStack.raiseError).to.have.been.calledOnce;
                        expect(this.callStack.raiseError)
                            .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                    });
                } else {
                    it('should not raise any warnings', function () {
                        this.value.divideByNull(this.leftValue);

                        expect(this.callStack.raiseError).not.to.have.been.called;
                    });
                }
            });
        });
    });

    describe('divideByObject()', function () {
        beforeEach(function () {
            this.leftValue = sinon.createStubInstance(ObjectValue);
            this.leftValue.getNative.returns({});

            this.coercedLeftValue = sinon.createStubInstance(IntegerValue);
            this.coercedLeftValue.getNative.returns(1);
            this.leftValue.coerceToNumber.returns(this.coercedLeftValue);
        });

        describe('when the divisor is `1`', function () {
            beforeEach(function () {
                this.createValue(1);
            });

            it('should return int(1)', function () {
                var result = this.value.divideByObject(this.leftValue);

                expect(result).to.be.an.instanceOf(IntegerValue);
                expect(result.getNative()).to.equal(1);
            });

            it('should not raise any extra notices', function () {
                this.value.divideByObject(this.leftValue);

                expect(this.callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('when the divisor is `2`', function () {
            beforeEach(function () {
                this.createValue(2);
            });

            it('should return float(0.5)', function () {
                var result = this.value.divideByObject(this.leftValue);

                expect(result).to.be.an.instanceOf(FloatValue);
                expect(result.getNative()).to.equal(0.5);
            });

            it('should not raise any extra notices', function () {
                this.value.divideByObject(this.leftValue);

                expect(this.callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('when the divisor is `0`', function () {
            beforeEach(function () {
                this.createValue(0);
            });

            it('should return bool(false)', function () {
                var result = this.value.divideByObject(this.leftValue);

                expect(result).to.be.an.instanceOf(BooleanValue);
                expect(result.getNative()).to.equal(false);
            });

            it('should raise a warning due to division by zero', function () {
                this.value.divideByObject(this.leftValue);

                expect(this.callStack.raiseError).to.have.been.calledOnce;
                expect(this.callStack.raiseError)
                    .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
            });
        });
    });

    describe('divideByString()', function () {
        _.each([
            {
                left: 'my string',
                right: 1,
                expectedResultType: IntegerValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                left: '21', // Int string is coerced to int
                right: 1,
                expectedResultType: IntegerValue,
                expectedResult: 21,
                expectDivisionByZero: false
            },
            {
                left: '27.2', // Decimal string is coerced to float
                right: 4,
                expectedResultType: FloatValue,
                expectedResult: 6.8,
                expectDivisionByZero: false
            },
            {
                left: '25.4.7', // Decimal string prefix is coerced to float
                right: 2,
                expectedResultType: FloatValue,
                expectedResult: 12.7,
                expectDivisionByZero: false
            },
            {
                left: '23',
                right: 0,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / ' + scenario.right + '`', function () {
                beforeEach(function () {
                    this.leftValue = this.factory.createString(scenario.left);
                    this.createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = this.value.divideByString(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                if (scenario.expectDivisionByZero) {
                    it('should raise a warning due to division by zero', function () {
                        this.value.divideByString(this.leftValue);

                        expect(this.callStack.raiseError).to.have.been.calledOnce;
                        expect(this.callStack.raiseError)
                            .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                    });
                } else {
                    it('should not raise any warnings', function () {
                        this.value.divideByString(this.leftValue);

                        expect(this.callStack.raiseError).not.to.have.been.called;
                    });
                }
            });
        });
    });

    describe('formatAsString()', function () {
        it('should return the value coerced to a string', function () {
            this.createValue(128);

            expect(this.value.formatAsString()).to.equal('128');
        });
    });

    describe('getConstantByName()', function () {
        it('should throw a "Class name must be a valid object or a string" error', function () {
            expect(function () {
                this.value.getConstantByName('MY_CONST', this.namespaceScope);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('getDisplayType()', function () {
        it('should return the value type', function () {
            expect(this.value.getDisplayType()).to.equal('int');
        });
    });

    describe('getNative()', function () {
        it('should return 27 when expected', function () {
            this.createValue(27);

            expect(this.value.getNative()).to.equal(27);
        });

        it('should return 0 when expected', function () {
            this.createValue(0);

            expect(this.value.getNative()).to.equal(0);
        });
    });

    describe('getProxy()', function () {
        it('should return 27 when expected', function () {
            this.createValue(27);

            expect(this.value.getProxy()).to.equal(27);
        });

        it('should return 0 when expected', function () {
            this.createValue(0);

            expect(this.value.getProxy()).to.equal(0);
        });
    });

    describe('getReference()', function () {
        it('should throw an error', function () {
            expect(function () {
                this.value.getReference();
            }.bind(this)).to.throw('Cannot get a reference to a value');
        });
    });

    describe('getStaticPropertyByName()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                this.value.getStaticPropertyByName(this.factory.createString('myProp'), this.namespaceScope);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('instantiate()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                this.value.instantiate();
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isAnInstanceOf()', function () {
        it('should hand off to the right-hand operand to determine the result', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.isTheClassOfInteger.withArgs(this.value).returns(result);

            expect(this.value.isAnInstanceOf(rightOperand)).to.equal(result);
        });
    });

    describe('isCallable()', function () {
        it('should return false', function () {
            expect(this.value.isCallable()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return false for a positive integer', function () {
            this.createValue(7);

            expect(this.value.isEmpty()).to.be.false;
        });

        it('should return false for a negative integer', function () {
            this.createValue(-21);

            expect(this.value.isEmpty()).to.be.false;
        });

        it('should return true for zero', function () {
            this.createValue(0);

            expect(this.value.isEmpty()).to.be.true;
        });
    });

    describe('isGreaterThan()', function () {
        it('should return true for two integers when left is greater than right', function () {
            var lhs = new Value(this.factory, this.callStack, 'int', 21),
                rhs = new Value(this.factory, this.callStack, 'int', 15),
                result = lhs.isGreaterThan(rhs);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.be.true;
        });

        it('should return false for two integers when left is equal to right', function () {
            var lhs = new Value(this.factory, this.callStack, 'int', 21),
                rhs = new Value(this.factory, this.callStack, 'int', 21),
                result = lhs.isGreaterThan(rhs);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.be.false;
        });

        it('should return false for two integers when left is less than right', function () {
            var lhs = new Value(this.factory, this.callStack, 'int', 15),
                rhs = new Value(this.factory, this.callStack, 'int', 21),
                result = lhs.isGreaterThan(rhs);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.be.false;
        });
    });

    describe('isGreaterThanOrEqual()', function () {
        it('should return true for two integers when left is greater than right', function () {
            var lhs = new Value(this.factory, this.callStack, 'int', 21),
                rhs = new Value(this.factory, this.callStack, 'int', 15),
                result = lhs.isGreaterThanOrEqual(rhs);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.be.true;
        });

        it('should return true for two integers when left is equal to right', function () {
            var lhs = new Value(this.factory, this.callStack, 'int', 21),
                rhs = new Value(this.factory, this.callStack, 'int', 21),
                result = lhs.isGreaterThanOrEqual(rhs);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.be.true;
        });

        it('should return false for two integers when left is less than right', function () {
            var lhs = new Value(this.factory, this.callStack, 'int', 15),
                rhs = new Value(this.factory, this.callStack, 'int', 21),
                result = lhs.isGreaterThanOrEqual(rhs);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.be.false;
        });
    });

    describe('isIterable()', function () {
        it('should return false', function () {
            expect(this.value.isIterable()).to.be.false;
        });
    });

    describe('isLessThan()', function () {
        it('should return false for two integers when left is greater than right', function () {
            var lhs = new Value(this.factory, this.callStack, 'int', 21),
                rhs = new Value(this.factory, this.callStack, 'int', 15),
                result = lhs.isLessThan(rhs);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.be.false;
        });

        it('should return false for two integers when left is equal to right', function () {
            var lhs = new Value(this.factory, this.callStack, 'int', 21),
                rhs = new Value(this.factory, this.callStack, 'int', 21),
                result = lhs.isLessThan(rhs);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.be.false;
        });

        it('should return true for two integers when left is less than right', function () {
            var lhs = new Value(this.factory, this.callStack, 'int', 15),
                rhs = new Value(this.factory, this.callStack, 'int', 21),
                result = lhs.isLessThan(rhs);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.be.true;
        });
    });

    describe('isLessThanOrEqual()', function () {
        it('should return false for two integers when left is greater than right', function () {
            var lhs = new Value(this.factory, this.callStack, 'int', 21),
                rhs = new Value(this.factory, this.callStack, 'int', 15),
                result = lhs.isLessThanOrEqual(rhs);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.be.false;
        });

        it('should return true for two integers when left is equal to right', function () {
            var lhs = new Value(this.factory, this.callStack, 'int', 21),
                rhs = new Value(this.factory, this.callStack, 'int', 21),
                result = lhs.isLessThanOrEqual(rhs);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.be.true;
        });

        it('should return true for two integers when left is less than right', function () {
            var lhs = new Value(this.factory, this.callStack, 'int', 15),
                rhs = new Value(this.factory, this.callStack, 'int', 21),
                result = lhs.isLessThanOrEqual(rhs);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.be.true;
        });
    });

    describe('isNumeric()', function () {
        it('should return true', function () {
            expect(this.value.isNumeric()).to.be.true;
        });
    });

    describe('isTheClassOfArray()', function () {
        it('should raise a fatal error', function () {
            var classValue = sinon.createStubInstance(ArrayValue);

            expect(function () {
                this.value.isTheClassOfArray(classValue);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfBoolean()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createBoolean(true);

            expect(function () {
                this.value.isTheClassOfBoolean(classValue);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfFloat()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createFloat(22.4);

            expect(function () {
                this.value.isTheClassOfFloat(classValue);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfInteger()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createInteger(21);

            expect(function () {
                this.value.isTheClassOfInteger(classValue);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfNull()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createNull();

            expect(function () {
                this.value.isTheClassOfNull(classValue);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfObject()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createObject({});

            expect(function () {
                this.value.isTheClassOfObject(classValue);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfString()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createString('a string');

            expect(function () {
                this.value.isTheClassOfString(classValue);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('modulo()', function () {
        it('should return the correct remainder of 3 for 23 mod 5', function () {
            var result,
                rightValue = this.factory.createInteger(5);
            this.createValue(23);

            result = this.value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(3);
        });

        it('should return the correct remainder of 0 for 10 mod 2', function () {
            var result,
                rightValue = this.factory.createInteger(2);
            this.createValue(10);

            result = this.value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });

        it('should return the correct remainder of 4 for 24 mod 5', function () {
            var result,
                rightValue = this.factory.createInteger(5);
            this.createValue(24);

            result = this.value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(4);
        });
    });

    describe('multiply()', function () {
        it('should hand off to the right-hand operand to multiply by this integer', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            this.createValue(1);
            rightOperand.multiplyByInteger.withArgs(this.value).returns(result);

            expect(this.value.multiply(rightOperand)).to.equal(result);
        });
    });

    describe('multiplyByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createArray([]);
            this.createValue(1);

            expect(function () {
                this.value.multiplyByArray(leftValue);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('multiplyByBoolean()', function () {
        _.each([
            {
                left: true,
                right: 2,
                expectedResultType: IntegerValue,
                expectedResult: 2
            },
            {
                left: true,
                right: 0,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: false,
                right: 1,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: false,
                right: 0,
                expectedResultType: IntegerValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * ' + scenario.right + '`', function () {
                beforeEach(function () {
                    this.leftValue = this.factory.createBoolean(scenario.left);
                    this.createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = this.value.multiplyByBoolean(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    this.value.multiplyByBoolean(this.leftValue);

                    expect(this.callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('multiplyByFloat()', function () {
        _.each([
            {
                left: 12.0,
                right: 1,
                expectedResultType: FloatValue,
                expectedResult: 12.0
            },
            {
                left: 20.4,
                right: 2,
                expectedResultType: FloatValue,
                expectedResult: 40.8
            },
            {
                left: 11.0,
                right: 0,
                expectedResultType: FloatValue,
                expectedResult: 0
            },
            {
                left: 0.0,
                right: 0,
                expectedResultType: FloatValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * ' + scenario.right + '`', function () {
                beforeEach(function () {
                    this.leftValue = this.factory.createFloat(scenario.left);
                    this.createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = this.value.multiplyByFloat(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    this.value.multiplyByFloat(this.leftValue);

                    expect(this.callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('multiplyByInteger()', function () {
        _.each([
            {
                left: 100,
                right: 2,
                expectedResultType: IntegerValue,
                expectedResult: 200
            },
            {
                left: -5,
                right: 2,
                expectedResultType: IntegerValue,
                expectedResult: -10
            },
            {
                left: 11,
                right: 0,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: 0,
                right: 0,
                expectedResultType: IntegerValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * ' + scenario.right + '`', function () {
                beforeEach(function () {
                    this.leftValue = this.factory.createInteger(scenario.left);
                    this.createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = this.value.multiplyByInteger(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    this.value.multiplyByInteger(this.leftValue);

                    expect(this.callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('multiplyByNull()', function () {
        _.each([
            {
                right: 4,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                right: 0,
                expectedResultType: IntegerValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * ' + scenario.right + '`', function () {
                beforeEach(function () {
                    this.leftValue = sinon.createStubInstance(NullValue);
                    this.createValue(scenario.right);
                    this.leftValue.getNative.returns(null);

                    this.coercedLeftValue = sinon.createStubInstance(IntegerValue);
                    this.coercedLeftValue.getNative.returns(0);
                    this.leftValue.coerceToNumber.returns(this.coercedLeftValue);
                });

                it('should return the correct value', function () {
                    var result = this.value.multiplyByNull(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    this.value.multiplyByNull(this.leftValue);

                    expect(this.callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('multiplyByObject()', function () {
        beforeEach(function () {
            this.leftValue = sinon.createStubInstance(ObjectValue);
            this.leftValue.getNative.returns({});

            this.coercedLeftValue = sinon.createStubInstance(IntegerValue);
            this.coercedLeftValue.getNative.returns(1);
            this.leftValue.coerceToNumber.returns(this.coercedLeftValue);
        });

        describe('when the multiplier is `1`', function () {
            beforeEach(function () {
                this.createValue(1);
            });

            it('should return int(1)', function () {
                var result = this.value.multiplyByObject(this.leftValue);

                expect(result).to.be.an.instanceOf(IntegerValue);
                expect(result.getNative()).to.equal(1);
            });

            it('should not raise any extra notices', function () {
                this.value.multiplyByObject(this.leftValue);

                expect(this.callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('when the multiplier is `2`', function () {
            beforeEach(function () {
                this.createValue(2);
            });

            it('should return int(2)', function () {
                var result = this.value.multiplyByObject(this.leftValue);

                expect(result).to.be.an.instanceOf(IntegerValue);
                expect(result.getNative()).to.equal(2);
            });

            it('should not raise any extra notices', function () {
                this.value.multiplyByObject(this.leftValue);

                expect(this.callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('when the multiplier is `0`', function () {
            beforeEach(function () {
                this.createValue(0);
            });

            it('should return int(0)', function () {
                var result = this.value.multiplyByObject(this.leftValue);

                expect(result).to.be.an.instanceOf(IntegerValue);
                expect(result.getNative()).to.equal(0);
            });

            it('should not raise any extra notices', function () {
                this.value.multiplyByObject(this.leftValue);

                expect(this.callStack.raiseError).not.to.have.been.called;
            });
        });
    });

    describe('multiplyByString()', function () {
        _.each([
            {
                left: 'my string',
                right: 1,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: '21', // Int string is coerced to int
                right: 1,
                expectedResultType: IntegerValue,
                expectedResult: 21
            },
            {
                left: '21.2', // Decimal string is coerced to float
                right: 4,
                expectedResultType: FloatValue,
                expectedResult: 84.8
            },
            {
                left: '25.4.7', // Decimal string prefix is coerced to float
                right: 2,
                expectedResultType: FloatValue,
                expectedResult: 50.8
            },
            {
                left: '23',
                right: 0,
                expectedResultType: IntegerValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * ' + scenario.right + '`', function () {
                beforeEach(function () {
                    this.leftValue = this.factory.createString(scenario.left);
                    this.createValue(scenario.right);
                });

                it('should return the correct value', function () {
                    var result = this.value.multiplyByString(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    this.value.multiplyByString(this.leftValue);

                    expect(this.callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('subtractFromNull()', function () {
        it('should return this value negated', function () {
            this.createValue(21);

            expect(this.value.subtractFromNull().getNative()).to.equal(-21);
        });
    });
});
