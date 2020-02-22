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
    Class = require('../../../src/Class').sync(),
    FloatValue = require('../../../src/Value/Float').sync(),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    KeyValuePair = require('../../../src/KeyValuePair'),
    MethodSpec = require('../../../src/MethodSpec'),
    Namespace = require('../../../src/Namespace').sync(),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    NullValue = require('../../../src/Value/Null').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('String', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = new ValueFactory();
        this.globalNamespace = sinon.createStubInstance(Namespace);
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);
        this.namespaceScope.getGlobalNamespace.returns(this.globalNamespace);

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
            this.value = new StringValue(this.factory, this.callStack, nativeValue);
        }.bind(this);
    });

    describe('addToArray()', function () {
        it('should raise a fatal error', function () {
            this.createValue('my string');

            expect(function () {
                this.value.addToArray(this.factory.createArray([]));
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('call()', function () {
        it('should call the function and return its result when string only contains a function name', function () {
            var argValue = sinon.createStubInstance(Value),
                result,
                resultValue = sinon.createStubInstance(Value),
                func = sinon.stub().returns(resultValue);
            this.globalNamespace.getFunction.withArgs('My\\Space\\my_function').returns(func);
            this.createValue('My\\Space\\my_function');

            result = this.value.call([argValue], this.namespaceScope);

            expect(result).to.equal(resultValue);
            expect(func).to.have.been.calledOnce;
            expect(func).to.have.been.calledOn(null);
            expect(func).to.have.been.calledWith(sinon.match.same(argValue));
        });

        it('should call the static method and return its result when string contains [class]::[method]', function () {
            var argValue = sinon.createStubInstance(Value),
                classObject = sinon.createStubInstance(Class),
                result,
                resultValue = sinon.createStubInstance(Value);
            this.globalNamespace.getClass
                .withArgs('My\\Space\\MyClass')
                .returns(classObject);
            classObject.callMethod
                .withArgs(
                    'myStaticMethod',
                    [sinon.match.same(argValue)],
                    null,
                    null,
                    null,
                    false
                )
                .returns(resultValue);
            this.createValue('My\\Space\\MyClass::myStaticMethod');

            result = this.value.call([argValue], this.namespaceScope);

            expect(result).to.equal(resultValue);
        });
    });

    describe('callMethod()', function () {
        it('should throw, as instance methods cannot exist on non-objects', function () {
            this.createValue('something');

            expect(function () {
                this.value.callMethod('aMethod', [], this.namespaceScope);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.non_object_method_call with {"name":"aMethod","type":"string"}'
            );
        });
    });

    describe('callStaticMethod()', function () {
        it('should ask the class to call the method and return its result when non-forwarding', function () {
            var argValue = sinon.createStubInstance(Value),
                classObject = sinon.createStubInstance(Class),
                methodNameValue = this.factory.createString('myMethod'),
                result,
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(resultValue);
            this.globalNamespace.getClass.withArgs('\\My\\Space\\MyClass').returns(classObject);
            this.createValue('\\My\\Space\\MyClass');

            result = this.value.callStaticMethod(methodNameValue, [argValue], this.namespaceScope, false);

            expect(result).to.equal(resultValue);
            expect(classObject.callMethod).to.have.been.calledOnce;
            expect(classObject.callMethod).to.have.been.calledWith(
                'myMethod',
                [sinon.match.same(argValue)],
                null,
                null,
                null,
                false
            );
        });

        it('should ask the class to call the method and return its result when forwarding', function () {
            var argValue = sinon.createStubInstance(Value),
                classObject = sinon.createStubInstance(Class),
                methodNameValue = this.factory.createString('myMethod'),
                result,
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(resultValue);
            this.globalNamespace.getClass.withArgs('\\My\\Space\\MyClass').returns(classObject);
            this.createValue('\\My\\Space\\MyClass');

            result = this.value.callStaticMethod(methodNameValue, [argValue], this.namespaceScope, true);

            expect(result).to.equal(resultValue);
            expect(classObject.callMethod).to.have.been.calledOnce;
            expect(classObject.callMethod).to.have.been.calledWith(
                'myMethod',
                [sinon.match.same(argValue)],
                null,
                null,
                null,
                true
            );
        });
    });

    describe('coerceToFloat()', function () {
        _.each({
            'coercing a positive plain integer to float': {
                string: '21',
                expectedResult: 21.0
            },
            'coercing a negative plain integer to float': {
                string: '-21',
                expectedResult: -21.0
            },
            'coercing a positive plain float': {
                string: '27.123',
                expectedResult: 27.123
            },
            'coercing a negative plain float': {
                string: '-27.123',
                expectedResult: -27.123
            },
            'coercing a non-numeric string': {
                string: 'not a num',
                expectedResult: 0
            },
            'coercing a non-numeric string containing lowercase "e"': {
                string: 'my number',
                expectedResult: 0
            },
            'coercing a non-numeric string containing uppercase "E"': {
                string: 'my numbEr',
                expectedResult: 0
            },
            'coercing an integer followed by lowercase "e"': {
                string: '21 e',
                expectedResult: 21.0
            },
            'coercing an exponent with integer result': {
                string: '1e4',
                expectedResult: 10000
            },
            'coercing a lowercase exponent with float result': {
                string: '1e-3',
                expectedResult: 0.001
            },
            'coercing an uppercase exponent with float result': {
                string: '1E-3',
                expectedResult: 0.001
            }
        }, function (scenario, description) {
            describe(description, function () {
                beforeEach(function () {
                    this.createValue(scenario.string);
                });

                it('should return the correct value', function () {
                    var result = this.value.coerceToFloat();

                    expect(result).to.be.an.instanceOf(FloatValue);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    this.value.coerceToFloat();

                    expect(this.callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('coerceToInteger()', function () {
        _.each({
            'coercing a positive plain integer to int': {
                string: '21',
                expectedResult: 21
            },
            'coercing a negative plain integer to int': {
                string: '-21',
                expectedResult: -21
            },
            'coercing a positive plain float to integer': {
                string: '27.123',
                expectedResult: 27
            },
            'coercing a negative plain float to integer': {
                string: '-27.123',
                expectedResult: -27
            },
            'coercing a non-numeric string': {
                string: 'not a num',
                expectedResult: 0
            },
            'coercing a non-numeric string containing lowercase "e"': {
                string: 'my number',
                expectedResult: 0
            },
            'coercing a non-numeric string containing uppercase "E"': {
                string: 'my numbEr',
                expectedResult: 0
            },
            'coercing an integer followed by lowercase "e"': {
                string: '21 e',
                expectedResult: 21
            },
            'coercing an exponent with integer result': {
                string: '1e4',
                expectedResult: 1 // Can only be parsed as a float despite actually having integer value
            },
            'coercing a lowercase exponent with float result': {
                string: '1e-3',
                expectedResult: 1
            },
            'coercing an uppercase exponent with float result': {
                string: '1E-3',
                expectedResult: 1
            }
        }, function (scenario, description) {
            describe(description, function () {
                beforeEach(function () {
                    this.createValue(scenario.string);
                });

                it('should return the correct value', function () {
                    var result = this.value.coerceToInteger();

                    expect(result).to.be.an.instanceOf(IntegerValue);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    this.value.coerceToInteger();

                    expect(this.callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('coerceToNativeError()', function () {
        it('should throw an error as this is invalid', function () {
            this.createValue('my string');

            expect(function () {
                this.value.coerceToNativeError();
            }.bind(this)).to.throw(
                'Only instances of Throwable may be thrown: tried to throw a(n) string'
            );
        });
    });

    describe('coerceToNumber()', function () {
        _.each({
            'coercing a positive plain integer to int': {
                string: '21',
                expectedResultType: IntegerValue,
                expectedResult: 21
            },
            'coercing a negative plain integer to int': {
                string: '-21',
                expectedResultType: IntegerValue,
                expectedResult: -21
            },
            'coercing a positive plain float to float': {
                string: '27.123',
                expectedResultType: FloatValue,
                expectedResult: 27.123
            },
            'coercing a negative plain float to float': {
                string: '-27.123',
                expectedResultType: FloatValue,
                expectedResult: -27.123
            },
            'coercing a negative plain float without leading zero to float': {
                string: '-.123',
                expectedResultType: FloatValue,
                expectedResult: -0.123
            },
            'coercing a non-numeric string': {
                string: 'not a num',
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            'coercing a non-numeric string containing lowercase "e"': {
                string: 'my number',
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            'coercing a non-numeric string containing uppercase "E"': {
                string: 'my numbEr',
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            'coercing an integer followed by lowercase "e"': {
                string: '21 e',
                expectedResultType: IntegerValue,
                expectedResult: 21
            },
            'coercing an implicitly positive exponent (will give an integer result, but as a float)': {
                string: '1e4',
                expectedResultType: FloatValue, // Exponents are always evaluated to floats
                expectedResult: 10000
            },
            'coercing an explicitly positive exponent (will give an integer result, but as a float)': {
                string: '1e+4',
                expectedResultType: FloatValue, // Exponents are always evaluated to floats
                expectedResult: 10000
            },
            'coercing a lowercase exponent with float result': {
                string: '1e-3',
                expectedResultType: FloatValue,
                expectedResult: 0.001
            },
            'coercing an uppercase exponent with float result': {
                string: '1E-3',
                expectedResultType: FloatValue,
                expectedResult: 0.001
            }
        }, function (scenario, description) {
            describe(description, function () {
                beforeEach(function () {
                    this.createValue(scenario.string);
                });

                it('should return the correct value', function () {
                    var result = this.value.coerceToNumber();

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    this.value.coerceToNumber();

                    expect(this.callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('divide()', function () {
        it('should hand off to the right-hand operand to divide by this string', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            this.createValue('my string');
            rightOperand.divideByString.withArgs(this.value).returns(result);

            expect(this.value.divide(rightOperand)).to.equal(result);
        });
    });

    describe('divideByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createArray([]);
            this.createValue('my string');

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
                right: '1.25',
                expectedResultType: FloatValue,
                expectedResult: 0.8,
                expectDivisionByZero: false
            },
            {
                left: true,
                right: '0.0',
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                left: false,
                right: '1.0',
                expectedResultType: FloatValue,
                expectedResult: 0.0,
                expectDivisionByZero: false
            },
            {
                left: true,
                right: 'not a number',
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
                right: '1.0',
                expectedResultType: FloatValue,
                expectedResult: 12.4,
                expectDivisionByZero: false
            },
            {
                left: 20.5,
                right: '0.5',
                expectedResultType: FloatValue,
                expectedResult: 41.0,
                expectDivisionByZero: false
            },
            {
                left: 11.0,
                right: '0',
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                left: 21.0,
                right: 'not a number',
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
                right: '1.0',
                expectedResultType: FloatValue,
                expectedResult: 15,
                expectDivisionByZero: false
            },
            {
                left: 100,
                right: '2.5',
                expectedResultType: FloatValue,
                expectedResult: 40.0,
                expectDivisionByZero: false
            },
            {
                left: 11,
                right: '0.0',
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                left: 21,
                right: 'not a number',
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
                right: '1',
                expectedResultType: IntegerValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                right: '1.0',
                expectedResultType: FloatValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                right: '0.0',
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            },
            {
                right: 'not my number',
                expectedResultType: BooleanValue,
                expectedResult: false,
                expectDivisionByZero: true
            }
        ], function (scenario) {
            describe('for `null / ' + scenario.right + '`', function () {
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
                this.createValue('1');
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

        describe('when the divisor is `1.0`', function () {
            beforeEach(function () {
                this.createValue('1.0');
            });

            it('should return float(1.0)', function () {
                var result = this.value.divideByObject(this.leftValue);

                expect(result).to.be.an.instanceOf(FloatValue);
                expect(result.getNative()).to.equal(1);
            });

            it('should not raise any extra notices', function () {
                this.value.divideByObject(this.leftValue);

                expect(this.callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('when the divisor is `0`', function () {
            beforeEach(function () {
                this.createValue('0');
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
                right: '1.0',
                expectedResultType: FloatValue,
                expectedResult: 0,
                expectDivisionByZero: false
            },
            {
                left: '21', // Int string is coerced to int
                right: '1.0',
                expectedResultType: FloatValue,
                expectedResult: 21,
                expectDivisionByZero: false
            },
            {
                left: '22.4', // Decimal string is coerced to float
                right: '2',
                expectedResultType: FloatValue,
                expectedResult: 11.2,
                expectDivisionByZero: false
            },
            {
                left: '27.2', // Decimal string is coerced to float
                right: '3.4',
                expectedResultType: FloatValue,
                expectedResult: 8.0,
                expectDivisionByZero: false
            },
            {
                left: '25.4.7', // Decimal string prefix is coerced to float
                right: '2.0',
                expectedResultType: FloatValue,
                expectedResult: 12.7,
                expectDivisionByZero: false
            },
            {
                left: '23',
                right: '0',
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
        it('should wrap the value in single quotes', function () {
            this.createValue('my string here');

            expect(this.value.formatAsString()).to.equal('\'my string here\'');
        });

        // NB: This is how Zend's engine behaves, so we duplicate that behaviour here
        it('should not do anything special with embedded single quotes', function () {
            this.createValue('embed- \' -ded');

            expect(this.value.formatAsString()).to.equal('\'embed- \' -ded\'');
        });

        it('should not truncate a string of 14 chars', function () {
            this.createValue('my string text');

            expect(this.value.formatAsString()).to.equal('\'my string text\'');
        });

        it('should truncate the string to a max of 15 chars', function () {
            this.createValue('my long long string text');

            expect(this.value.formatAsString()).to.equal('\'my long long st...\'');
        });
    });

    describe('getCallableName()', function () {
        it('should just return the value when it does not begin with a backslash', function () {
            this.createValue('This\\Is\\My\\Class');

            expect(this.value.getCallableName()).to.equal('This\\Is\\My\\Class');
        });

        it('should strip any leading backslash off of the value', function () {
            this.createValue('\\This\\Is\\Also\\My\\Class');

            expect(this.value.getCallableName()).to.equal('This\\Is\\Also\\My\\Class');
        });
    });

    describe('getConstantByName()', function () {
        it('should fetch the constant from the class', function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue = sinon.createStubInstance(Value);
            this.globalNamespace.getClass.withArgs('My\\Space\\MyClass').returns(classObject);
            classObject.getConstantByName.withArgs('MY_CONST').returns(resultValue);
            this.createValue('My\\Space\\MyClass');

            expect(this.value.getConstantByName('MY_CONST', this.namespaceScope)).to.equal(resultValue);
        });
    });

    describe('getDisplayType()', function () {
        it('should return the value type', function () {
            this.createValue('my string');

            expect(this.value.getDisplayType()).to.equal('string');
        });
    });

    describe('getNative()', function () {
        it('should return "hello" when expected', function () {
            this.createValue('hello');

            expect(this.value.getNative()).to.equal('hello');
        });

        it('should return "world" when expected', function () {
            this.createValue('world');

            expect(this.value.getNative()).to.equal('world');
        });
    });

    describe('getProxy()', function () {
        it('should return "hello" when expected', function () {
            this.createValue('hello');

            expect(this.value.getProxy()).to.equal('hello');
        });

        it('should return "world" when expected', function () {
            this.createValue('world');

            expect(this.value.getProxy()).to.equal('world');
        });
    });

    describe('getReference()', function () {
        it('should throw an error', function () {
            this.createValue('my string');

            expect(function () {
                this.value.getReference();
            }.bind(this)).to.throw('Cannot get a reference to a value');
        });
    });

    describe('getStaticPropertyByName()', function () {
        it('should fetch the property\'s value from the class', function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue = sinon.createStubInstance(Value);
            this.globalNamespace.getClass.withArgs('My\\Space\\MyClass').returns(classObject);
            classObject.getStaticPropertyByName.withArgs('myProp').returns(resultValue);
            this.createValue('My\\Space\\MyClass');

            expect(
                this.value.getStaticPropertyByName(
                    this.factory.createString('myProp'),
                    this.namespaceScope
                )
            ).to.equal(resultValue);
        });
    });

    describe('instantiate()', function () {
        beforeEach(function () {
            this.classObject = sinon.createStubInstance(Class);
            this.globalNamespace.getClass.withArgs('My\\Space\\MyClass').returns(this.classObject);
            this.newObjectValue = sinon.createStubInstance(ObjectValue);
            this.classObject.instantiate.returns(this.newObjectValue);
        });

        it('should pass the args along', function () {
            var argValue = sinon.createStubInstance(IntegerValue);
            this.createValue('My\\Space\\MyClass');

            this.value.instantiate([argValue], this.namespaceScope);

            expect(this.classObject.instantiate).to.have.been.calledOnce;
            expect(this.classObject.instantiate).to.have.been.calledWith([sinon.match.same(argValue)]);
        });

        it('should return the new instance created by the class', function () {
            this.createValue('My\\Space\\MyClass');

            expect(this.value.instantiate([], this.namespaceScope)).to.equal(this.newObjectValue);
        });
    });

    describe('isAnInstanceOf()', function () {
        beforeEach(function () {
            this.createValue('a string');
        });

        it('should hand off to the right-hand operand to determine the result', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.isTheClassOfString.withArgs(this.value).returns(result);

            expect(this.value.isAnInstanceOf(rightOperand)).to.equal(result);
        });
    });

    describe('isCallable()', function () {
        it('should return true for a function name that exists', function () {
            this.globalNamespace.hasFunction
                .withArgs('myFunction')
                .returns(true);
            this.createValue('myFunction');

            expect(this.value.isCallable(this.namespaceScope)).to.be.true;
        });

        it('should return true for a static method name that exists', function () {
            var classObject = sinon.createStubInstance(Class),
                methodSpec = sinon.createStubInstance(MethodSpec);
            this.globalNamespace.getClass
                .withArgs('My\\Fqcn')
                .returns(classObject);
            this.globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(true);
            classObject.getMethodSpec
                .withArgs('myMethod')
                .returns(methodSpec);
            this.createValue('My\\Fqcn::myMethod');

            expect(this.value.isCallable(this.namespaceScope)).to.be.true;
        });

        it('should return false for a function name that doesn\'t exist', function () {
            this.globalNamespace.hasFunction
                .withArgs('myNonExistentFunction')
                .returns(false);
            this.createValue('myNonExistentFunction');

            expect(this.value.isCallable(this.namespaceScope)).to.be.false;
        });

        it('should return false for a static method that doesn\'t exist for a defined class', function () {
            var classObject = sinon.createStubInstance(Class);
            this.globalNamespace.getClass
                .withArgs('My\\Fqcn')
                .returns(classObject);
            this.globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(true);
            classObject.getMethodSpec
                .withArgs('myMethod')
                .returns(null);
            this.createValue('My\\Fqcn::myMethod');

            expect(this.value.isCallable(this.namespaceScope)).to.be.false;
        });

        it('should return false for a static method of a non-existent class', function () {
            this.globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(false);
            this.createValue('My\\NonExistentFqcn::myMethod');

            expect(this.value.isCallable(this.namespaceScope)).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true for the empty string', function () {
            this.createValue('');

            expect(this.value.isEmpty()).to.be.true;
        });

        it('should return true for the string "0"', function () {
            this.createValue('0');

            expect(this.value.isEmpty()).to.be.true;
        });

        it('should return false for a string of text', function () {
            this.createValue('my text');

            expect(this.value.isEmpty()).to.be.false;
        });

        it('should return false for the string "0.0", in contrast to the integer version', function () {
            this.createValue('0.0');

            expect(this.value.isEmpty()).to.be.false;
        });
    });

    describe('isIterable()', function () {
        it('should return false', function () {
            expect(this.value.isIterable()).to.be.false;
        });
    });

    describe('isNumeric()', function () {
        _.each([
            '21',
            '1e4',
            '1e+5',
            '1e-6',
            '4E-7',
            '-7',
            '-21.2'
        ], function (value) {
            it('should return true when the value is numeric (' + value + ')', function () {
                this.createValue(value);

                expect(this.value.isNumeric()).to.be.true;
            });
        });

        it('should return false when the value is not numeric', function () {
            this.createValue('hello');

            expect(this.value.isNumeric()).to.be.false;
        });
    });

    describe('isTheClassOfArray()', function () {
        beforeEach(function () {
            this.createValue('a string');
        });

        it('should return bool(false)', function () {
            var classValue = sinon.createStubInstance(ArrayValue),
                result = this.value.isTheClassOfArray(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfBoolean()', function () {
        beforeEach(function () {
            this.createValue('a string');
        });

        it('should return bool(false)', function () {
            var classValue = this.factory.createBoolean(true),
                result = this.value.isTheClassOfBoolean(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfFloat()', function () {
        beforeEach(function () {
            this.createValue('a string');
        });

        it('should return bool(false)', function () {
            var classValue = this.factory.createFloat(21.2),
                result = this.value.isTheClassOfFloat(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfInteger()', function () {
        beforeEach(function () {
            this.createValue('a string');
        });

        it('should return bool(false)', function () {
            var classValue = this.factory.createInteger(21),
                result = this.value.isTheClassOfInteger(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfNull()', function () {
        beforeEach(function () {
            this.createValue('a string');
        });

        it('should return bool(false)', function () {
            var classValue = this.factory.createNull(),
                result = this.value.isTheClassOfNull(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfObject()', function () {
        beforeEach(function () {
            this.createValue('This\\Class\\Path');
        });

        it('should return bool(true) when the subject object\'s class is this class', function () {
            var subjectObjectValue = sinon.createStubInstance(ObjectValue),
                result;
            subjectObjectValue.classIs.withArgs('This\\Class\\Path').returns(true);

            result = this.value.isTheClassOfObject(subjectObjectValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(true);
        });

        it('should return bool(false) when the subject object\'s class is not this class', function () {
            var subjectObjectValue = sinon.createStubInstance(ObjectValue),
                result;
            subjectObjectValue.classIs.withArgs('This\\Class\\Path').returns(false);

            result = this.value.isTheClassOfObject(subjectObjectValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfString()', function () {
        beforeEach(function () {
            this.createValue('a string');
        });

        it('should return bool(false)', function () {
            var classValue = this.factory.createString('my string'),
                result = this.value.isTheClassOfString(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('modulo()', function () {
        it('should return the correct remainder of 3 for 23 mod 5', function () {
            var result,
                rightValue = this.factory.createInteger(5);
            this.createValue('23');

            result = this.value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(3);
        });

        it('should return the correct remainder of 0 for 10 mod 2', function () {
            var result,
                rightValue = this.factory.createInteger(2);
            this.createValue('10');

            result = this.value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });

        it('should return the correct remainder of 4 for 24 mod 5', function () {
            var result,
                rightValue = this.factory.createInteger(5);
            this.createValue('24');

            result = this.value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(4);
        });
    });

    describe('multiply()', function () {
        it('should hand off to the right-hand operand to multiply by this string', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            this.createValue('my string');
            rightOperand.multiplyByString.withArgs(this.value).returns(result);

            expect(this.value.multiply(rightOperand)).to.equal(result);
        });
    });

    describe('multiplyByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createArray([]);
            this.createValue('my string');

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
                right: '1.25',
                expectedResultType: FloatValue,
                expectedResult: 1.25
            },
            {
                left: true,
                right: '0.0',
                expectedResultType: FloatValue,
                expectedResult: 0.0
            },
            {
                left: false,
                right: '1.0',
                expectedResultType: FloatValue,
                expectedResult: 0.0
            },
            {
                left: true,
                right: 'not a number',
                expectedResultType: IntegerValue,
                expectedResult: 0.0
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
                right: '1.0',
                expectedResultType: FloatValue,
                expectedResult: 12.4
            },
            {
                left: 20.5,
                right: '0.5',
                expectedResultType: FloatValue,
                expectedResult: 10.25
            },
            {
                left: 11.0,
                right: '0',
                expectedResultType: FloatValue,
                expectedResult: 0.0
            },
            {
                left: 21.0,
                right: 'not a number',
                expectedResultType: FloatValue,
                expectedResult: 0.0
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
                right: '1.0',
                expectedResultType: FloatValue,
                expectedResult: 15.0
            },
            {
                left: 100,
                right: '2.5',
                expectedResultType: FloatValue,
                expectedResult: 250.0
            },
            {
                left: 11,
                right: '0.0',
                expectedResultType: FloatValue,
                expectedResult: 0.0
            },
            {
                left: 21,
                right: 'not a number',
                expectedResultType: IntegerValue, // No float operands, so product will be an integer
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
                right: '1',
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                right: '1.0',
                expectedResultType: FloatValue,
                expectedResult: 0.0
            },
            {
                right: '0.0',
                expectedResultType: FloatValue,
                expectedResult: 0.0
            },
            {
                right: 'not my number',
                expectedResultType: IntegerValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `null * ' + scenario.right + '`', function () {
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
                this.createValue('1');
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

        describe('when the multiplier is `1.0`', function () {
            beforeEach(function () {
                this.createValue('1.0');
            });

            it('should return float(1.0)', function () {
                var result = this.value.multiplyByObject(this.leftValue);

                expect(result).to.be.an.instanceOf(FloatValue);
                expect(result.getNative()).to.equal(1.0);
            });

            it('should not raise any extra notices', function () {
                this.value.multiplyByObject(this.leftValue);

                expect(this.callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('when the multiplier is `0`', function () {
            beforeEach(function () {
                this.createValue('0');
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
                right: '1.0',
                expectedResultType: FloatValue,
                expectedResult: 0.0
            },
            {
                left: '21', // Int string is coerced to int
                right: '1.0',
                expectedResultType: FloatValue,
                expectedResult: 21.0
            },
            {
                left: '22.4', // Decimal string is coerced to float
                right: '2',
                expectedResultType: FloatValue,
                expectedResult: 44.8
            },
            {
                left: '16.2', // Decimal string is coerced to float
                right: '2.5',
                expectedResultType: FloatValue,
                expectedResult: 40.5
            },
            {
                left: '25.4.7', // Decimal string prefix is coerced to float
                right: '2.0',
                expectedResultType: FloatValue,
                expectedResult: 50.8
            },
            {
                left: '23',
                right: '0',
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
        it('should throw an "Unsupported operand" error', function () {
            this.createValue('my string');

            expect(function () {
                this.value.subtractFromNull();
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });
});
