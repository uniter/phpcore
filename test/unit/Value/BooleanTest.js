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
    PHPFatalError = phpCommon.PHPFatalError,
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Boolean', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = new ValueFactory();

        this.createKeyValuePair = function (key, value) {
            var keyValuePair = sinon.createStubInstance(KeyValuePair);
            keyValuePair.getKey.returns(key);
            keyValuePair.getValue.returns(value);
            return keyValuePair;
        };

        this.createValue = function (nativeValue) {
            this.value = new BooleanValue(this.factory, this.callStack, nativeValue);
        }.bind(this);
        this.createValue(true);
    });

    describe('divide()', function () {
        it('should hand off to the right-hand operand to divide by this boolean', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            this.createValue(true);
            rightOperand.divideByBoolean.withArgs(this.value).returns(result);

            expect(this.value.divide(rightOperand)).to.equal(result);
        });
    });

    describe('divideByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createArray([]);
            this.createValue(true);

            expect(function () {
                this.value.divideByArray(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('divideByBoolean()', function () {
        _.each([
            {
                left: true,
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 1,
                expectDivisionByZero: false
            },
            {
                left: true,
                right: false,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                left: false,
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                left: false,
                right: false,
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
                left: 12.4,
                right: true,
                expectedResultType: FloatValue,
                expectedResult: 12.4,
                expectDivisionByZero: false
            },
            {
                left: 11,
                right: false,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                left: 0,
                right: false,
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
                left: 15,
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 15,
                expectDivisionByZero: false
            },
            {
                left: 11,
                right: false,
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                left: 0,
                right: false,
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
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                right: false,
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

        describe('when the divisor is `true`', function () {
            beforeEach(function () {
                this.createValue(true);
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

        describe('when the divisor is `false`', function () {
            beforeEach(function () {
                this.createValue(false);
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
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                left: '21', // Int string is coerced to int
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 21,
                expectDivisionByZero: false
            },
            {
                left: '27.2', // Decimal string is coerced to float
                right: true,
                expectedResultType: FloatValue,
                expectedResult: 27.2,
                expectDivisionByZero: false
            },
            {
                left: '25.4.7', // Decimal string prefix is coerced to float
                right: true,
                expectedResultType: FloatValue,
                expectedResult: 25.4,
                expectDivisionByZero: false
            },
            {
                left: '23',
                right: false,
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
        it('should return "true" when true', function () {
            this.createValue(true);

            expect(this.value.formatAsString()).to.equal('true');
        });

        it('should return "false" when true', function () {
            this.createValue(false);

            expect(this.value.formatAsString()).to.equal('false');
        });
    });

    describe('getNative()', function () {
        it('should return true when true', function () {
            this.createValue(true);

            expect(this.value.getNative()).to.be.true;
        });

        it('should return false when false', function () {
            this.createValue(false);

            expect(this.value.getNative()).to.be.false;
        });
    });

    describe('getProxy()', function () {
        it('should return true when true', function () {
            this.createValue(true);

            expect(this.value.getProxy()).to.be.true;
        });

        it('should return false when false', function () {
            this.createValue(false);

            expect(this.value.getProxy()).to.be.false;
        });
    });

    describe('instantiate()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                this.value.instantiate();
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isAnInstanceOf()', function () {
        it('should hand off to the right-hand operand to determine the result', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.isTheClassOfBoolean.withArgs(this.value).returns(result);

            expect(this.value.isAnInstanceOf(rightOperand)).to.equal(result);
        });
    });

    describe('isEmpty()', function () {
        it('should return true for boolean false', function () {
            this.createValue(false);

            expect(this.value.isEmpty()).to.be.true;
        });

        it('should return false for boolean true', function () {
            this.createValue(true);

            expect(this.value.isEmpty()).to.be.false;
        });
    });

    describe('isNumeric()', function () {
        it('should return false', function () {
            expect(this.value.isNumeric()).to.be.false;
        });
    });

    describe('isTheClassOfArray()', function () {
        it('should raise a fatal error', function () {
            var classValue = sinon.createStubInstance(ArrayValue);

            expect(function () {
                this.value.isTheClassOfArray(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isTheClassOfBoolean()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createBoolean(true);

            expect(function () {
                this.value.isTheClassOfBoolean(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isTheClassOfFloat()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createFloat(22.4);

            expect(function () {
                this.value.isTheClassOfFloat(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isTheClassOfInteger()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createInteger(21);

            expect(function () {
                this.value.isTheClassOfInteger(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isTheClassOfNull()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createNull();

            expect(function () {
                this.value.isTheClassOfNull(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isTheClassOfObject()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createObject({});

            expect(function () {
                this.value.isTheClassOfObject(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isTheClassOfString()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createString('a string');

            expect(function () {
                this.value.isTheClassOfString(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('modulo()', function () {
        it('should always return 0 for false, as it will always coerce to 0', function () {
            var result,
                rightValue = this.factory.createInteger(21);
            this.createValue(false);

            result = this.value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });

        it('should return 1 for true when the remainder is 1', function () {
            var result,
                rightValue = this.factory.createInteger(2);
            this.createValue(true);

            result = this.value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });

        it('should return 0 for true when there is no remainder', function () {
            var result,
                rightValue = this.factory.createInteger(1);
            this.createValue(true);

            result = this.value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });
    });

    describe('multiply()', function () {
        it('should hand off to the right-hand operand to multiply by this boolean', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            this.createValue(true);
            rightOperand.multiplyByBoolean.withArgs(this.value).returns(result);

            expect(this.value.multiply(rightOperand)).to.equal(result);
        });
    });

    describe('multiplyByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createArray([]);
            this.createValue(true);

            expect(function () {
                this.value.multiplyByArray(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('multiplyByBoolean()', function () {
        _.each([
            {
                left: true,
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 1
            },
            {
                left: true,
                right: false,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: false,
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: false,
                right: false,
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
                left: 12.4,
                right: true,
                expectedResultType: FloatValue,
                expectedResult: 12.4
            },
            {
                left: 11,
                right: false,
                expectedResultType: FloatValue,
                expectedResult: 0
            },
            {
                left: 0,
                right: false,
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
                left: 15,
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 15
            },
            {
                left: 11,
                right: false,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: 0,
                right: false,
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
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                right: false,
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

        describe('when the multiplier is `true`', function () {
            beforeEach(function () {
                this.createValue(true);
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

        describe('when the multiplier is `false`', function () {
            beforeEach(function () {
                this.createValue(false);
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
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: '21', // Int string is coerced to int
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 21
            },
            {
                left: '27.2', // Decimal string is coerced to float
                right: true,
                expectedResultType: FloatValue,
                expectedResult: 27.2
            },
            {
                left: '25.4.7', // Decimal string prefix is coerced to float
                right: true,
                expectedResultType: FloatValue,
                expectedResult: 25.4
            },
            {
                left: '23',
                right: false,
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
});
