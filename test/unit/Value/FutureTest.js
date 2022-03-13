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
    CallStack = require('../../../src/CallStack'),
    ElementReference = require('../../../src/Reference/Element'),
    Future = require('../../../src/Control/Future'),
    FutureValue = require('../../../src/Value/Future'),
    Exception = phpCommon.Exception,
    ObjectValue = require('../../../src/Value/Object').sync(),
    Pause = require('../../../src/Control/Pause'),
    Reference = require('../../../src/Reference/Reference'),
    StaticPropertyReference = require('../../../src/Reference/StaticProperty'),
    Value = require('../../../src/Value').sync(),
    Variable = require('../../../src/Variable').sync();

describe('FutureValue', function () {
    var callStack,
        controlFactory,
        createValue,
        factory,
        futureFactory,
        referenceFactory,
        state,
        value;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        controlFactory = state.getControlFactory();
        factory = state.getValueFactory();
        futureFactory = state.getFutureFactory();
        referenceFactory = state.getReferenceFactory();

        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        createValue = function (future) {
            value = new FutureValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                future
            );

            return value;
        };
    });

    describe('add()', function () {
        it('should be able to add to an IntegerValue', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(21)));

            result = await value.add(factory.createInteger(10)).toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(31);
        });
    });

    describe('asEventualNative()', function () {
        it('should resolve to the eventual native value', async function () {
            createValue(futureFactory.createPresent(factory.createInteger(21)));

            expect(await value.asEventualNative().toPromise()).to.equal(21);
        });
    });

    describe('asFuture()', function () {
        it('should return the underlying future', async function () {
            var future = futureFactory.createPresent(factory.createInteger(21));

            createValue(future);

            expect(value.asFuture()).to.equal(future);
        });
    });

    describe('bitwiseAnd()', function () {
        it('should be able to bitwise-AND with an IntegerValue', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(5)));

            result = await value.bitwiseAnd(factory.createInteger(6)).toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(4);
        });
    });

    describe('bitwiseOr()', function () {
        it('should be able to bitwise-AND with an IntegerValue', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(2)));

            result = await value.bitwiseOr(factory.createInteger(1)).toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(3);
        });
    });

    describe('bitwiseXor()', function () {
        it('should be able to bitwise-AND with an IntegerValue', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(7)));

            result = await value.bitwiseXor(factory.createInteger(2)).toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(5);
        });
    });

    describe('call()', function () {
        it('should be able to call the eventual resolved value, which can then return a value', async function () {
            var arg1 = factory.createString('first arg'),
                arg2 = factory.createString('second arg'),
                resolvedValue = sinon.createStubInstance(Value),
                resultValue = factory.createString('my result');
            resolvedValue.call
                .withArgs([arg1, arg2])
                .returns(resultValue);
            createValue(futureFactory.createPresent(resolvedValue));

            expect(await value.call([arg1, arg2]).toPromise()).to.equal(resultValue);
        });

        it('should be able to call the eventual resolved value, which can then return a variable', async function () {
            var arg1 = factory.createString('first arg'),
                arg2 = factory.createString('second arg'),
                resolvedValue = sinon.createStubInstance(Value),
                resultVariable = sinon.createStubInstance(Variable);
            resolvedValue.call
                .withArgs([arg1, arg2])
                .returns(futureFactory.createPresent(resultVariable));
            createValue(futureFactory.createPresent(resolvedValue));

            expect(await value.call([arg1, arg2]).toPromise()).to.equal(resultVariable);
        });
    });

    describe('catch()', function () {
        it('should be able to attach a rejection handler', async function () {
            var result;
            createValue(futureFactory.createRejection(new Error('Bang!')));
            value.catch(function (error) {
                // Catch & convert the error into a result value.
                return 'The message was: ' + error.message;
            });

            result = await value.toPromise();

            expect(result.getType()).to.equal('string');
            expect(result.getNative()).to.equal('The message was: Bang!');
        });
    });

    describe('coerceToBoolean()', function () {
        it('should be able to coerce a value to boolean', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(21)));

            result = await value.coerceToBoolean().toPromise();

            expect(result.getType()).to.equal('boolean');
            expect(result.getNative()).to.be.true;
        });
    });

    describe('coerceToInteger()', function () {
        it('should be able to coerce a value to integer', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createString('21')));

            result = await value.coerceToInteger().toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(21);
        });
    });

    describe('coerceToKey()', function () {
        it('should be able to coerce a value to a valid key value', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createFloat(21.78)));

            result = await value.coerceToKey().toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(21);
        });
    });

    describe('coerceToNumber()', function () {
        it('should be able to coerce a value to a number', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createString('21')));

            result = await value.coerceToNumber().toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(21);
        });
    });

    describe('coerceToString()', function () {
        it('should be able to coerce a value to string', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createFloat(21.78)));

            result = await value.coerceToString().toPromise();

            expect(result.getType()).to.equal('string');
            expect(result.getNative()).to.equal('21.78');
        });
    });

    describe('concat()', function () {
        it('should be able to concatenate with a FloatValue', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createFloat(1.2)));

            result = await value.concat(factory.createFloat(3.4)).toPromise();

            expect(result.getType()).to.equal('string');
            expect(result.getNative()).to.equal('1.23.4');
        });
    });

    describe('concatString()', function () {
        it('should be able to concatenate a string asynchronously multiple times', async function () {
            var presentValue;
            createValue(futureFactory.createAsyncPresent('first'));

            value = value.concatString(' second');
            value = value.concatString(' third');
            presentValue = await value.toPromise();

            expect(presentValue.getType()).to.equal('string');
            expect(presentValue.getNative()).to.equal('first second third');
        });
    });

    describe('convertForBooleanType()', function () {
        it('should convert the resolved value to boolean when truthy', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createFloat(123.456)));

            result = await value.convertForBooleanType().toPromise();

            expect(result.getType()).to.equal('boolean');
            expect(result.getNative()).to.be.true;
        });

        it('should convert the resolved value to boolean when falsy', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createFloat(0)));

            result = await value.convertForBooleanType().toPromise();

            expect(result.getType()).to.equal('boolean');
            expect(result.getNative()).to.be.false;
        });
    });

    describe('convertForFloatType()', function () {
        it('should convert the resolved value to float', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(21)));

            result = await value.convertForFloatType().toPromise();

            expect(result.getType()).to.equal('float');
            expect(result.getNative()).to.equal(21);
        });
    });

    describe('convertForIntegerType()', function () {
        it('should convert the resolved value to integer', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createFloat(123.456)));

            result = await value.convertForIntegerType().toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(123);
        });
    });

    describe('convertForStringType()', function () {
        it('should convert the resolved value to string', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createFloat(123.456)));

            result = await value.convertForStringType().toPromise();

            expect(result.getType()).to.equal('string');
            expect(result.getNative()).to.equal('123.456');
        });
    });

    describe('decrement()', function () {
        it('should be able to decrement', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(21)));

            result = await value.decrement().toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(20);
        });
    });

    describe('derive()', function () {
        it('should create a derived future', async function () {
            var derivedValue,
                doResolve,
                log = [];
            createValue(futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            }));
            derivedValue = value.derive();

            value.next(function () {
                log.push('one');
            });
            derivedValue.next(function () {
                log.push('two');
            });
            value.next(function () {
                log.push('three');
            });
            derivedValue.next(function () {
                log.push('four');
            });
            doResolve();
            await value.toPromise();

            expect(log).to.deep.equal(['two', 'four', 'one', 'three']);
        });
    });

    describe('divideBy()', function () {
        it('should be able to divide by an IntegerValue', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(20)));

            result = await value.divideBy(factory.createInteger(2)).toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(10);
        });
    });

    describe('finally()', function () {
        it('should attach a handler to be called on resolution', async function () {
            var resultValue;
            createValue(futureFactory.createPresent(factory.createString('my result')));

            value.finally(function (resultValue) {
                return 'Result was: ' + resultValue.getNative();
            });
            resultValue = await value.toPromise();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('Result was: my result');
        });

        it('should attach a handler to also be called on rejection', async function () {
            var resultValue;
            createValue(futureFactory.createRejection(new Error('Bang!')));

            value.finally(function (error) {
                return 'Error was: ' + error.message;
            });
            resultValue = await value.toPromise();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('Error was: Bang!');
        });
    });

    describe('formatAsString()', function () {
        it('should return the correct string', function () {
            createValue(futureFactory.createPresent(factory.createString('my result')));

            expect(value.formatAsString()).to.equal('(Future)');
        });
    });

    describe('getNative()', function () {
        it('should throw even when the future is already resolved', function () {
            createValue(futureFactory.createPresent(factory.createString('my result')));

            expect(function () {
                value.getNative();
            }).to.throw(
                Exception,
                'Unable to call .getNative() on a FutureValue - did you mean to call .yieldSync()?'
            );
        });

        it('should throw when the future is still pending', function () {
            createValue(futureFactory.createFuture(function () {/* Never resolved */}));

            expect(function () {
                value.getNative();
            }).to.throw(
                Exception,
                'Unable to call .getNative() on a FutureValue - did you mean to call .yieldSync()?'
            );
        });
    });

    describe('getPushElement()', function () {
        it('should be able to fetch a push element of the eventual resolved value', async function () {
            var pushElement = sinon.createStubInstance(ElementReference),
                resolvedValue = sinon.createStubInstance(ObjectValue);
            resolvedValue.getPushElement
                .returns(pushElement);
            createValue(futureFactory.createPresent(resolvedValue));

            expect(await value.getPushElement().toPromise()).to.equal(pushElement);
        });
    });

    describe('getStaticPropertyByName()', function () {
        it('should be able to fetch a property of the eventual resolved value', async function () {
            var propertyNameValue = factory.createString('myStaticProp'),
                propertyReference = sinon.createStubInstance(StaticPropertyReference),
                resolvedValue = sinon.createStubInstance(ObjectValue);
            resolvedValue.getStaticPropertyByName
                .withArgs(sinon.match.same(propertyNameValue))
                .returns(propertyReference);
            createValue(futureFactory.createPresent(resolvedValue));

            expect(await value.getStaticPropertyByName(propertyNameValue).toPromise()).to.equal(propertyReference);
        });
    });

    describe('getType()', function () {
        it('should return "future" even when the future is already resolved', function () {
            createValue(futureFactory.createPresent(factory.createString('my result')));

            expect(value.getType()).to.equal('future');
        });

        it('should return "future" when the future is still pending', function () {
            createValue(futureFactory.createFuture(function () {/* Never resolved */}));

            expect(value.getType()).to.equal('future');
        });
    });

    describe('increment()', function () {
        it('should be able to increment', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(21)));

            result = await value.increment().toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(22);
        });
    });

    describe('instantiate()', function () {
        it('should be able to instantiate the eventual resolved value', async function () {
            var argReference1 = sinon.createStubInstance(Reference),
                argReference2 = sinon.createStubInstance(Reference),
                instantiatedInstance = sinon.createStubInstance(ObjectValue),
                resolvedValue = sinon.createStubInstance(Value);
            resolvedValue.instantiate
                .withArgs([sinon.match.same(argReference1), sinon.match.same(argReference2)])
                .returns(instantiatedInstance);
            createValue(futureFactory.createPresent(resolvedValue));

            expect(await value.instantiate([argReference1, argReference2]).toPromise())
                .to.equal(instantiatedInstance);
        });
    });

    describe('isCallable()', function () {
        it('should return true when the eventual value is callable', async function () {
            var eventualValue = sinon.createStubInstance(Value);
            eventualValue.isCallable.returns(futureFactory.createPresent(true));
            createValue(futureFactory.createPresent(eventualValue));

            expect(await value.isCallable().toPromise()).to.be.true;
        });

        it('should return false when the eventual value is not callable', async function () {
            var eventualValue = sinon.createStubInstance(Value);
            eventualValue.isCallable.returns(futureFactory.createPresent(false));
            createValue(futureFactory.createPresent(eventualValue));

            expect(await value.isCallable().toPromise()).to.be.false;
        });
    });

    describe('isCompleted()', function () {
        var future;

        beforeEach(function () {
            future = sinon.createStubInstance(Future);
            createValue(future);
        });

        it('should return true when the wrapped Future is completed', function () {
            future.isCompleted.returns(true);

            expect(value.isCompleted()).to.be.true;
        });

        it('should return false when the wrapped Future is incomplete', function () {
            future.isCompleted.returns(false);

            expect(value.isCompleted()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true when the eventual value is empty', async function () {
            var eventualValue = sinon.createStubInstance(Value);
            eventualValue.isEmpty.returns(futureFactory.createPresent(true));
            createValue(futureFactory.createPresent(eventualValue));

            expect(await value.isEmpty().toPromise()).to.be.true;
        });

        it('should return false when the eventual value is not empty', async function () {
            var eventualValue = sinon.createStubInstance(Value);
            eventualValue.isEmpty.returns(futureFactory.createPresent(false));
            createValue(futureFactory.createPresent(eventualValue));

            expect(await value.isEmpty().toPromise()).to.be.false;
        });
    });

    describe('isEqualTo()', function () {
        it('should be able to compare a StringValue and FloatValue', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createString('12.345')));

            result = await value.isEqualTo(factory.createFloat(12.345)).toPromise();

            expect(result.getType()).to.equal('boolean');
            expect(result.getNative()).to.be.true;
        });
    });

    describe('isFuture()', function () {
        it('should return true', function () {
            createValue(futureFactory.createPresent(factory.createString('my value')));

            expect(value.isFuture()).to.be.true;
        });
    });

    describe('isPending()', function () {
        var future;

        beforeEach(function () {
            future = sinon.createStubInstance(Future);
            createValue(future);
        });

        it('should return true when the wrapped Future is incomplete', function () {
            future.isCompleted.returns(false);

            expect(value.isPending()).to.be.true;
        });

        it('should return false when the wrapped Future is completed', function () {
            future.isCompleted.returns(true);

            expect(value.isPending()).to.be.false;
        });
    });

    describe('isReferenceable()', function () {
        it('should return false', function () {
            createValue(futureFactory.createPresent(factory.createString('my value')));

            expect(value.isReferenceable()).to.be.false;
        });
    });

    describe('isSet()', function () {
        it('should return true when the eventual value is set', async function () {
            var eventualValue = sinon.createStubInstance(Value);
            eventualValue.isSet.returns(futureFactory.createPresent(true));
            createValue(futureFactory.createPresent(eventualValue));

            expect(await value.isSet().toPromise()).to.be.true;
        });

        it('should return false when the eventual value is not set', async function () {
            var eventualValue = sinon.createStubInstance(Value);
            eventualValue.isSet.returns(futureFactory.createPresent(false));
            createValue(futureFactory.createPresent(eventualValue));

            expect(await value.isSet().toPromise()).to.be.false;
        });
    });

    describe('multiplyBy()', function () {
        it('should be able to multiply a FloatValue by an IntegerValue', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createFloat(20.5)));

            result = await value.multiplyBy(factory.createInteger(2)).toPromise();

            expect(result.getType()).to.equal('float');
            expect(result.getNative()).to.equal(41);
        });
    });

    describe('next()', function () {
        it('should ensure the resolved result is a Value', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(21)));
            value.next(function (resolvedValue) {
                return resolvedValue.getNative() * 2; // Return a native number to check that it is coerced.
            });

            result = await value.toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(42);
        });

        it('should not attempt to coerce a Sequence returned from the resume handler', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createString('initial value')));
            value.next(function () {
                // Return a Sequence to check that it is not coerced.
                return controlFactory.createSequence().resume(factory.createString('new value'));
            });

            result = await value.toPromise();

            expect(result.getType()).to.equal('string');
            expect(result.getNative()).to.equal('new value');
        });
    });

    describe('shiftLeft()', function () {
        it('should be able to shift left by an IntegerValue', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(2)));

            result = await value.shiftLeft(factory.createInteger(3)).toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(16);
        });
    });

    describe('shiftRight()', function () {
        it('should be able to shift right by an IntegerValue', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(16)));

            result = await value.shiftRight(factory.createInteger(2)).toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(4);
        });
    });

    describe('subtract()', function () {
        it('should be able to subtract an IntegerValue', async function () {
            var result;
            createValue(futureFactory.createPresent(factory.createInteger(21)));

            result = await value.subtract(factory.createInteger(10)).toPromise();

            expect(result.getType()).to.equal('int');
            expect(result.getNative()).to.equal(11);
        });
    });

    describe('toPromise()', function () {
        it('should return a Promise that will be resolved if this future is', async function () {
            var doResolve;
            createValue(futureFactory.createFuture(function (resolve) {
                doResolve = resolve;
            }));
            doResolve(21);

            expect((await value.toPromise()).getNative()).to.equal(21);
        });

        it('should return a Promise that will be rejected if this future is', async function () {
            var doReject;
            createValue(futureFactory.createFuture(function (resolve, reject) {
                doReject = reject;
            }));
            doReject(new Error('Bang!'));

            return expect(value.toPromise()).to.eventually.be.rejectedWith('Bang!');
        });
    });

    describe('yield()', function () {
        it('should return the resolution value of the future if it has been resolved', function () {
            createValue(futureFactory.createPresent(factory.createInteger(21)));

            expect(value.yield().getNative()).to.equal(21);
        });

        it('should throw the rejection error of the future if it has been rejected', function () {
            createValue(futureFactory.createRejection(new Error('Bang!')));

            expect(function () {
                value.yield();
            }).to.throw('Bang!');
        });

        it('should raise a Pause error if the future is pending', function () {
            var caughtError = null;
            createValue(futureFactory.createFuture(function () {/* Neither resolved nor rejected */}));

            try {
                value.yield();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).to.be.an.instanceOf(Pause);
        });
    });

    describe('yieldSync()', function () {
        it('should return the resolution value of the future if it has been resolved', function () {
            createValue(futureFactory.createPresent(factory.createInteger(21)));

            expect(value.yieldSync().getNative()).to.equal(21);
        });

        it('should throw the rejection error of the future if it has been rejected', function () {
            createValue(futureFactory.createRejection(new Error('Bang!')));

            expect(function () {
                value.yieldSync();
            }).to.throw('Bang!');
        });

        it('should raise an exception if the future is pending', function () {
            createValue(futureFactory.createFuture(function () {/* Neither resolved nor rejected */}));

            expect(function () {
                value.yieldSync();
            }).to.throw(Exception, 'Cannot synchronously yield a pending Future');
        });
    });
});
