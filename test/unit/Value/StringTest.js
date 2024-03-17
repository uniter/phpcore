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
    ArrayValue = require('../../../src/Value/Array').sync(),
    BooleanValue = require('../../../src/Value/Boolean').sync(),
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    Exception = phpCommon.Exception,
    IntegerValue = require('../../../src/Value/Integer').sync(),
    KeyValuePair = require('../../../src/KeyValuePair'),
    MethodSpec = require('../../../src/MethodSpec'),
    Namespace = require('../../../src/Namespace').sync(),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    NumericParse = require('../../../src/Semantics/NumericParse'),
    NumericStringParser = require('../../../src/Semantics/NumericStringParser'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync();

describe('StringValue', function () {
    var callStack,
        createKeyValuePair,
        createValue,
        factory,
        flow,
        futureFactory,
        globalNamespace,
        namespaceScope,
        numericStringParser,
        realNumericStringParser,
        referenceFactory,
        state,
        value;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        factory = state.getValueFactory();
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        globalNamespace = sinon.createStubInstance(Namespace);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        namespaceScope.getGlobalNamespace.returns(globalNamespace);
        numericStringParser = sinon.createStubInstance(NumericStringParser);
        realNumericStringParser = state.getService('numeric_string_parser');
        referenceFactory = state.getReferenceFactory();

        factory.setGlobalNamespace(globalNamespace);

        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables, errorClass) {
            if (level !== PHPError.E_ERROR) {
                return;
            }

            throw new Error(
                'Fake PHP ' + level +
                (errorClass ? ' (' + errorClass + ')' : '') +
                ' for #' + translationKey +
                ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        createKeyValuePair = function (key, value) {
            var keyValuePair = sinon.createStubInstance(KeyValuePair);
            keyValuePair.getKey.returns(key);
            keyValuePair.getValue.returns(value);
            return keyValuePair;
        };

        numericStringParser.parseNumericString.callsFake(function (string) {
            return realNumericStringParser.parseNumericString(string);
        });

        createValue = function (nativeValue) {
            value = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                flow,
                nativeValue,
                globalNamespace,
                numericStringParser
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
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"string","operator":"+","right":"array"}'
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

    describe('bitwiseAnd()', function () {
        beforeEach(function () {
            createValue(String(parseInt('10101101', 2)));
        });

        it('should throw an "Unsupported operand" error for an array addend', function () {
            var rightValue = factory.createArray([]);

            expect(function () {
                value.bitwiseAnd(rightValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"string","operator":"&","right":"array"}'
            );
        });

        it('should return the correct result for 0b10101101 & 0b00001111', function () {
            var expectedResult = parseInt('00001001', 2),
                result,
                rightValue = factory.createString(String(parseInt('00001011', 2)));

            result = value.bitwiseAnd(rightValue);

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(expectedResult);
        });
    });

    describe('bitwiseOr()', function () {
        beforeEach(function () {
            createValue(String(parseInt('10101001', 2)));
        });

        it('should throw an "Unsupported operand" error for an array addend', function () {
            var rightValue = factory.createArray([]);

            expect(function () {
                value.bitwiseOr(rightValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"string","operator":"|","right":"array"}'
            );
        });

        it('should return the correct result for 0b10101101 | 0b00001111', function () {
            var expectedResult = parseInt('11111001', 2),
                result,
                rightValue = factory.createString(String(parseInt('11110000', 2)));

            result = value.bitwiseOr(rightValue);

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(expectedResult);
        });
    });

    describe('bitwiseXor()', function () {
        beforeEach(function () {
            createValue(String(parseInt('10101001', 2)));
        });

        it('should throw an "Unsupported operand" error for an array operand', function () {
            var rightValue = factory.createArray([]);

            expect(function () {
                value.bitwiseXor(rightValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"string","operator":"^","right":"array"}'
            );
        });

        it('should return the correct result for an integer operand', function () {
            var expectedResult = parseInt('01011001', 2),
                result,
                rightValue = factory.createInteger(parseInt('11110000', 2));

            result = value.bitwiseXor(rightValue);

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(expectedResult);
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
        var parse;

        beforeEach(function () {
            parse = sinon.createStubInstance(NumericParse);
        });

        it('should return a float when the parser detects a numeric string', function () {
            var result;
            parse.toFloatValue.returns(factory.createFloat(123.456));
            numericStringParser.parseNumericString
                .withArgs('123.456')
                .returns(parse);
            createValue('123.456');

            result = value.coerceToFloat();

            expect(result.getType()).to.equal('float');
            expect(result.getNative()).to.equal(123.456);
        });

        it('should return float(0) when the parser detects no numeric string', function () {
            var result;
            numericStringParser.parseNumericString
                .withArgs('not numeric')
                .returns(null);
            createValue('not numeric');

            result = value.coerceToFloat();

            expect(result.getType()).to.equal('float');
            expect(result.getNative()).to.equal(0);
        });
    });

    describe('coerceToInteger()', function () {
        var parse;

        beforeEach(function () {
            parse = sinon.createStubInstance(NumericParse);
        });

        it('should return an integer when the parser detects a numeric string', function () {
            var result;
            parse.toIntegerValue.returns(factory.createInteger(123));
            numericStringParser.parseNumericString
                .withArgs('123')
                .returns(parse);
            createValue('123');

            result = value.coerceToInteger();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(123);
        });

        it('should return int(0) when the parser detects no numeric string', function () {
            var result;
            numericStringParser.parseNumericString
                .withArgs('not numeric')
                .returns(null);
            createValue('not numeric');

            result = value.coerceToInteger();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(0);
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
        var parse;

        beforeEach(function () {
            parse = sinon.createStubInstance(NumericParse);
        });

        describe('when the parser detects a fully numeric string', function () {
            beforeEach(function () {
                numericStringParser.parseNumericString
                    .withArgs('1234')
                    .returns(parse);
                parse.isFullyNumeric.returns(true);
                parse.toValue.returns(factory.createInteger(1234));
                createValue('1234');
            });

            it('should return a value', function () {
                var result = value.coerceToNumber();

                expect(result.getType()).to.equal('int');
                expect(result.getNative()).to.equal(1234);
            });

            it('should not raise a warning', function () {
                value.coerceToNumber();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });

        describe('when the parser detects a leading-numeric string', function () {
            beforeEach(function () {
                numericStringParser.parseNumericString
                    .withArgs('1234abc')
                    .returns(parse);
                parse.isFullyNumeric.returns(false); // False because the string is only leading-numeric.
                parse.toValue.returns(factory.createInteger(1234));
                createValue('1234abc');
            });

            it('should return a value', function () {
                var result = value.coerceToNumber();

                expect(result.getType()).to.equal('int');
                expect(result.getNative()).to.equal(1234);
            });

            it('should raise a warning', function () {
                value.coerceToNumber();

                expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(callStack.raiseTranslatedError).to.have.been.calledWith(
                    PHPError.E_WARNING,
                    'core.non_numeric_value'
                );
            });
        });

        describe('when the parser detects a non-numeric string', function () {
            beforeEach(function () {
                numericStringParser.parseNumericString
                    .withArgs('not numeric')
                    .returns(null);
                createValue('not numeric');
            });

            it('should return null', function () {
                expect(value.coerceToNumber()).to.be.null;
            });

            it('should not raise a warning', function () {
                value.coerceToNumber();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });
    });

    describe('compareWithString()', function () {
        it('should return 0 when two numeric strings are equal', async function () {
            var leftValue = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                flow,
                '21',
                globalNamespace,
                numericStringParser
            );
            createValue('21');

            expect(await value.compareWithString(leftValue).toPromise()).to.equal(0);
        });

        it('should return -1 when left of two numeric strings is less', async function () {
            var leftValue = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                flow,
                '4',
                globalNamespace,
                numericStringParser
            );
            createValue('6');

            expect(await value.compareWithString(leftValue).toPromise()).to.equal(-1);
        });

        it('should return 1 when left of two numeric strings is greater', async function () {
            var leftValue = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                flow,
                '14',
                globalNamespace,
                numericStringParser
            );
            createValue('12');

            expect(await value.compareWithString(leftValue).toPromise()).to.equal(1);
        });

        it('should return 0 when two non-numeric strings are lexically equal', async function () {
            var leftValue = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                flow,
                'my string',
                globalNamespace,
                numericStringParser
            );
            createValue('my string');

            expect(await value.compareWithString(leftValue).toPromise()).to.equal(0);
        });

        it('should return -1 when left of two non-numeric strings is lexically less', async function () {
            var leftValue = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                flow,
                'X my string',
                globalNamespace,
                numericStringParser
            );
            createValue('Y my string');

            expect(await value.compareWithString(leftValue).toPromise()).to.equal(-1);
        });

        it('should return 1 when left of two non-numeric strings is lexically greater', async function () {
            var leftValue = new StringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                flow,
                'F my string',
                globalNamespace,
                numericStringParser
            );
            createValue('E my string');

            expect(await value.compareWithString(leftValue).toPromise()).to.equal(1);
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
        var parse;

        beforeEach(function () {
            parse = sinon.createStubInstance(NumericParse);
            parse.isFullyNumeric.returns(true);
            parse.toFloatValue.returns(factory.createFloat(123.456));
        });

        it('should return a float when the parser detects a fully numeric string', function () {
            var result;
            numericStringParser.parseNumericString
                .withArgs('123.456')
                .returns(parse);
            createValue('123.456');

            result = value.convertForFloatType();

            expect(result.getType()).to.equal('float');
            expect(result.getNative()).to.equal(123.456);
        });

        it('should return the original value when the parser detects a leading-numeric string', function () {
            numericStringParser.parseNumericString
                .withArgs('1234abc')
                .returns(parse);
            parse.isFullyNumeric.returns(false);
            createValue('1234abc');

            expect(value.convertForFloatType()).to.equal(value);
        });

        it('should return false when the parser detects a fully non-numeric string', function () {
            numericStringParser.parseNumericString
                .withArgs('not numeric')
                .returns(null);
            createValue('not numeric');

            expect(value.convertForFloatType()).to.equal(value);
        });
    });

    describe('convertForIntegerType()', function () {
        var parse;

        beforeEach(function () {
            parse = sinon.createStubInstance(NumericParse);
            parse.isFullyNumeric.returns(true);
            parse.toIntegerValue.returns(factory.createInteger(123));
        });

        it('should return an integer when the parser detects a fully numeric string', function () {
            var result;
            numericStringParser.parseNumericString
                .withArgs('123')
                .returns(parse);
            createValue('123');

            result = value.convertForIntegerType();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(123);
        });

        it('should return the original value when the parser detects a leading-numeric string', function () {
            numericStringParser.parseNumericString
                .withArgs('1234abc')
                .returns(parse);
            parse.isFullyNumeric.returns(false);
            createValue('1234abc');

            expect(value.convertForIntegerType()).to.equal(value);
        });

        it('should return false when the parser detects a fully non-numeric string', function () {
            numericStringParser.parseNumericString
                .withArgs('not numeric')
                .returns(null);
            createValue('not numeric');

            expect(value.convertForIntegerType()).to.equal(value);
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

        it('should return non-numeric strings unchanged', function () {
            var resultValue;
            createValue('not numeric');

            resultValue = value.decrement();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('not numeric');
        });

        it('should return leading-numeric strings unchanged', function () {
            var resultValue;
            createValue('12abc');

            resultValue = value.decrement();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('12abc');
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
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"string","operator":"/","right":"array"}'
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

        it('should not autoload when the special ::class constant for an undefined class', async function () {
            var resultValue;
            createValue('Some\\SubSpace\\SomeUndefinedClass');

            resultValue = await value.getConstantByName('class', namespaceScope).toPromise();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('Some\\SubSpace\\SomeUndefinedClass');
            expect(namespaceScope.getClass).not.to.have.been.called;
        });
    });

    describe('getDisplayType()', function () {
        it('should return the value type', function () {
            createValue('my string');

            expect(value.getDisplayType()).to.equal('string');
        });
    });

    describe('getElementByKey()', function () {
        it('should allow reading a single character of the string', function () {
            createValue('my string');

            expect(value.getElementByKey(factory.createInteger(4)).getValue().getNative())
                .to.equal('t');
        });

        it('should throw when attempting to set a single character of the string', async function () {
            var element;
            createValue('my string');

            element = value.getElementByKey(factory.createInteger(4));

            await expect(element.setValue(factory.createString('x')).toPromise())
                .to.eventually.be.rejectedWith(
                    Exception,
                    'Assigning to a string offset is not yet supported'
                );
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

    describe('getNumericType()', function () {
        var parse;

        beforeEach(function () {
            parse = sinon.createStubInstance(NumericParse);
        });

        it('should return "int" when the parser detects an integer', function () {
            parse.getType.returns('int');
            numericStringParser.parseNumericString
                .withArgs('1234')
                .returns(parse);
            createValue('1234');

            expect(value.getNumericType()).to.equal('int');
        });

        it('should return "float" when the parser detects a float', function () {
            parse.getType.returns('float');
            numericStringParser.parseNumericString
                .withArgs('123.456')
                .returns(parse);
            createValue('123.456');

            expect(value.getNumericType()).to.equal('float');
        });
    });

    describe('getOutgoingValues()', function () {
        it('should return an empty array as scalars cannot refer to anything', function () {
            createValue('my string');

            expect(value.getOutgoingValues()).to.deep.equal([]);
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

    describe('getType()', function () {
        it('should return "string"', function () {
            createValue('my string');

            expect(value.getType()).to.equal('string');
        });
    });

    describe('getUnderlyingType()', function () {
        it('should return "string"', function () {
            createValue('my string');

            expect(value.getUnderlyingType()).to.equal('string');
        });
    });

    describe('getValueOrNull()', function () {
        it('should just return this value, as values are always classed as "defined"', function () {
            createValue('my string');

            expect(value.getValueOrNull()).to.equal(value);
        });
    });

    describe('identity()', function () {
        var parse;

        beforeEach(function () {
            parse = sinon.createStubInstance(NumericParse);
        });

        describe('when the parser detects a fully numeric string', function () {
            beforeEach(function () {
                numericStringParser.parseNumericString
                    .withArgs('1234')
                    .returns(parse);
                parse.isFullyNumeric.returns(true);
                parse.toValue.returns(factory.createInteger(1234));
                createValue('1234');
            });

            it('should return a value', function () {
                var result = value.identity();

                expect(result.getType()).to.equal('int');
                expect(result.getNative()).to.equal(1234);
            });

            it('should not raise a warning', function () {
                value.identity();

                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });

        describe('when the parser detects a leading-numeric string', function () {
            beforeEach(function () {
                numericStringParser.parseNumericString
                    .withArgs('1234abc')
                    .returns(parse);
                parse.isFullyNumeric.returns(false); // False because the string is only leading-numeric.
                parse.toValue.returns(factory.createInteger(1234));
                createValue('1234abc');
            });

            it('should return a value', function () {
                var result = value.identity();

                expect(result.getType()).to.equal('int');
                expect(result.getNative()).to.equal(1234);
            });

            it('should raise a warning', function () {
                value.identity();

                expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(callStack.raiseTranslatedError).to.have.been.calledWith(
                    PHPError.E_WARNING,
                    'core.non_numeric_value'
                );
            });
        });

        describe('when the parser detects a non-numeric string', function () {
            beforeEach(function () {
                numericStringParser.parseNumericString
                    .withArgs('not numeric')
                    .returns(null);
                createValue('not numeric');
            });

            it('should throw an "Unsupported operand" error', function () {
                expect(function () {
                    value.identity();
                }).to.throw(
                    'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                    'with {"left":"string","operator":"*","right":"int"}'
                );
            });
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

        it('should transform non-numeric strings via the NumericStringParser', function () {
            var resultValue;
            numericStringParser.incrementAlphanumericString
                .withArgs('not numeric')
                .returns('incremented result');
            createValue('not numeric');

            resultValue = value.increment();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('incremented result');
        });

        it('should transform leading-numeric strings via the NumericStringParser', function () {
            var parse = sinon.createStubInstance(NumericParse),
                resultValue;
            parse.isFullyNumeric.returns(false);
            numericStringParser.parseNumericString
                .withArgs('123abc')
                .returns(parse);
            numericStringParser.incrementAlphanumericString
                .withArgs('123abc')
                .returns('incremented result');
            createValue('123abc');

            resultValue = value.increment();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('incremented result');
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
            newObjectValue.next.yields(newObjectValue);
            newObjectValue.toPromise.returns(Promise.resolve(newObjectValue));
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
        var parse;

        beforeEach(function () {
            parse = sinon.createStubInstance(NumericParse);
            parse.isFullyNumeric.returns(true);
        });

        it('should return true when the parser detects a numeric string', function () {
            parse.getType.returns('int');
            numericStringParser.parseNumericString
                .withArgs('1234')
                .returns(parse);
            createValue('1234');

            expect(value.isNumeric()).to.be.true;
        });

        it('should return false when the parser detects a leading-numeric string', function () {
            parse.getType.returns('float');
            numericStringParser.parseNumericString
                .withArgs('1234abc')
                .returns(parse);
            parse.isFullyNumeric.returns(false);
            createValue('1234abc');

            expect(value.isNumeric()).to.be.false;
        });

        it('should return false when the parser detects a fully non-numeric string', function () {
            parse.getType.returns('float');
            numericStringParser.parseNumericString
                .withArgs('not numeric')
                .returns(null);
            createValue('not numeric');

            expect(value.isNumeric()).to.be.false;
        });
    });

    describe('isScalar()', function () {
        it('should return true', function () {
            createValue('my string');

            expect(value.isScalar()).to.be.true;
        });
    });

    describe('isReferenceable()', function () {
        it('should return false', function () {
            createValue('my string');

            expect(value.isReferenceable()).to.be.false;
        });
    });

    describe('isStructured()', function () {
        it('should return false', function () {
            createValue('my string');

            expect(value.isStructured()).to.be.false;
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
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"string","operator":"*","right":"array"}'
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

        it('should invoke the callback with the value and return the coerced result', async function () {
            var callback = sinon.stub();
            callback.withArgs(sinon.match.same(value)).returns('my result');

            expect(await value.next(callback).toPromise()).to.equal('my result');
        });

        it('should return a rejected Future when the callback raises an error', async function () {
            var callback = sinon.stub(),
                result;
            callback.withArgs(sinon.match.same(value)).throws(new Error('Bang!'));

            result = value.next(callback);

            await expect(result.toPromise()).to.eventually.be.rejectedWith('Bang!');
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

    describe('onesComplement()', function () {
        it('should perform one\'s complement on the ASCII values of the characters', function () {
            var result;
            createValue('abc');

            result = value.onesComplement();

            expect(result.getType()).to.equal('string');
            expect(result.getNative()).to.equal(
                String.fromCharCode(158) + String.fromCharCode(157) + String.fromCharCode(156)
            );
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
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"string","operator":"-","right":"array"}'
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
                createValue('5.7');

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
