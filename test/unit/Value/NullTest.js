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
    CallStack = require('../../../src/CallStack'),
    KeyValuePair = require('../../../src/KeyValuePair'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    NullReference = require('../../../src/Reference/Null'),
    NullValue = require('../../../src/Value/Null').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    Value = require('../../../src/Value').sync();

describe('Null', function () {
    var callStack,
        createKeyValuePair,
        createValue,
        factory,
        futureFactory,
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
        referenceFactory = state.getReferenceFactory();

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
            value = new NullValue(factory, referenceFactory, futureFactory, callStack);
        };
        createValue();
    });

    describe('add()', function () {
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
                expect(resultValue.getNative()).to.equal(1);
            });

            it('should return the result of adding false', function () {
                var addendOperand = factory.createBoolean(false), // Will be coerced to int(0)
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });
        });

        describe('for a float addend', function () {
            it('should return the result of adding', function () {
                var addendOperand = factory.createFloat(2.5),
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(2.5);
            });
        });

        describe('for an integer addend', function () {
            it('should return the result of adding', function () {
                var addendOperand = factory.createInteger(2),
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(2);
            });
        });

        it('should add zero for a null addend', function () {
            var addendOperand = factory.createNull(),
                resultValue;

            resultValue = value.add(addendOperand);

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(0);
        });

        describe('for an object addend', function () {
            it('should return the result of adding, with the object coerced to int(1)', function () {
                var addendOperand = sinon.createStubInstance(ObjectValue),
                    resultValue;
                addendOperand.coerceToNumber.returns(factory.createInteger(1));

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(1);
            });

            it('should not raise any extra notices', function () {
                var addendOperand = sinon.createStubInstance(ObjectValue);
                addendOperand.coerceToNumber.returns(factory.createInteger(1));

                value.add(addendOperand);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('for a string addend', function () {
            it('should return the result of adding a float string', function () {
                var addendOperand = factory.createString('2.5'),
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(2.5);
            });

            it('should return the result of adding a float with decimal string prefix', function () {
                var addendOperand = factory.createString('3.5.4'),
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(3.5);
            });

            it('should return the result of adding an integer string', function () {
                var addendOperand = factory.createString('7'),
                    resultValue;

                resultValue = value.add(addendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(7);
            });
        });
    });

    describe('asArrayElement()', function () {
        it('should return the value itself', function () {
            expect(value.asArrayElement()).to.equal(value);
        });
    });

    describe('asEventualNative()', function () {
        it('should return a Future that resolves to null', async function () {
            var nativeNull = await value.asEventualNative().toPromise();

            expect(nativeNull).to.be.null;
        });
    });

    describe('asFuture()', function () {
        it('should return a Present that resolves to this value', function () {
            return expect(value.asFuture().toPromise()).to.eventually.equal(value);
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

    describe('convertForBooleanType()', function () {
        it('should just return this value as no conversion is possible', function () {
            expect(value.convertForBooleanType()).to.equal(value);
        });
    });

    describe('convertForFloatType()', function () {
        it('should just return this value as no conversion is possible', function () {
            expect(value.convertForFloatType()).to.equal(value);
        });
    });

    describe('convertForIntegerType()', function () {
        it('should just return this value as no conversion is possible', function () {
            expect(value.convertForIntegerType()).to.equal(value);
        });
    });

    describe('convertForStringType()', function () {
        it('should just return this value as no conversion is possible', function () {
            expect(value.convertForStringType()).to.equal(value);
        });
    });

    describe('decrement()', function () {
        // NB: Yes, this is actually the correct behaviour, vs. subtracting one from null explicitly.
        it('should just return null', function () {
            var resultValue = value.decrement();

            expect(resultValue.getNative()).to.be.null;
        });
    });

    describe('divideBy()', function () {
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
                expect(resultValue.getNative()).to.equal(0);
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
                var divisorOperand = factory.createFloat(0.5),
                    resultValue;

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(0);
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

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
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
                expect(resultValue.getNative()).to.equal(0);
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
                var divisorOperand = factory.createString('0.5'),
                    resultValue;

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should return the result of dividing by a float with decimal string prefix', function () {
                var divisorOperand = factory.createString('0.5.4'),
                    resultValue;

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should return the result of dividing by an integer string', function () {
                var divisorOperand = factory.createString('2'),
                    resultValue;

                resultValue = value.divideBy(divisorOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
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

    describe('getInstancePropertyByName()', function () {
        it('should raise a warning', function () {
            value.getInstancePropertyByName(factory.createString('myProp'));

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Trying to get property of non-object'
            );
        });

        it('should return a NullReference', function () {
            var propertyReference = value.getInstancePropertyByName(factory.createString('myProp'));

            expect(propertyReference).to.be.an.instanceOf(NullReference);
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

    describe('increment()', function () {
        it('should return int(1)', function () {
            var resultValue = value.increment();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1);
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
        it('should return false', async function () {
            expect(await value.isCallable().toPromise()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true', async function () {
            expect(await value.isEmpty().toPromise()).to.be.true;
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

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(0);
        });
    });

    describe('multiplyBy()', function () {
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
                expect(resultValue.getNative()).to.equal(0);
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
                expect(resultValue.getNative()).to.equal(0);
            });
        });

        describe('for an integer multiplier', function () {
            it('should return the result of multiplying', function () {
                var multiplierOperand = factory.createInteger(2),
                    resultValue;

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
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
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should not raise any extra notices', function () {
                var multiplierOperand = sinon.createStubInstance(ObjectValue);
                multiplierOperand.coerceToNumber.returns(factory.createInteger(1));

                value.multiplyBy(multiplierOperand);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('for a string multiplier', function () {
            it('should return the result of multiplying by a float string', function () {
                var multiplierOperand = factory.createString('2.5'),
                    resultValue;

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should return the result of multiplying by a float with decimal string prefix', function () {
                var multiplierOperand = factory.createString('3.5.4'),
                    resultValue;

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(0);
            });

            it('should return the result of multiplying by an integer string', function () {
                var multiplierOperand = factory.createString('2'),
                    resultValue;

                resultValue = value.multiplyBy(multiplierOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
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
                expect(resultValue.getNative()).to.equal(-1);
            });

            it('should return the result of subtracting false', function () {
                var subtrahendOperand = factory.createBoolean(false), // Will be coerced to int(0)
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(0);
            });
        });

        describe('for a float subtrahend', function () {
            it('should return the result of subtracting', function () {
                var subtrahendOperand = factory.createFloat(2.5),
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(-2.5);
            });
        });

        describe('for an integer subtrahend', function () {
            it('should return the result of subtracting', function () {
                var subtrahendOperand = factory.createInteger(2),
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(-2);
            });
        });

        it('should subtract zero for a null subtrahend', function () {
            var subtrahendOperand = factory.createNull(),
                resultValue;

            resultValue = value.subtract(subtrahendOperand);

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(0);
        });

        describe('for an object subtrahend', function () {
            it('should return the result of subtracting, with the object coerced to int(1)', function () {
                var subtrahendOperand = sinon.createStubInstance(ObjectValue),
                    resultValue;
                createValue(7);
                subtrahendOperand.coerceToNumber.returns(factory.createInteger(1));

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(-1);
            });

            it('should not raise any extra notices', function () {
                var subtrahendOperand = sinon.createStubInstance(ObjectValue);
                subtrahendOperand.coerceToNumber.returns(factory.createInteger(1));

                value.subtract(subtrahendOperand);

                expect(callStack.raiseError).not.to.have.been.called;
            });
        });

        describe('for a string subtrahend', function () {
            it('should return the result of subtracting a float string', function () {
                var subtrahendOperand = factory.createString('2.5'),
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(-2.5);
            });

            it('should return the result of subtracting a float with decimal string prefix', function () {
                var subtrahendOperand = factory.createString('3.5.4'),
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('float');
                expect(resultValue.getNative()).to.equal(-3.5);
            });

            it('should return the result of subtracting an integer string', function () {
                var subtrahendOperand = factory.createString('7'),
                    resultValue;

                resultValue = value.subtract(subtrahendOperand);

                expect(resultValue.getType()).to.equal('int');
                expect(resultValue.getNative()).to.equal(-7);
            });
        });
    });
});
