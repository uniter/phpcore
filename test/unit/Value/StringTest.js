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
    var callStack,
        createKeyValuePair,
        createValue,
        factory,
        globalNamespace,
        namespaceScope,
        value;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        factory = new ValueFactory();
        globalNamespace = sinon.createStubInstance(Namespace);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        namespaceScope.getGlobalNamespace.returns(globalNamespace);

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
            value = new StringValue(factory, callStack, nativeValue);
        };
    });

    describe('addToArray()', function () {
        it('should raise a fatal error', function () {
            createValue('my string');

            expect(function () {
                value.addToArray(factory.createArray([]));
            }).to.throw(
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
            globalNamespace.getFunction.withArgs('My\\Space\\my_function').returns(func);
            createValue('My\\Space\\my_function');

            result = value.call([argValue], namespaceScope);

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
            globalNamespace.getClass
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
            createValue('My\\Space\\MyClass::myStaticMethod');

            result = value.call([argValue], namespaceScope);

            expect(result).to.equal(resultValue);
        });
    });

    describe('callMethod()', function () {
        it('should throw, as instance methods cannot exist on non-objects', function () {
            createValue('something');

            expect(function () {
                value.callMethod('aMethod', [], namespaceScope);
            }).to.throw(
                'Fake PHP Fatal error for #core.non_object_method_call with {"name":"aMethod","type":"string"}'
            );
        });
    });

    describe('callStaticMethod()', function () {
        it('should ask the class to call the method and return its result when non-forwarding', function () {
            var argValue = sinon.createStubInstance(Value),
                classObject = sinon.createStubInstance(Class),
                methodNameValue = factory.createString('myMethod'),
                result,
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(resultValue);
            globalNamespace.getClass.withArgs('\\My\\Space\\MyClass').returns(classObject);
            createValue('\\My\\Space\\MyClass');

            result = value.callStaticMethod(methodNameValue, [argValue], namespaceScope, false);

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
                methodNameValue = factory.createString('myMethod'),
                result,
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(resultValue);
            globalNamespace.getClass.withArgs('\\My\\Space\\MyClass').returns(classObject);
            createValue('\\My\\Space\\MyClass');

            result = value.callStaticMethod(methodNameValue, [argValue], namespaceScope, true);

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

    describe('clone()', function () {
        it('should raise an error', function () {
            createValue('my string');

            expect(function () {
                value.clone();
            }).to.throw(
                'Fake PHP Fatal error for #core.method_called_on_non_object with {"method":"__clone"}'
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
                    createValue(scenario.string);
                });

                it('should return the correct value', function () {
                    var result = value.coerceToFloat();

                    expect(result).to.be.an.instanceOf(FloatValue);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    value.coerceToFloat();

                    expect(callStack.raiseError).not.to.have.been.called;
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
                    createValue(scenario.string);
                });

                it('should return the correct value', function () {
                    var result = value.coerceToInteger();

                    expect(result).to.be.an.instanceOf(IntegerValue);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    value.coerceToInteger();

                    expect(callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('coerceToNativeError()', function () {
        it('should throw an error as this is invalid', function () {
            createValue('my string');

            expect(function () {
                value.coerceToNativeError();
            }).to.throw(
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
                    createValue(scenario.string);
                });

                it('should return the correct value', function () {
                    var result = value.coerceToNumber();

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should not raise any warnings', function () {
                    value.coerceToNumber();

                    expect(callStack.raiseError).not.to.have.been.called;
                });
            });
        });
    });

    describe('divide()', function () {
        it('should hand off to the right-hand operand to divide by this string', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            createValue('my string');
            rightOperand.divideByString.withArgs(value).returns(result);

            expect(value.divide(rightOperand)).to.equal(result);
        });
    });

    describe('divideByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createArray([]);
            createValue('my string');

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

        describe('when the divisor is `1`', function () {
            beforeEach(function () {
                createValue('1');
            });

            it('should return int(1)', function () {
                var result = value.divideByObject(leftValue);

                expect(result).to.be.an.instanceOf(IntegerValue);
                expect(result.getNative()).to.equal(1);
            });

            it('should not raise any extra notices', function () {
                value.divideByObject(leftValue);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('when the divisor is `1.0`', function () {
            beforeEach(function () {
                createValue('1.0');
            });

            it('should return float(1.0)', function () {
                var result = value.divideByObject(leftValue);

                expect(result).to.be.an.instanceOf(FloatValue);
                expect(result.getNative()).to.equal(1);
            });

            it('should not raise any extra notices', function () {
                value.divideByObject(leftValue);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('when the divisor is `0`', function () {
            beforeEach(function () {
                createValue('0');
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
        it('should wrap the value in single quotes', function () {
            createValue('my string here');

            expect(value.formatAsString()).to.equal('\'my string here\'');
        });

        // NB: This is how Zend's engine behaves, so we duplicate that behaviour here
        it('should not do anything special with embedded single quotes', function () {
            createValue('embed- \' -ded');

            expect(value.formatAsString()).to.equal('\'embed- \' -ded\'');
        });

        it('should not truncate a string of 14 chars', function () {
            createValue('my string text');

            expect(value.formatAsString()).to.equal('\'my string text\'');
        });

        it('should truncate the string to a max of 15 chars', function () {
            createValue('my long long string text');

            expect(value.formatAsString()).to.equal('\'my long long st...\'');
        });
    });

    describe('getCallableName()', function () {
        it('should just return the value when it does not begin with a backslash', function () {
            createValue('This\\Is\\My\\Class');

            expect(value.getCallableName()).to.equal('This\\Is\\My\\Class');
        });

        it('should strip any leading backslash off of the value', function () {
            createValue('\\This\\Is\\Also\\My\\Class');

            expect(value.getCallableName()).to.equal('This\\Is\\Also\\My\\Class');
        });
    });

    describe('getConstantByName()', function () {
        it('should fetch the constant from the class', function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue = sinon.createStubInstance(Value);
            globalNamespace.getClass.withArgs('My\\Space\\MyClass').returns(classObject);
            classObject.getConstantByName.withArgs('MY_CONST').returns(resultValue);
            createValue('My\\Space\\MyClass');

            expect(value.getConstantByName('MY_CONST', namespaceScope)).to.equal(resultValue);
        });
    });

    describe('getDisplayType()', function () {
        it('should return the value type', function () {
            createValue('my string');

            expect(value.getDisplayType()).to.equal('string');
        });
    });

    describe('getNative()', function () {
        it('should return "hello" when expected', function () {
            createValue('hello');

            expect(value.getNative()).to.equal('hello');
        });

        it('should return "world" when expected', function () {
            createValue('world');

            expect(value.getNative()).to.equal('world');
        });
    });

    describe('getProxy()', function () {
        it('should return "hello" when expected', function () {
            createValue('hello');

            expect(value.getProxy()).to.equal('hello');
        });

        it('should return "world" when expected', function () {
            createValue('world');

            expect(value.getProxy()).to.equal('world');
        });
    });

    describe('getReference()', function () {
        it('should throw an error', function () {
            createValue('my string');

            expect(function () {
                value.getReference();
            }).to.throw('Cannot get a reference to a value');
        });
    });

    describe('getStaticPropertyByName()', function () {
        it('should fetch the property\'s value from the class', function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue = sinon.createStubInstance(Value);
            globalNamespace.getClass.withArgs('My\\Space\\MyClass').returns(classObject);
            classObject.getStaticPropertyByName.withArgs('myProp').returns(resultValue);
            createValue('My\\Space\\MyClass');

            expect(
                value.getStaticPropertyByName(
                    factory.createString('myProp'),
                    namespaceScope
                )
            ).to.equal(resultValue);
        });
    });

    describe('getValueOrNull()', function () {
        it('should just return this value, as values are always classed as "defined"', function () {
            createValue('my string');

            expect(value.getValueOrNull()).to.equal(value);
        });
    });

    describe('instantiate()', function () {
        var classObject,
            newObjectValue;

        beforeEach(function () {
            classObject = sinon.createStubInstance(Class);
            globalNamespace.getClass.withArgs('My\\Space\\MyClass').returns(classObject);
            newObjectValue = sinon.createStubInstance(ObjectValue);
            classObject.instantiate.returns(newObjectValue);
        });

        it('should pass the args along', function () {
            var argValue = sinon.createStubInstance(IntegerValue);
            createValue('My\\Space\\MyClass');

            value.instantiate([argValue], namespaceScope);

            expect(classObject.instantiate).to.have.been.calledOnce;
            expect(classObject.instantiate).to.have.been.calledWith([sinon.match.same(argValue)]);
        });

        it('should return the new instance created by the class', function () {
            createValue('My\\Space\\MyClass');

            expect(value.instantiate([], namespaceScope)).to.equal(newObjectValue);
        });
    });

    describe('isAnInstanceOf()', function () {
        beforeEach(function () {
            createValue('a string');
        });

        it('should hand off to the right-hand operand to determine the result', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.isTheClassOfString.withArgs(value).returns(result);

            expect(value.isAnInstanceOf(rightOperand)).to.equal(result);
        });
    });

    describe('isCallable()', function () {
        it('should return true for a function name that exists', function () {
            globalNamespace.hasFunction
                .withArgs('myFunction')
                .returns(true);
            createValue('myFunction');

            expect(value.isCallable(namespaceScope)).to.be.true;
        });

        it('should return true for a static method name that exists', function () {
            var classObject = sinon.createStubInstance(Class),
                methodSpec = sinon.createStubInstance(MethodSpec);
            globalNamespace.getClass
                .withArgs('My\\Fqcn')
                .returns(classObject);
            globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(true);
            classObject.getMethodSpec
                .withArgs('myMethod')
                .returns(methodSpec);
            createValue('My\\Fqcn::myMethod');

            expect(value.isCallable(namespaceScope)).to.be.true;
        });

        it('should return false for a function name that doesn\'t exist', function () {
            globalNamespace.hasFunction
                .withArgs('myNonExistentFunction')
                .returns(false);
            createValue('myNonExistentFunction');

            expect(value.isCallable(namespaceScope)).to.be.false;
        });

        it('should return false for a static method that doesn\'t exist for a defined class', function () {
            var classObject = sinon.createStubInstance(Class);
            globalNamespace.getClass
                .withArgs('My\\Fqcn')
                .returns(classObject);
            globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(true);
            classObject.getMethodSpec
                .withArgs('myMethod')
                .returns(null);
            createValue('My\\Fqcn::myMethod');

            expect(value.isCallable(namespaceScope)).to.be.false;
        });

        it('should return false for a static method of a non-existent class', function () {
            globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(false);
            createValue('My\\NonExistentFqcn::myMethod');

            expect(value.isCallable(namespaceScope)).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true for the empty string', function () {
            createValue('');

            expect(value.isEmpty()).to.be.true;
        });

        it('should return true for the string "0"', function () {
            createValue('0');

            expect(value.isEmpty()).to.be.true;
        });

        it('should return false for a string of text', function () {
            createValue('my text');

            expect(value.isEmpty()).to.be.false;
        });

        it('should return false for the string "0.0", in contrast to the integer version', function () {
            createValue('0.0');

            expect(value.isEmpty()).to.be.false;
        });
    });

    describe('isIterable()', function () {
        it('should return false', function () {
            expect(value.isIterable()).to.be.false;
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
        ], function (nativeValue) {
            it('should return true when the value is numeric (' + nativeValue + ')', function () {
                createValue(nativeValue);

                expect(value.isNumeric()).to.be.true;
            });
        });

        it('should return false when the value is not numeric', function () {
            createValue('hello');

            expect(value.isNumeric()).to.be.false;
        });
    });

    describe('isTheClassOfArray()', function () {
        beforeEach(function () {
            createValue('a string');
        });

        it('should return bool(false)', function () {
            var classValue = sinon.createStubInstance(ArrayValue),
                result = value.isTheClassOfArray(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfBoolean()', function () {
        beforeEach(function () {
            createValue('a string');
        });

        it('should return bool(false)', function () {
            var classValue = factory.createBoolean(true),
                result = value.isTheClassOfBoolean(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfFloat()', function () {
        beforeEach(function () {
            createValue('a string');
        });

        it('should return bool(false)', function () {
            var classValue = factory.createFloat(21.2),
                result = value.isTheClassOfFloat(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfInteger()', function () {
        beforeEach(function () {
            createValue('a string');
        });

        it('should return bool(false)', function () {
            var classValue = factory.createInteger(21),
                result = value.isTheClassOfInteger(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfNull()', function () {
        beforeEach(function () {
            createValue('a string');
        });

        it('should return bool(false)', function () {
            var classValue = factory.createNull(),
                result = value.isTheClassOfNull(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfObject()', function () {
        beforeEach(function () {
            createValue('This\\Class\\Path');
        });

        it('should return bool(true) when the subject object\'s class is this class', function () {
            var subjectObjectValue = sinon.createStubInstance(ObjectValue),
                result;
            subjectObjectValue.classIs.withArgs('This\\Class\\Path').returns(true);

            result = value.isTheClassOfObject(subjectObjectValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(true);
        });

        it('should return bool(false) when the subject object\'s class is not this class', function () {
            var subjectObjectValue = sinon.createStubInstance(ObjectValue),
                result;
            subjectObjectValue.classIs.withArgs('This\\Class\\Path').returns(false);

            result = value.isTheClassOfObject(subjectObjectValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfString()', function () {
        beforeEach(function () {
            createValue('a string');
        });

        it('should return bool(false)', function () {
            var classValue = factory.createString('my string'),
                result = value.isTheClassOfString(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('modulo()', function () {
        it('should return the correct remainder of 3 for 23 mod 5', function () {
            var result,
                rightValue = factory.createInteger(5);
            createValue('23');

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(3);
        });

        it('should return the correct remainder of 0 for 10 mod 2', function () {
            var result,
                rightValue = factory.createInteger(2);
            createValue('10');

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });

        it('should return the correct remainder of 4 for 24 mod 5', function () {
            var result,
                rightValue = factory.createInteger(5);
            createValue('24');

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(4);
        });
    });

    describe('multiply()', function () {
        it('should hand off to the right-hand operand to multiply by this string', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            createValue('my string');
            rightOperand.multiplyByString.withArgs(value).returns(result);

            expect(value.multiply(rightOperand)).to.equal(result);
        });
    });

    describe('multiplyByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createArray([]);
            createValue('my string');

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

        describe('when the multiplier is `1`', function () {
            beforeEach(function () {
                createValue('1');
            });

            it('should return int(1)', function () {
                var result = value.multiplyByObject(leftValue);

                expect(result).to.be.an.instanceOf(IntegerValue);
                expect(result.getNative()).to.equal(1);
            });

            it('should not raise any extra notices', function () {
                value.multiplyByObject(leftValue);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('when the multiplier is `1.0`', function () {
            beforeEach(function () {
                createValue('1.0');
            });

            it('should return float(1.0)', function () {
                var result = value.multiplyByObject(leftValue);

                expect(result).to.be.an.instanceOf(FloatValue);
                expect(result.getNative()).to.equal(1.0);
            });

            it('should not raise any extra notices', function () {
                value.multiplyByObject(leftValue);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('when the multiplier is `0`', function () {
            beforeEach(function () {
                createValue('0');
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
    });

    describe('multiplyByString()', function () {
        var leftValue;

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
            createValue('my string');

            expect(function () {
                value.subtractFromNull();
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });
});
