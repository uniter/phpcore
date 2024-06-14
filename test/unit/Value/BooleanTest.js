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
    IntegerValue = require('../../../src/Value/Integer').sync(),
    KeyValuePair = require('../../../src/KeyValuePair'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    Value = require('../../../src/Value').sync();

describe('BooleanValue', function () {
    var callStack,
        createKeyValuePair,
        createValue,
        factory,
        flow,
        futureFactory,
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
        referenceFactory = state.getReferenceFactory();

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

        createValue = function (nativeValue) {
            value = new BooleanValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                flow,
                nativeValue
            );
        };
        createValue(true);
    });

    describe('add()', function () {
        it('should raise a fatal error when right addend is an array', function () {
            expect(function () {
                value.add(factory.createArray([]));
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"bool","operator":"+","right":"array"}'
            );
        });
    });

    describe('asArrayElement()', function () {
        it('should return the value itself', function () {
            expect(value.asArrayElement()).to.equal(value);
        });
    });

    describe('asEventualNative()', function () {
        it('should return a Future that resolves to the native boolean when true', async function () {
            var nativeBoolean = await value.asEventualNative().toPromise();

            expect(nativeBoolean).to.be.true;
        });

        it('should return a Future that resolves to the native boolean when false', async function () {
            var nativeBoolean;
            createValue(false);

            nativeBoolean = await value.asEventualNative().toPromise();

            expect(nativeBoolean).to.be.false;
        });
    });

    describe('asFuture()', function () {
        it('should return a Present that resolves to this value', function () {
            return expect(value.asFuture().toPromise()).to.eventually.equal(value);
        });
    });

    describe('bitwiseAnd()', function () {
        it('should throw an "Unsupported operand" error for an array operand', function () {
            var rightValue = factory.createArray([]);

            expect(function () {
                value.bitwiseAnd(rightValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"bool","operator":"&","right":"array"}'
            );
        });

        it('should return the correct result for an integer operand when true', function () {
            var expectedResult = parseInt('00000001', 2),
                result,
                rightValue = factory.createInteger(parseInt('00001011', 2));

            result = value.bitwiseAnd(rightValue);

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(expectedResult);
        });

        it('should return the correct result for an integer operand when false', function () {
            var expectedResult = parseInt('00000000', 2),
                result,
                rightValue = factory.createInteger(parseInt('00001011', 2));
            createValue(false);

            result = value.bitwiseAnd(rightValue);

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(expectedResult);
        });
    });

    describe('bitwiseOr()', function () {
        it('should throw an "Unsupported operand" error for an array operand', function () {
            var rightValue = factory.createArray([]);

            expect(function () {
                value.bitwiseOr(rightValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"bool","operator":"|","right":"array"}'
            );
        });

        it('should return the correct result for an integer operand when true', function () {
            var expectedResult = parseInt('11110001', 2),
                result,
                rightValue = factory.createInteger(parseInt('11110000', 2));

            result = value.bitwiseOr(rightValue);

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(expectedResult);
        });

        it('should return the correct result for an integer operand when false', function () {
            var expectedResult = parseInt('11110000', 2),
                result,
                rightValue = factory.createInteger(parseInt('11110000', 2));
            createValue(false);

            result = value.bitwiseOr(rightValue);

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(expectedResult);
        });
    });

    describe('bitwiseXor()', function () {
        it('should throw an "Unsupported operand" error for an array operand', function () {
            var rightValue = factory.createArray([]);

            expect(function () {
                value.bitwiseXor(rightValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"bool","operator":"^","right":"array"}'
            );
        });

        it('should return the correct result for an integer operand when true', function () {
            var expectedResult = parseInt('11110000', 2),
                result,
                rightValue = factory.createInteger(parseInt('11110001', 2));

            result = value.bitwiseXor(rightValue);

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(expectedResult);
        });

        it('should return the correct result for an integer operand when false', function () {
            var expectedResult = parseInt('11110001', 2),
                result,
                rightValue = factory.createInteger(parseInt('11110001', 2));
            createValue(false);

            result = value.bitwiseXor(rightValue);

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(expectedResult);
        });
    });

    describe('callMethod()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                value.callMethod('myMethod', [factory.createString('my arg')]);
            }).to.throw(
                'Fake PHP Fatal error for #core.non_object_method_call with {"name":"myMethod","type":"boolean"}'
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
                'Only instances of Throwable may be thrown: tried to throw a(n) boolean'
            );
        });
    });

    describe('coerceToNumber()', function () {
        it('should return int(0) when false', function () {
            var resultValue;
            createValue(false);

            resultValue = value.coerceToNumber();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(0);
        });

        it('should return int(1) when true', function () {
            var resultValue = value.coerceToNumber();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1);
        });
    });

    describe('convertForBooleanType()', function () {
        it('should just return this value as it is already the correct type', function () {
            expect(value.convertForBooleanType()).to.equal(value);
        });
    });

    describe('convertForFloatType()', function () {
        it('should return float(1) when true', function () {
            var resultValue = value.convertForFloatType();

            expect(resultValue.getType()).to.equal('float');
            expect(resultValue.getNative()).to.equal(1);
        });

        it('should return float(0) when false', function () {
            var resultValue;
            createValue(false);

            resultValue = value.convertForFloatType();

            expect(resultValue.getType()).to.equal('float');
            expect(resultValue.getNative()).to.equal(0);
        });
    });

    describe('convertForIntegerType()', function () {
        it('should return int(1) when true', function () {
            var resultValue = value.convertForIntegerType();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1);
        });

        it('should return int(0) when false', function () {
            var resultValue;
            createValue(false);

            resultValue = value.convertForIntegerType();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(0);
        });
    });

    describe('convertForStringType()', function () {
        it('should return "1" when true', function () {
            var resultValue = value.convertForStringType();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('1');
        });

        it('should return the empty string when false', function () {
            var resultValue;
            createValue(false);

            resultValue = value.convertForStringType();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('');
        });
    });

    describe('decrement()', function () {
        // NB: Yes, this is actually the correct behaviour, vs. subtracting one from a boolean explicitly.
        it('should return the boolean unchanged when true', function () {
            var resultValue = value.decrement();

            expect(resultValue.getNative()).to.be.true;
        });

        it('should return the boolean unchanged when false', function () {
            var resultValue;
            createValue(false);
            resultValue = value.decrement();

            expect(resultValue.getNative()).to.be.false;
        });
    });

    describe('divideBy()', function () {
        it('should throw an "Unsupported operand" error for an array divisor', function () {
            var divisorValue = factory.createArray([]);
            createValue(true);

            expect(function () {
                value.divideBy(divisorValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"bool","operator":"/","right":"array"}'
            );
        });

        describe('for a boolean divisor', function () {
            it('should return the result of dividing true by true', function () {
                var divisorOperand = factory.createBoolean(true), // Will be coerced to int(1)
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(1);
            });

            it('should return the result of dividing false by true', function () {
                var divisorOperand = factory.createBoolean(true), // Will be coerced to int(1)
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should raise a warning and return false when dividing by false', function () {
                var divisorOperand = factory.createBoolean(false), // Will be coerced to int(0)
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.divideBy(divisorOperand);

                expect(callStack.raiseError).to.have.been.calledOnce;
                expect(callStack.raiseError)
                    .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                expect(resultValue.getType()).to.equal('boolean');
                expect(resultValue.getNative()).to.equal(false);
            });
        });

        describe('for a float divisor', function () {
            it('should return the result of dividing when true', function () {
                var divisorOperand = factory.createFloat(2.5),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(0.4);
            });

            it('should return the result of dividing when false', function () {
                var divisorOperand = factory.createFloat(10.5),
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should raise a warning and return false when dividing by zero', function () {
                var divisorOperand = factory.createFloat(0),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.divideBy(divisorOperand);

                expect(callStack.raiseError).to.have.been.calledOnce;
                expect(callStack.raiseError)
                    .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                expect(resultValue.getType()).to.equal('boolean');
                expect(resultValue.getNative()).to.equal(false);
            });
        });

        describe('for an integer divisor', function () {
            it('should return the result of dividing when true', function () {
                var divisorOperand = factory.createInteger(2),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(0.5);
            });

            it('should return the result of dividing when false', function () {
                var divisorOperand = factory.createInteger(2),
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should raise a warning and return false when dividing by zero', function () {
                var divisorOperand = factory.createInteger(0),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

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
            createValue(true); // Will be coerced to int(1)

            resultValue = value.divideBy(divisorOperand);

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError)
                .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
            expect(resultValue.getType()).to.equal('boolean');
            expect(resultValue.getNative()).to.equal(false);
        });

        describe('for an object divisor', function () {
            it('should return the result of dividing when true', function () {
                var divisorOperand = sinon.createStubInstance(ObjectValue),
                    resultValue;
                divisorOperand.coerceToNumber.returns(factory.createInteger(1));
                createValue(true); // Will be coerced to int(1)

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(1);
            });

            it('should return the result of dividing when false', function () {
                var divisorOperand = sinon.createStubInstance(ObjectValue),
                    resultValue;
                divisorOperand.coerceToNumber.returns(factory.createInteger(1));
                createValue(false); // Will be coerced to int(0)

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should not raise any extra notices', function () {
                var divisorOperand = sinon.createStubInstance(ObjectValue);
                divisorOperand.coerceToNumber.returns(factory.createInteger(1));
                createValue(true); // Will be coerced to int(1)

                value.divideBy(divisorOperand);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('for a string divisor', function () {
            it('should return the result of dividing by a float when true', function () {
                var divisorOperand = factory.createString('2.5'),
                    resultValue;
                createValue(true); // Will be coerced to int(1).

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(0.4);
                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });

            it('should return the result of dividing by a float with decimal string prefix when true', function () {
                var divisorOperand = factory.createString('2.5.4'),
                    resultValue;
                createValue(true); // Will be coerced to int(1).

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(0.4);
                expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(callStack.raiseTranslatedError).to.have.been.calledWith(
                    PHPError.E_WARNING,
                    'core.non_numeric_value'
                );
            });

            it('should return the result of dividing when false', function () {
                var divisorOperand = factory.createString('7'),
                    resultValue;
                createValue(false); // Will be coerced to int(0).

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });

            it('should raise a warning and return false when dividing by zero', function () {
                var divisorOperand = factory.createString('0'),
                    resultValue;
                createValue(true); // Will be coerced to int(1).

                resultValue = value.divideBy(divisorOperand);

                expect(callStack.raiseError).to.have.been.calledOnce;
                expect(callStack.raiseError)
                    .to.have.been.calledWith(PHPError.E_WARNING, 'Division by zero');
                expect(resultValue.getType()).to.equal('boolean');
                expect(resultValue.getNative()).to.equal(false);
                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });
    });

    describe('formatAsString()', function () {
        it('should return "true" when true', function () {
            createValue(true);

            expect(value.formatAsString()).to.equal('true');
        });

        it('should return "false" when true', function () {
            createValue(false);

            expect(value.formatAsString()).to.equal('false');
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
        it('should return the shorthand type name "bool"', function () {
            expect(value.getDisplayType()).to.equal('bool');
        });
    });

    describe('getNative()', function () {
        it('should return true when true', function () {
            createValue(true);

            expect(value.getNative()).to.be.true;
        });

        it('should return false when false', function () {
            createValue(false);

            expect(value.getNative()).to.be.false;
        });
    });

    describe('getOutgoingValues()', function () {
        it('should return an empty array as scalars cannot refer to anything', function () {
            expect(value.getOutgoingValues()).to.deep.equal([]);
        });
    });

    describe('getProxy()', function () {
        it('should return true when true', function () {
            createValue(true);

            expect(value.getProxy()).to.be.true;
        });

        it('should return false when false', function () {
            createValue(false);

            expect(value.getProxy()).to.be.false;
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

    describe('getType()', function () {
        it('should return "boolean"', function () {
            expect(value.getType()).to.equal('boolean');
        });
    });

    describe('getUnderlyingType()', function () {
        it('should return "boolean"', function () {
            expect(value.getUnderlyingType()).to.equal('boolean');
        });
    });

    describe('getValueOrNull()', function () {
        it('should just return this value, as values are always classed as "defined"', function () {
            expect(value.getValueOrNull()).to.equal(value);
        });
    });

    describe('identity()', function () {
        it('should coerce to int(1) when true', function () {
            var resultValue;
            createValue(true);

            resultValue = value.identity();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1);
        });

        it('should coerce to int(0) when false', function () {
            var resultValue;
            createValue(false);

            resultValue = value.identity();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(0);
        });
    });

    describe('increment()', function () {
        // NB: Yes, this is actually the correct behaviour, vs. adding one to a boolean explicitly.
        it('should return the boolean unchanged when true', function () {
            var resultValue = value.increment();

            expect(resultValue.getNative()).to.be.true;
        });

        it('should return the boolean unchanged when false', function () {
            var resultValue;
            createValue(false);
            resultValue = value.increment();

            expect(resultValue.getNative()).to.be.false;
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
            rightOperand.isTheClassOfBoolean.withArgs(value).returns(result);

            expect(value.isAnInstanceOf(rightOperand)).to.equal(result);
        });
    });

    describe('isCallable()', function () {
        it('should return false', async function () {
            expect(await value.isCallable().toPromise()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true for boolean false', async function () {
            createValue(false);

            expect(await value.isEmpty().toPromise()).to.be.true;
        });

        it('should return false for boolean true', async function () {
            createValue(true);

            expect(await value.isEmpty().toPromise()).to.be.false;
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

    describe('isReferenceable()', function () {
        it('should return false', function () {
            expect(value.isReferenceable()).to.be.false;
        });
    });

    describe('isScalar()', function () {
        it('should return true', function () {
            expect(value.isScalar()).to.be.true;
        });
    });

    describe('isStructured()', function () {
        it('should return false', function () {
            expect(value.isStructured()).to.be.false;
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
        it('should always return 0 for false, as it will always coerce to 0', function () {
            var result,
                rightValue = factory.createInteger(21);
            createValue(false);

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });

        it('should return 1 for true when the remainder is 1', function () {
            var result,
                rightValue = factory.createInteger(2);
            createValue(true);

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });

        it('should return 0 for true when there is no remainder', function () {
            var result,
                rightValue = factory.createInteger(1);
            createValue(true);

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });
    });

    describe('multiplyBy()', function () {
        it('should throw an "Unsupported operand" error for an array multiplier', function () {
            var multiplierValue = factory.createArray([]);
            createValue(true);

            expect(function () {
                value.multiplyBy(multiplierValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"bool","operator":"*","right":"array"}'
            );
        });

        describe('for a boolean multiplier', function () {
            it('should return the result of multiplying true by true', function () {
                var multiplierOperand = factory.createBoolean(true), // Will be coerced to int(1)
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(1);
            });

            it('should return the result of multiplying false by true', function () {
                var multiplierOperand = factory.createBoolean(true), // Will be coerced to int(1)
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should return the result of multiplying false by false', function () {
                var multiplierOperand = factory.createBoolean(false), // Will be coerced to int(0)
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });
        });

        describe('for a float multiplier', function () {
            it('should return the result of multiplying when true', function () {
                var multiplierOperand = factory.createFloat(2.5),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(2.5);
            });

            it('should return the result of multiplying when false', function () {
                var multiplierOperand = factory.createFloat(10.5),
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should return the result of multiplying by 0', function () {
                var multiplierOperand = factory.createFloat(0),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(0);
            });
        });

        describe('for an integer multiplier', function () {
            it('should return the result of multiplying when true', function () {
                var multiplierOperand = factory.createInteger(2),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(2);
            });

            it('should return the result of multiplying when false', function () {
                var multiplierOperand = factory.createInteger(2),
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should return the result of multiplying by 0', function () {
                var multiplierOperand = factory.createInteger(0),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });
        });

        it('should return zero for a null multiplier', function () {
            var multiplierOperand = factory.createNull(),
                resultValue;
            createValue(true); // Will be coerced to int(1)

            resultValue = value.multiplyBy(multiplierOperand);

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(0);
        });

        describe('for an object multiplier', function () {
            it('should return the result of multiplying when true', function () {
                var multiplierOperand = sinon.createStubInstance(ObjectValue),
                    resultValue;
                multiplierOperand.coerceToNumber.returns(factory.createInteger(1));
                createValue(true); // Will be coerced to int(1)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(1);
            });

            it('should return the result of multiplying when false', function () {
                var multiplierOperand = sinon.createStubInstance(ObjectValue),
                    resultValue;
                multiplierOperand.coerceToNumber.returns(factory.createInteger(1));
                createValue(false); // Will be coerced to int(0)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should not raise any extra notices', function () {
                var multiplierOperand = sinon.createStubInstance(ObjectValue);
                multiplierOperand.coerceToNumber.returns(factory.createInteger(1));
                createValue(true); // Will be coerced to int(1)

                value.multiplyBy(multiplierOperand);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('for a string multiplier', function () {
            it('should return the result of multiplying by a float when true', function () {
                var multiplierOperand = factory.createString('2.5'),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(2.5);
                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });

            it('should return the result of multiplying by a float with decimal string prefix when true', function () {
                var multiplierOperand = factory.createString('3.5.4'),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(3.5);
                expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(callStack.raiseTranslatedError).to.have.been.calledWith(
                    PHPError.E_WARNING,
                    'core.non_numeric_value'
                );
            });

            it('should return the result of multiplying when false', function () {
                var multiplierOperand = factory.createString('7'),
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });

            it('should return zero when multiplying by zero', function () {
                var multiplierOperand = factory.createString('0'),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });
    });

    describe('next()', function () {
        it('should just return the value when no callback given', function () {
            expect(value.next()).to.equal(value);
        });

        it('should invoke the callback with the value and return the chainified result', async function () {
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
        it('should throw a "Cannot perform bitwise not" error', function () {
            expect(function () {
                value.onesComplement();
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.cannot_perform_bitwise_not with {"type":"bool"}'
            );
        });
    });

    describe('subtract()', function () {
        it('should throw an "Unsupported operand" error for an array subtrahend', function () {
            var subtrahendValue = factory.createArray([]);
            createValue(true);

            expect(function () {
                value.subtract(subtrahendValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"bool","operator":"-","right":"array"}'
            );
        });

        describe('for a boolean subtrahend', function () {
            it('should return the result of subtracting true from true', function () {
                var subtrahendOperand = factory.createBoolean(true), // Will be coerced to int(1)
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should return the result of subtracting true from false', function () {
                var subtrahendOperand = factory.createBoolean(true), // Will be coerced to int(1)
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(-1);
            });

            it('should return the result of subtracting false from false', function () {
                var subtrahendOperand = factory.createBoolean(false), // Will be coerced to int(0)
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });
        });

        describe('for a float subtrahend', function () {
            it('should return the result of subtracting when true', function () {
                var subtrahendOperand = factory.createFloat(2.5),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(-1.5);
            });

            it('should return the result of subtracting when false', function () {
                var subtrahendOperand = factory.createFloat(10.5),
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(-10.5);
            });

            it('should return the result of subtracting 0', function () {
                var subtrahendOperand = factory.createFloat(0),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(1);
            });
        });

        describe('for an integer subtrahend', function () {
            it('should return the result of subtracting when true', function () {
                var subtrahendOperand = factory.createInteger(2),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(-1);
            });

            it('should return the result of subtracting when false', function () {
                var subtrahendOperand = factory.createInteger(2),
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(-2);
            });

            it('should return the result of subtracting 0', function () {
                var subtrahendOperand = factory.createInteger(0),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(1);
            });
        });

        it('should subtract zero for a null subtrahend', function () {
            var subtrahendOperand = factory.createNull(),
                resultValue;
            createValue(true); // Will be coerced to int(1)

            resultValue = value.subtract(subtrahendOperand);

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1);
        });

        describe('for an object subtrahend', function () {
            it('should return the result of subtracting when true', function () {
                var subtrahendOperand = sinon.createStubInstance(ObjectValue),
                    resultValue;
                subtrahendOperand.coerceToNumber.returns(factory.createInteger(1));
                createValue(true); // Will be coerced to int(1)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should return the result of subtracting when false', function () {
                var subtrahendOperand = sinon.createStubInstance(ObjectValue),
                    resultValue;
                subtrahendOperand.coerceToNumber.returns(factory.createInteger(1));
                createValue(false); // Will be coerced to int(0)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(-1);
            });

            it('should not raise any extra notices', function () {
                var subtrahendOperand = sinon.createStubInstance(ObjectValue);
                subtrahendOperand.coerceToNumber.returns(factory.createInteger(1));
                createValue(true); // Will be coerced to int(1)

                value.subtract(subtrahendOperand);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('for a string subtrahend', function () {
            it('should return the result of subtracting by a float when true', function () {
                var subtrahendOperand = factory.createString('2.5'),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(-1.5);
                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });

            it('should return the result of subtracting by a float with decimal string prefix when true', function () {
                var subtrahendOperand = factory.createString('3.5.4'),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(-2.5);
                expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
                expect(callStack.raiseTranslatedError).to.have.been.calledWith(
                    PHPError.E_WARNING,
                    'core.non_numeric_value'
                );
            });

            it('should return the result of subtracting when false', function () {
                var subtrahendOperand = factory.createString('7'),
                    resultValue;
                createValue(false); // Will be coerced to int(0)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(-7);
                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });

            it('should return the result when subtracting zero', function () {
                var subtrahendOperand = factory.createString('0'),
                    resultValue;
                createValue(true); // Will be coerced to int(1)

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(1);
                expect(callStack.raiseTranslatedError).not.to.have.been.called;
            });
        });
    });
});
