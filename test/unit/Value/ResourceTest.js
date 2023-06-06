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
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    NullReference = require('../../../src/Reference/Null'),
    PHPError = phpCommon.PHPError,
    ResourceValue = require('../../../src/Value/Resource'),
    Value = require('../../../src/Value').sync();

describe('ResourceValue', function () {
    var callStack,
        createValue,
        factory,
        flow,
        futureFactory,
        referenceFactory,
        resource,
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
        resource = {my: 'resource'};

        callStack.raiseTranslatedError
            .withArgs(PHPError.E_ERROR)
            .callsFake(function (level, translationKey, placeholderVariables, errorClass) {
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

        createValue = function () {
            value = new ResourceValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                flow,
                resource,
                'my_resource_type',
                1234
            );
        };
        createValue();
    });

    describe('add()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var addendValue = factory.createInteger(21);

            expect(function () {
                value.add(addendValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"resource","operator":"+","right":"int"}'
            );
        });
    });

    describe('asArrayElement()', function () {
        it('should return the value itself', function () {
            expect(value.asArrayElement()).to.equal(value);
        });
    });

    describe('asEventualNative()', function () {
        it('should return a Future that resolves to the resource ID', async function () {
            var nativeValue = await value.asEventualNative().toPromise();

            expect(nativeValue).to.equal(1234);
        });
    });

    describe('asFuture()', function () {
        it('should return a Present that resolves to this value', function () {
            return expect(value.asFuture().toPromise()).to.eventually.equal(value);
        });
    });

    describe('bitwiseAnd()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var rightValue = factory.createArray([]);

            expect(function () {
                value.bitwiseAnd(rightValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"resource","operator":"&","right":"array"}'
            );
        });
    });

    describe('bitwiseOr()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var rightValue = factory.createArray([]);

            expect(function () {
                value.bitwiseOr(rightValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"resource","operator":"|","right":"array"}'
            );
        });
    });

    describe('bitwiseXor()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var rightValue = factory.createArray([]);

            expect(function () {
                value.bitwiseXor(rightValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"resource","operator":"^","right":"array"}'
            );
        });
    });

    describe('callMethod()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                value.callMethod('myMethod', [factory.createString('my arg')]);
            }).to.throw(
                'Fake PHP Fatal error for #core.non_object_method_call with {"name":"myMethod","type":"resource"}'
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
                'Only instances of Throwable may be thrown: tried to throw a(n) resource'
            );
        });
    });

    describe('coerceToNumber()', function () {
        it('should return null', function () {
            expect(value.coerceToNumber()).to.be.null;
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
        it('should raise an error', function () {
            expect(function () {
                value.decrement();
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.cannot_decrement ' +
                'with {"type":"resource"}'
            );
        });
    });

    describe('divideBy()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var divisorValue = factory.createInteger(21);

            expect(function () {
                value.divideBy(divisorValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"resource","operator":"/","right":"int"}'
            );
        });
    });

    describe('formatAsString()', function () {
        it('should return the correct string containing the resource ID and type', function () {
            createValue();

            expect(value.formatAsString()).to.equal('resource(1234) of type (my_resource_type)');
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
            expect(value.getDisplayType()).to.equal('resource');
        });
    });

    describe('getInstancePropertyByName()', function () {
        it('should raise a warning', function () {
            value.getInstancePropertyByName(factory.createString('myProp'));

            expect(callStack.raiseTranslatedError).to.have.been.calledOnce;
            expect(callStack.raiseTranslatedError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'core.attempt_to_read_property',
                {
                    name: 'myProp',
                    type: 'resource'
                }
            );
        });

        it('should return a NullReference', function () {
            var propertyReference = value.getInstancePropertyByName(factory.createString('myProp'));

            expect(propertyReference).to.be.an.instanceOf(NullReference);
        });
    });

    describe('getNative()', function () {
        it('should return the resource ID', function () {
            expect(value.getNative()).to.equal(1234);
        });
    });

    describe('getProxy()', function () {
        it('should return the resource ID', function () {
            expect(value.getProxy()).to.equal(1234);
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
        it('should return "resource"', function () {
            expect(value.getType()).to.equal('resource');
        });
    });

    describe('getUnderlyingType()', function () {
        it('should return "resource"', function () {
            expect(value.getUnderlyingType()).to.equal('resource');
        });
    });

    describe('getValueOrNull()', function () {
        it('should just return this value, as values are always classed as "defined"', function () {
            expect(value.getValueOrNull()).to.equal(value);
        });
    });

    describe('identity()', function () {
        it('should throw an "Unsupported operand" error', function () {
            expect(function () {
                value.identity();
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"resource","operator":"*","right":"int"}'
            );
        });
    });

    describe('increment()', function () {
        it('should raise an error', function () {
            expect(function () {
                value.increment();
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.cannot_increment ' +
                'with {"type":"resource"}'
            );
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
        it('should return bool(false)', function () {
            var rightOperand = sinon.createStubInstance(Value),
                resultValue = value.isAnInstanceOf(rightOperand);

            expect(resultValue.getType()).to.equal('boolean');
            expect(resultValue.getNative()).to.be.false;
        });
    });

    describe('isCallable()', function () {
        it('should return false', async function () {
            expect(await value.isCallable().toPromise()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return false', async function () {
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
        it('should return false', function () {
            expect(value.isScalar()).to.be.false;
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
        it('should throw an "Unsupported operand" error', function () {
            var rightValue = factory.createInteger(5);

            expect(function () {
                value.modulo(rightValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"resource","operator":"%","right":"int"}'
            );
        });
    });

    describe('multiplyBy()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var multiplierOperand = factory.createInteger(5);

            expect(function () {
                value.multiplyBy(multiplierOperand);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"resource","operator":"*","right":"int"}'
            );
        });
    });

    describe('next()', function () {
        it('should just return the value when no callback given', function () {
            expect(value.next()).to.equal(value);
        });

        it('should invoke the callback with the value and return the coerced result', async function () {
            var callback = sinon.stub();
            callback.withArgs(sinon.match.same(value)).returns('my result');

            expect(await value.next(callback).toPromise()).to.equal('my result');
        });

        it('should return a rejected FutureValue when the callback raises an error', async function () {
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
                'Fake PHP Fatal error (TypeError) for #core.cannot_perform_bitwise_not ' +
                'with {"type":"resource"}'
            );
        });
    });

    describe('subtract()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var subtrahendValue = factory.createInteger(5);

            expect(function () {
                value.subtract(subtrahendValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"resource","operator":"-","right":"int"}'
            );
        });
    });
});
