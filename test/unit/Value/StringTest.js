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
    tools = require('../tools'),
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
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync();

describe('String', function () {
    var callStack,
        createKeyValuePair,
        createValue,
        factory,
        futureFactory,
        globalNamespace,
        namespaceScope,
        referenceFactory,
        state,
        value;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState(null, {
            'call_stack': callStack
        });
        factory = state.getValueFactory();
        futureFactory = state.getFutureFactory();
        globalNamespace = sinon.createStubInstance(Namespace);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        namespaceScope.getGlobalNamespace.returns(globalNamespace);
        referenceFactory = state.getReferenceFactory();

        factory.setGlobalNamespace(globalNamespace);

        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            if (level !== PHPError.E_ERROR) {
                return;
            }

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
            value = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                nativeValue,
                globalNamespace
            );
        };
    });

    describe('add()', function () {
        beforeEach(function () {
            createValue('21');
        });

        it('should throw an "Unsupported operand" error for an array addend', function () {
            var addendValue = factory.createArray([]);

            expect(function () {
                value.add(addendValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });

        describe('for a boolean addend', function () {
            it('should return the result of adding true', function () {
                var addendOperand = factory.createBoolean(true), // Will be coerced to int(1)
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(22);
            });

            it('should return the result of adding false', function () {
                var addendOperand = factory.createBoolean(false), // Will be coerced to int(0)
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(21);
            });
        });

        describe('for a float addend', function () {
            it('should return the result of adding', function () {
                var addendOperand = factory.createFloat(2.5),
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(23.5);
            });
        });

        describe('for an integer addend', function () {
            it('should return the result of adding when this string contains an integer', function () {
                var addendOperand = factory.createInteger(2),
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(23);
            });

            it('should return the result of adding when this string contains a float', function () {
                var addendOperand = factory.createInteger(2),
                    resultValue;
                createValue('101.4');

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(103.4);
            });
        });

        it('should add zero for a null addend', function () {
            var addendOperand = factory.createNull(),
                resultValue;

            resultValue = value.add(addendOperand);

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(21);
        });

        describe('for an object addend', function () {
            it('should return the result of adding, with the object coerced to int(1)', function () {
                var addendOperand = sinon.createStubInstance(ObjectValue),
                    resultValue;
                addendOperand.coerceToNumber.returns(factory.createInteger(1));

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(22);
            });

            it('should not raise any extra notices', function () {
                var addendOperand = sinon.createStubInstance(ObjectValue);
                addendOperand.coerceToNumber.returns(factory.createInteger(1));

                value.add(addendOperand);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('for a string addend', function () {
            it('should return the result of adding a float string when this string is an integer', function () {
                var addendOperand = factory.createString('2.5'),
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(23.5);
            });

            it('should return the result of adding a float string when this string is also a float', function () {
                var addendOperand = factory.createString('2.5'),
                    resultValue;
                createValue('1.4');

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(3.9);
            });

            it('should return the result of adding a float with decimal string prefix', function () {
                var addendOperand = factory.createString('3.5.4'),
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(24.5);
            });

            it('should return the result of adding an integer string', function () {
                var addendOperand = factory.createString('7'),
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(28);
            });
        });
    });

    describe('asArrayElement()', function () {
        it('should return the value itself', function () {
            createValue('my string');

            expect(value.asArrayElement()).to.equal(value);
        });
    });

    describe('asEventualNative()', function () {
        it('should return a Future that resolves to the native string', async function () {
            var nativeString;
            createValue('my string');

            nativeString = await value.asEventualNative().toPromise();

            expect(nativeString).to.equal('my string');
        });
    });

    describe('asFuture()', function () {
        it('should return a Present that resolves to this value', function () {
            createValue('my string');

            return expect(value.asFuture().toPromise()).to.eventually.equal(value);
        });
    });

    describe('call()', function () {
        it('should call the function and return its result when string only contains a function name', async function () {
            var argValue = sinon.createStubInstance(Value),
                result,
                resultValue = factory.createString('my result'),
                func = sinon.stub().returns(resultValue);
            globalNamespace.getFunction.withArgs('My\\Space\\my_function').returns(func);
            createValue('My\\Space\\my_function');

            result = await value.call([argValue], namespaceScope).toPromise();

            expect(result).to.equal(resultValue);
            expect(func).to.have.been.calledOnce;
            expect(func).to.have.been.calledOn(null);
            expect(func).to.have.been.calledWith(sinon.match.same(argValue));
        });

        it('should call the static method and return its result when string contains [class]::[method]', async function () {
            var argValue = sinon.createStubInstance(Value),
                classObject = sinon.createStubInstance(Class),
                result,
                resultValue = factory.createString('my result');
            globalNamespace.getClass
                .withArgs('My\\Space\\MyClass')
                .returns(futureFactory.createPresent(classObject));
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

            result = await value.call([argValue], namespaceScope).toPromise();

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
        it('should ask the class to call the method and return its result when non-forwarding', async function () {
            var argValue = sinon.createStubInstance(Value),
                classObject = sinon.createStubInstance(Class),
                methodNameValue = factory.createString('myMethod'),
                result,
                resultValue = factory.createString('my result');
            classObject.callMethod.returns(resultValue);
            globalNamespace.getClass.withArgs('\\My\\Space\\MyClass')
                .returns(futureFactory.createPresent(classObject));
            createValue('\\My\\Space\\MyClass');

            result = await value.callStaticMethod(methodNameValue, [argValue], false).toPromise();

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

        it('should ask the class to call the method and return its result when forwarding', async function () {
            var argValue = sinon.createStubInstance(Value),
                classObject = sinon.createStubInstance(Class),
                methodNameValue = factory.createString('myMethod'),
                result,
                resultValue = factory.createString('my result');
            classObject.callMethod.returns(resultValue);
            globalNamespace.getClass.withArgs('\\My\\Space\\MyClass')
                .returns(futureFactory.createPresent(classObject));
            createValue('\\My\\Space\\MyClass');

            result = await value.callStaticMethod(methodNameValue, [argValue], true).toPromise();

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
            },
            'coercing a float with leading whitespace': {
                string: '   123.456',
                expectedResult: 123.456
            },
            'coercing an integer with trailing whitespace': {
                string: '456.789  ',
                expectedResult: 456.789
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
            },
            'coercing an integer with leading whitespace': {
                string: '   123',
                expectedResult: 123
            },
            'coercing an integer with trailing whitespace': {
                string: '456  ',
                expectedResult: 456
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

    describe('compareWithString()', function () {
        it('should return 0 when two numeric strings are equal', function () {
            var leftValue = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                '21',
                globalNamespace
            );
            createValue('21');

            expect(value.compareWithString(leftValue)).to.equal(0);
        });

        it('should return -1 when left of two numeric strings is less', function () {
            var leftValue = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                '4',
                globalNamespace
            );
            createValue('6');

            expect(value.compareWithString(leftValue)).to.equal(-1);
        });

        it('should return 1 when left of two numeric strings is greater', function () {
            var leftValue = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                '14',
                globalNamespace
            );
            createValue('12');

            expect(value.compareWithString(leftValue)).to.equal(1);
        });

        it('should return 0 when two non-numeric strings are lexically equal', function () {
            var leftValue = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                'my string',
                globalNamespace
            );
            createValue('my string');

            expect(value.compareWithString(leftValue)).to.equal(0);
        });

        it('should return -1 when left of two non-numeric strings is lexically less', function () {
            var leftValue = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                'X my string',
                globalNamespace
            );
            createValue('Y my string');

            expect(value.compareWithString(leftValue)).to.equal(-1);
        });

        it('should return 1 when left of two non-numeric strings is lexically greater', function () {
            var leftValue = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                'F my string',
                globalNamespace
            );
            createValue('E my string');

            expect(value.compareWithString(leftValue)).to.equal(1);
        });
    });

    describe('concat()', function () {
        it('should be able to concatenate another string', function () {
            var resultValue;
            createValue('hello');

            resultValue = value.concat(factory.createString(' world'));

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('hello world');
        });
    });

    describe('convertForBooleanType()', function () {
        it('should return bool(true) when not "0" or the empty string', function () {
            var resultValue;
            createValue('my string');

            resultValue = value.convertForBooleanType();

            expect(resultValue.getType()).to.equal('boolean');
            expect(resultValue.getNative()).to.be.true;
        });

        it('should return bool(false) when "0"', function () {
            var resultValue;
            createValue('0');

            resultValue = value.convertForBooleanType();

            expect(resultValue.getType()).to.equal('boolean');
            expect(resultValue.getNative()).to.be.false;
        });

        it('should return bool(false) when ""', function () {
            var resultValue;
            createValue('');

            resultValue = value.convertForBooleanType();

            expect(resultValue.getType()).to.equal('boolean');
            expect(resultValue.getNative()).to.be.false;
        });
    });

    describe('convertForFloatType()', function () {
        describe('when valid with no whitespace', function () {
            it('should return a float containing the parsed number', function () {
                var resultValue;
                createValue('456.789');

                resultValue = value.convertForFloatType();

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(456.789);
            });

            it('should not raise a notice', function () {
                createValue('456.789');

                value.convertForFloatType();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });

        describe('when valid with leading and trailing whitespace', function () {
            it('should return a float containing the parsed number', function () {
                var resultValue;
                createValue('   456.789  ');

                resultValue = value.convertForFloatType();

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(456.789);
            });

            it('should not raise a notice', function () {
                createValue('   456.789  ');

                value.convertForFloatType();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });

        describe('when semi-invalid with trailing non-numeric characters', function () {
            it('should return a float containing the parsed number', function () {
                var resultValue;
                createValue('   456.789abc');

                resultValue = value.convertForFloatType();

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(456.789);
            });

            it('should raise a notice', function () {
                createValue('   456.789abc');

                value.convertForFloatType();

                expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(callStack.raiseTranslatedError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'core.non_well_formed_numeric_value'
                );
            });
        });

        describe('when fully invalid with leading non-numeric characters', function () {
            it('should just return this value as no conversion is possible', function () {
                createValue('I am not numeric');

                expect(value.convertForFloatType()).to.equal(value);
            });

            it('should not raise a notice', function () {
                createValue('I am not numeric');

                value.convertForFloatType();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });
    });

    describe('convertForIntegerType()', function () {
        describe('when valid with no whitespace', function () {
            it('should return an integer containing the parsed number', function () {
                var resultValue;
                createValue('456.789'); // Decimal places ignored.

                resultValue = value.convertForIntegerType();

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(456);
            });

            it('should not raise a notice', function () {
                createValue('456');

                value.convertForIntegerType();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });

        describe('when valid with leading and trailing whitespace', function () {
            it('should return an integer containing the parsed number', function () {
                var resultValue;
                createValue('   456  ');

                resultValue = value.convertForIntegerType();

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(456);
            });

            it('should not raise a notice', function () {
                createValue('   456  ');

                value.convertForIntegerType();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });

        describe('when semi-invalid with trailing non-numeric characters', function () {
            it('should return an integer containing the parsed number', function () {
                var resultValue;
                createValue('   456abc');

                resultValue = value.convertForIntegerType();

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(456);
            });

            it('should raise a notice', function () {
                createValue('   456abc');

                value.convertForIntegerType();

                expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(callStack.raiseTranslatedError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'core.non_well_formed_numeric_value'
                );
            });
        });

        describe('when fully invalid with leading non-numeric characters', function () {
            it('should just return this value as no conversion is possible', function () {
                createValue('I am not numeric');

                expect(value.convertForIntegerType()).to.equal(value);
            });

            it('should not raise a notice', function () {
                createValue('I am not numeric');

                value.convertForIntegerType();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });
    });

    describe('convertForStringType()', function () {
        it('should just return this value as it is already the correct type', function () {
            expect(value.convertForStringType()).to.equal(value);
        });
    });

    describe('decrement()', function () {
        it('should return one less when the string contains a positive float', function () {
            var resultValue;
            createValue('21.52');

            resultValue = value.decrement();

            expect(resultValue.getType()).to.equal('float');
            expect(resultValue.getNative()).to.equal(20.52);
        });

        it('should return -1 when the string contains float zero', function () {
            var resultValue;
            createValue('0.0');

            resultValue = value.decrement();

            expect(resultValue.getType()).to.equal('float');
            expect(resultValue.getNative()).to.equal(-1);
        });

        it('should return -1 when the string contains integer zero', function () {
            var resultValue;
            createValue('0');

            resultValue = value.decrement();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(-1);
        });

        it('should return one less when the string contains a negative float', function () {
            var resultValue;
            createValue('-41.7');

            resultValue = value.decrement();

            expect(resultValue.getType()).to.equal('float');
            expect(resultValue.getNative()).to.equal(-42.7);
        });
    });

    describe('divideBy()', function () {
        beforeEach(function () {
            createValue('21');
        });

        it('should throw an "Unsupported operand" error for an array divisor', function () {
            var divisorValue = factory.createArray([]);

            expect(function () {
                value.divideBy(divisorValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });

        describe('for a boolean divisor', function () {
            it('should return the result of dividing by true', function () {
                var divisorOperand = factory.createBoolean(true), // Will be coerced to int(1)
                    resultValue;

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(21);
            });

            it('should raise a warning and return false when dividing by false', function () {
                var divisorOperand = factory.createBoolean(false), // Will be coerced to int(0)
                    resultValue;

                resultValue = value.divideBy(divisorOperand);

                expect(callStack.raiseError).to.have.been.calledOnce;
                expect(callStack.raiseError)
                    .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                expect(resultValue.getType()).to.equal('boolean');
                expect(resultValue.getNative()).to.equal(false);
            });
        });

        describe('for a float divisor', function () {
            it('should return the result of dividing', function () {
                var divisorOperand = factory.createFloat(2.5),
                    resultValue;
                createValue('10.5');

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(4.2);
            });

            it('should raise a warning and return false when dividing by zero', function () {
                var divisorOperand = factory.createFloat(0),
                    resultValue;

                resultValue = value.divideBy(divisorOperand);

                expect(callStack.raiseError).to.have.been.calledOnce;
                expect(callStack.raiseError)
                    .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                expect(resultValue.getType()).to.equal('boolean');
                expect(resultValue.getNative()).to.equal(false);
            });
        });

        describe('for an integer divisor', function () {
            it('should return the result of dividing', function () {
                var divisorOperand = factory.createInteger(2),
                    resultValue;

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(10.5);
            });

            it('should raise a warning and return false when dividing by zero', function () {
                var divisorOperand = factory.createInteger(0),
                    resultValue;

                resultValue = value.divideBy(divisorOperand);

                expect(callStack.raiseError).to.have.been.calledOnce;
                expect(callStack.raiseError)
                    .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                expect(resultValue.getType()).to.equal('boolean');
                expect(resultValue.getNative()).to.equal(false);
            });
        });

        it('should raise a warning and return false for a null divisor', function () {
            var divisorOperand = factory.createNull(),
                resultValue;

            resultValue = value.divideBy(divisorOperand);

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError)
                .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
            expect(resultValue.getType()).to.equal('boolean');
            expect(resultValue.getNative()).to.equal(false);
        });

        describe('for an object divisor', function () {
            it('should return the result of dividing', function () {
                var divisorOperand = sinon.createStubInstance(ObjectValue),
                    resultValue;
                divisorOperand.coerceToNumber.returns(factory.createInteger(1));

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(21);
            });

            it('should not raise any extra notices', function () {
                var divisorOperand = sinon.createStubInstance(ObjectValue);
                divisorOperand.coerceToNumber.returns(factory.createInteger(1));

                value.divideBy(divisorOperand);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('for a string divisor', function () {
            it('should return the result of dividing by a float string', function () {
                var divisorOperand = factory.createString('2.5'),
                    resultValue;
                createValue('10.5');

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(4.2);
            });

            it('should return the result of dividing by a float with decimal string prefix', function () {
                var divisorOperand = factory.createString('2.5.4'),
                    resultValue;
                createValue('10.5');

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(4.2);
            });

            it('should return the result of dividing by an integer string', function () {
                var divisorOperand = factory.createString('2'),
                    resultValue;

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(10.5);
            });

            it('should raise a warning and return false when dividing by zero', function () {
                var divisorOperand = factory.createString('0'),
                    resultValue;

                resultValue = value.divideBy(divisorOperand);

                expect(callStack.raiseError).to.have.been.calledOnce;
                expect(callStack.raiseError)
                    .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                expect(resultValue.getType()).to.equal('boolean');
                expect(resultValue.getNative()).to.equal(false);
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
        it('should fetch the constant from the class', async function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue = factory.createString('my result');
            globalNamespace.getClass.withArgs('My\\Space\\MyClass')
                .returns(futureFactory.createPresent(classObject));
            classObject.getConstantByName.withArgs('MY_CONST').returns(resultValue);
            createValue('My\\Space\\MyClass');

            expect(await value.getConstantByName('MY_CONST', namespaceScope).toPromise()).to.equal(resultValue);
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
        it('should fetch the property\'s value from the class', async function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue = sinon.createStubInstance(Value);
            globalNamespace.getClass.withArgs('My\\Space\\MyClass')
                .returns(futureFactory.createPresent(classObject));
            classObject.getStaticPropertyByName.withArgs('myProp')
                .returns(futureFactory.createPresent(resultValue));
            createValue('My\\Space\\MyClass');

            expect(
                await value.getStaticPropertyByName(
                    factory.createString('myProp'),
                    namespaceScope
                ).toPromise()
            ).to.equal(resultValue);
        });
    });

    describe('getValueOrNull()', function () {
        it('should just return this value, as values are always classed as "defined"', function () {
            createValue('my string');

            expect(value.getValueOrNull()).to.equal(value);
        });
    });

    describe('increment()', function () {
        it('should return one more when the string contains a positive float', function () {
            var resultValue;
            createValue('21.52');

            resultValue = value.increment();

            expect(resultValue.getType()).to.equal('float');
            expect(resultValue.getNative()).to.equal(22.52);
        });

        it('should return 1 when the string contains float zero', function () {
            var resultValue;
            createValue('0.0');

            resultValue = value.increment();

            expect(resultValue.getType()).to.equal('float');
            expect(resultValue.getNative()).to.equal(1);
        });

        it('should return 1 when the string contains integer zero', function () {
            var resultValue;
            createValue('0');

            resultValue = value.increment();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1);
        });

        it('should return one more when the string contains a negative float', function () {
            var resultValue;
            createValue('-41.7');

            resultValue = value.increment();

            expect(resultValue.getType()).to.equal('float');
            expect(resultValue.getNative()).to.equal(-40.7);
        });
    });

    describe('instantiate()', function () {
        var classObject,
            newObjectValue;

        beforeEach(function () {
            classObject = sinon.createStubInstance(Class);
            globalNamespace.getClass.withArgs('My\\Space\\MyClass')
                .returns(futureFactory.createPresent(classObject));
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

        it('should return the new instance created by the class', async function () {
            createValue('My\\Space\\MyClass');

            expect(await value.instantiate([], namespaceScope).toPromise()).to.equal(newObjectValue);
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
        it('should return true for a function name that exists', async function () {
            globalNamespace.hasFunction
                .withArgs('myFunction')
                .returns(true);
            createValue('myFunction');

            expect(await value.isCallable(globalNamespace).toPromise()).to.be.true;
        });

        it('should return true for a static method name that exists', async function () {
            var classObject = sinon.createStubInstance(Class),
                methodSpec = sinon.createStubInstance(MethodSpec);
            globalNamespace.getClass
                .withArgs('My\\Fqcn')
                .returns(futureFactory.createPresent(classObject));
            globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(true);
            classObject.getMethodSpec
                .withArgs('myMethod')
                .returns(methodSpec);
            createValue('My\\Fqcn::myMethod');

            expect(await value.isCallable(globalNamespace).toPromise()).to.be.true;
        });

        it('should return false for a function name that doesn\'t exist', async function () {
            globalNamespace.hasFunction
                .withArgs('myNonExistentFunction')
                .returns(false);
            createValue('myNonExistentFunction');

            expect(await value.isCallable(globalNamespace).toPromise()).to.be.false;
        });

        it('should return false for a static method that doesn\'t exist for a defined class', async function () {
            var classObject = sinon.createStubInstance(Class);
            globalNamespace.getClass
                .withArgs('My\\Fqcn')
                .returns(futureFactory.createPresent(classObject));
            globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(true);
            classObject.getMethodSpec
                .withArgs('myMethod')
                .returns(null);
            createValue('My\\Fqcn::myMethod');

            expect(await value.isCallable(globalNamespace).toPromise()).to.be.false;
        });

        it('should return false for a static method of a non-existent class', async function () {
            globalNamespace.getClass
                .withArgs('My\\NonExistentFqcn')
                .returns(futureFactory.createRejection(new PHPError(PHPError.E_ERROR, 'Class not found')));
            globalNamespace.hasClass
                .withArgs('My\\NonExistentFqcn')
                .returns(false);
            createValue('My\\NonExistentFqcn::myMethod');

            expect(await value.isCallable(globalNamespace).toPromise()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true for the empty string', async function () {
            createValue('');

            expect(await value.isEmpty().toPromise()).to.be.true;
        });

        it('should return true for the string "0"', async function () {
            createValue('0');

            expect(await value.isEmpty().toPromise()).to.be.true;
        });

        it('should return false for a string of text', async function () {
            createValue('my text');

            expect(await value.isEmpty().toPromise()).to.be.false;
        });

        it('should return false for the string "0.0", in contrast to the integer version', async function () {
            createValue('0.0');

            expect(await value.isEmpty().toPromise()).to.be.false;
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

    describe('isReferenceable()', function () {
        it('should return false', function () {
            createValue('my string');

            expect(value.isReferenceable()).to.be.false;
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

    describe('multiplyBy()', function () {
        beforeEach(function () {
            createValue('21');
        });

        it('should throw an "Unsupported operand" error for an array multiplier', function () {
            var multiplierValue = factory.createArray([]);

            expect(function () {
                value.multiplyBy(multiplierValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });

        describe('for a boolean multiplier', function () {
            it('should return the result of multiplying by true', function () {
                var multiplierOperand = factory.createBoolean(true), // Will be coerced to int(1)
                    resultValue;

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(21);
            });

            it('should return the result of multiplying by false', function () {
                var multiplierOperand = factory.createBoolean(false), // Will be coerced to int(0)
                    resultValue;

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });
        });

        describe('for a float multiplier', function () {
            it('should return the result of multiplying', function () {
                var multiplierOperand = factory.createFloat(2.5),
                    resultValue;

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(52.5);
            });
        });

        describe('for an integer multiplier', function () {
            it('should return the result of multiplying when this string is an integer', function () {
                var multiplierOperand = factory.createInteger(2),
                    resultValue;

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(42);
            });

            it('should return the result of multiplying when this string is a float', function () {
                var multiplierOperand = factory.createInteger(2),
                    resultValue;
                createValue('1.4');

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(2.8);
            });
        });

        it('should return zero for a null multiplier', function () {
            var multiplierOperand = factory.createNull(),
                resultValue;

            resultValue = value.multiplyBy(multiplierOperand);

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(0);
        });

        describe('for an object multiplier', function () {
            it('should return the result of multiplying', function () {
                var multiplierOperand = sinon.createStubInstance(ObjectValue),
                    resultValue;
                multiplierOperand.coerceToNumber.returns(factory.createInteger(1));

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(21);
            });

            it('should not raise any extra notices', function () {
                var multiplierOperand = sinon.createStubInstance(ObjectValue);
                multiplierOperand.coerceToNumber.returns(factory.createInteger(1));

                value.multiplyBy(multiplierOperand);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('for a string multiplier', function () {
            it('should return the result of multiplying by a float string when this string is an integer', function () {
                var multiplierOperand = factory.createString('2.5'),
                    resultValue;

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(52.5);
            });

            it('should return the result of multiplying by a float string when this string is a float', function () {
                var multiplierOperand = factory.createString('2.5'),
                    resultValue;
                createValue('1.4');

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(3.5);
            });

            it('should return the result of multiplying by a float with decimal string prefix', function () {
                var multiplierOperand = factory.createString('2.5.4'),
                    resultValue;

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(52.5);
            });

            it('should return the result of multiplying by an integer string', function () {
                var multiplierOperand = factory.createString('2'),
                    resultValue;

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(42);
            });

            it('should return zero when multiplying by zero', function () {
                var multiplierOperand = factory.createString('0'),
                    resultValue;

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });
        });
    });

    describe('next()', function () {
        beforeEach(function () {
            createValue('my string');
        });

        it('should just return the value when no callback given', function () {
            expect(value.next()).to.equal(value);
        });

        it('should invoke the callback with the value and return the coerced result', function () {
            var callback = sinon.stub(),
                resultValue;
            callback.withArgs(sinon.match.same(value)).returns('my result');

            resultValue = value.next(callback);

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('my result');
        });

        it('should return a rejected FutureValue when the callback raises an error', async function () {
            var callback = sinon.stub(),
                resultValue;
            callback.withArgs(sinon.match.same(value)).throws(new Error('Bang!'));

            resultValue = value.next(callback);

            expect(resultValue.getType()).to.equal('future');
            await expect(resultValue.toPromise()).to.eventually.be.rejectedWith('Bang!');
        });
    });

    describe('nextIsolated()', function () {
        beforeEach(function () {
            createValue('my string');
        });

        it('should invoke the given callback with the value', function () {
            var callback = sinon.stub();

            value.nextIsolated(callback);

            expect(callback).to.have.been.calledOnce;
            expect(callback).to.have.been.calledWith(sinon.match.same(value));
        });

        it('should do nothing when no callback is given', function () {
            expect(function () {
                value.nextIsolated();
            }).not.to.throw();
        });
    });

    describe('subtract()', function () {
        beforeEach(function () {
            createValue('21');
        });

        it('should throw an "Unsupported operand" error for an array subtrahend', function () {
            var subtrahendValue = factory.createArray([]);

            expect(function () {
                value.subtract(subtrahendValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });

        describe('for a boolean subtrahend', function () {
            it('should return the result of subtracting true', function () {
                var subtrahendOperand = factory.createBoolean(true), // Will be coerced to int(1)
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(20);
            });

            it('should return the result of subtracting false', function () {
                var subtrahendOperand = factory.createBoolean(false), // Will be coerced to int(0)
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(21);
            });
        });

        describe('for a float subtrahend', function () {
            it('should return the result of subtracting', function () {
                var subtrahendOperand = factory.createFloat(2.5),
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(18.5);
            });
        });

        describe('for an integer subtrahend', function () {
            it('should return the result of subtracting when this string is an integer', function () {
                var subtrahendOperand = factory.createInteger(2),
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(19);
            });

            it('should return the result of subtracting when this string is a float', function () {
                var subtrahendOperand = factory.createInteger(2),
                    resultValue;
                createValue('3.5');

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(1.5);
            });
        });

        it('should subtract zero for a null subtrahend', function () {
            var subtrahendOperand = factory.createNull(),
                resultValue;

            resultValue = value.subtract(subtrahendOperand);

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(21);
        });

        describe('for an object subtrahend', function () {
            it('should return the result of subtracting, with the object coerced to int(1)', function () {
                var subtrahendOperand = sinon.createStubInstance(ObjectValue),
                    resultValue;
                subtrahendOperand.coerceToNumber.returns(factory.createInteger(1));

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(20);
            });

            it('should not raise any extra notices', function () {
                var subtrahendOperand = sinon.createStubInstance(ObjectValue);
                subtrahendOperand.coerceToNumber.returns(factory.createInteger(1));

                value.subtract(subtrahendOperand);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('for a string subtrahend', function () {
            it('should return the result of subtracting a float string when this string is an integer', function () {
                var subtrahendOperand = factory.createString('2.5'),
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(18.5);
            });

            it('should return the result of subtracting a float string when this string is a float', function () {
                var subtrahendOperand = factory.createString('2.5'),
                    resultValue;
                createValue(5.7);

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(3.2);
            });

            it('should return the result of subtracting a float with decimal string prefix', function () {
                var subtrahendOperand = factory.createString('3.5.4'),
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(17.5);
            });

            it('should return the result of subtracting an integer string', function () {
                var subtrahendOperand = factory.createString('7'),
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(14);
            });
        });
    });
});
