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
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Boolean', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = sinon.createStubInstance(ValueFactory);
        this.factory.createBoolean.restore();
        sinon.stub(this.factory, 'createBoolean', function (nativeValue) {
            var booleanValue = sinon.createStubInstance(BooleanValue);
            booleanValue.getType.returns('boolean');
            booleanValue.coerceToKey.returns(booleanValue);
            booleanValue.coerceToNumber.restore();
            sinon.stub(booleanValue, 'coerceToNumber', function () {
                return this.factory.createInteger(nativeValue ? 1 : 0);
            }.bind(this));
            booleanValue.getForAssignment.returns(booleanValue);
            booleanValue.getNative.returns(nativeValue);
            return booleanValue;
        }.bind(this));
        this.factory.createFloat.restore();
        sinon.stub(this.factory, 'createFloat', function (nativeValue) {
            var floatValue = sinon.createStubInstance(FloatValue);
            floatValue.getType.returns('float');
            floatValue.coerceToKey.returns(floatValue);
            floatValue.coerceToNumber.returns(floatValue);
            floatValue.getForAssignment.returns(floatValue);
            floatValue.getNative.returns(nativeValue);
            return floatValue;
        }.bind(this));
        this.factory.createInteger.restore();
        sinon.stub(this.factory, 'createInteger', function (nativeValue) {
            var integerValue = sinon.createStubInstance(IntegerValue);
            integerValue.getType.returns('integer');
            integerValue.coerceToKey.returns(integerValue);
            integerValue.coerceToNumber.returns(integerValue);
            integerValue.getForAssignment.returns(integerValue);
            integerValue.getNative.returns(nativeValue);
            return integerValue;
        }.bind(this));
        this.factory.createNull.restore();
        sinon.stub(this.factory, 'createNull', function (nativeValue) {
            var nullValue = sinon.createStubInstance(NullValue);
            nullValue.getType.returns('null');
            nullValue.coerceToKey.returns(nullValue);
            nullValue.getForAssignment.returns(nullValue);
            nullValue.getNative.returns(nativeValue);
            return nullValue;
        }.bind(this));
        this.factory.createObject.restore();
        sinon.stub(this.factory, 'createObject', function (nativeValue) {
            var objectValue = sinon.createStubInstance(ObjectValue);
            objectValue.getType.returns('object');
            objectValue.coerceToKey.returns(objectValue);
            objectValue.getForAssignment.returns(objectValue);
            objectValue.getNative.returns(nativeValue);
            return objectValue;
        }.bind(this));
        this.factory.createString.restore();
        sinon.stub(this.factory, 'createString', function (nativeValue) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.getType.returns('string');
            stringValue.coerceToKey.returns(stringValue);
            stringValue.getForAssignment.returns(stringValue);
            stringValue.getNative.returns(nativeValue);
            stringValue.isEqualTo.restore();
            sinon.stub(stringValue, 'isEqualTo', function (otherValue) {
                return this.factory.createBoolean(otherValue.getNative() === nativeValue);
            }.bind(this));
            return stringValue;
        }.bind(this));

        this.createKeyValuePair = function (key, value) {
            var keyValuePair = sinon.createStubInstance(KeyValuePair);
            keyValuePair.getKey.returns(key);
            keyValuePair.getValue.returns(value);
            return keyValuePair;
        };

        this.createValue = function (nativeValue) {
            this.value = new BooleanValue(this.factory, this.callStack, nativeValue);
        }.bind(this);
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
                coercedLeftClass: IntegerValue,
                coercedLeftType: 'integer',
                coercedLeft: 0,
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                left: '21', // Int string is coerced to int
                coercedLeftClass: IntegerValue,
                coercedLeftType: 'integer',
                coercedLeft: 21,
                right: true,
                expectedResultType: IntegerValue,
                expectedResult: 21,
                expectDivisionByZero: false
            },
            {
                left: '27.2', // Decimal string is coerced to float
                coercedLeftClass: FloatValue,
                coercedLeftType: 'float',
                coercedLeft: 27.2,
                right: true,
                expectedResultType: FloatValue,
                expectedResult: 27.2,
                expectDivisionByZero: false
            },
            {
                left: '25.4.7', // Decimal string prefix is coerced to float
                coercedLeftClass: FloatValue,
                coercedLeftType: 'float',
                coercedLeft: 25.4,
                right: true,
                expectedResultType: FloatValue,
                expectedResult: 25.4,
                expectDivisionByZero: false
            },
            {
                left: '23',
                coercedLeftClass: IntegerValue,
                coercedLeftType: 'integer',
                coercedLeft: 0,
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

                    this.coercedLeftValue = sinon.createStubInstance(scenario.coercedLeftClass);
                    this.coercedLeftValue.getType.returns(scenario.coercedLeftType);
                    this.coercedLeftValue.getNative.returns(scenario.coercedLeft);
                    this.leftValue.coerceToNumber.returns(this.coercedLeftValue);
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

    describe('isAnInstanceOf()', function () {
        it('should hand off to the right-hand operand to determine the result', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.isTheClassOfBoolean.withArgs(this.value).returns(result);

            expect(this.value.isAnInstanceOf(rightOperand)).to.equal(result);
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
});
