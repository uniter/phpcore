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
    sinon = require('sinon'),
    tools = require('../tools'),
    Call = require('../../../src/Call'),
    Class = require('../../../src/Class').sync(),
    GeneratorIterator = require('../../../src/Iterator/GeneratorIterator');

describe('GeneratorIterator', function () {
    var call,
        callStack,
        flow,
        func,
        futureFactory,
        iterator,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        call = sinon.createStubInstance(Call);
        callStack = state.getCallStack();
        flow = state.getFlow();
        func = sinon.stub();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        iterator = new GeneratorIterator(
            valueFactory,
            futureFactory,
            callStack,
            flow,
            call,
            func
        );
    });

    describe('advance()', function () {
        it('should start the generator if needed', async function () {
            var yieldedValue;
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my value'))
                    .yield();
            });

            await iterator.advance(valueFactory).toPromise();

            yieldedValue = iterator.getCurrentElementValue();
            expect(yieldedValue.getType()).to.equal('string');
            expect(yieldedValue.getNative()).to.equal('my value');
        });
    });

    describe('getCurrentElementValue()', function () {
        it('should return NullValue when the generator has finished', async function () {
            await iterator.advance().toPromise();

            expect((await iterator.getCurrentElementValue().toPromise()).getNative()).to.be.null;
        });

        it('should return the last yielded value when there was one', async function () {
            var yieldedValue = valueFactory.createString('my value');
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(null, yieldedValue)
                    .yield();
            });
            await iterator.advance().toPromise();

            expect(await iterator.getCurrentElementValue().toPromise()).to.equal(yieldedValue);
        });

        it('should start the generator if needed and return the next yielded value', async function () {
            var yieldedValue = valueFactory.createString('my value');
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(null, yieldedValue)
                    .yield();
            });
            // Note that there is no initial .advance() call.

            expect(await iterator.getCurrentElementValue().toPromise()).to.equal(yieldedValue);
        });
    });

    describe('getCurrentKey()', function () {
        it('should return NullValue when the generator has finished', async function () {
            await iterator.advance().toPromise();

            expect((await iterator.getCurrentKey().toPromise()).getNative()).to.be.null;
        });

        it('should return the last yielded key when there was one', async function () {
            var yieldedKey = valueFactory.createString('my key');
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(yieldedKey, valueFactory.createString('my value'))
                    .yield();
            });
            await iterator.advance().toPromise();

            expect(await iterator.getCurrentKey().toPromise()).to.equal(yieldedKey);
        });

        it('should start the generator if needed and return the next yielded key', async function () {
            var yieldedKey = valueFactory.createString('my key');
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(yieldedKey, valueFactory.createString('my value'))
                    .yield();
            });
            // Note that there is no initial .advance() call.

            expect(await iterator.getCurrentKey().toPromise()).to.equal(yieldedKey);
        });
    });

    describe('getFunctionCall()', function () {
        it('should return the Call for this generator', function () {
            expect(iterator.getFunctionCall()).to.equal(call);
        });
    });

    describe('getInnerFunction()', function () {
        it('should return the inner function for this generator', function () {
            expect(iterator.getInnerFunction()).to.equal(func);
        });
    });

    describe('getReturnValue()', function () {
        it('should return the return value', async function () {
            var returnValue = valueFactory.createString('my result');
            func.onFirstCall().callsFake(function () {
                return returnValue;
            });
            await iterator.advance().toPromise();

            expect(await iterator.getReturnValue().toPromise()).to.equal(returnValue);
        });

        it('should throw when the generator has not finished', async function () {
            var caughtErrorValue = null,
                returnValue = valueFactory.createString('my result');
            func.onFirstCall().callsFake(function () {
                return returnValue;
            });

            try {
                await iterator.getReturnValue().toPromise();
            } catch (error) {
                caughtErrorValue = error;
            }

            expect(caughtErrorValue).not.to.be.null;
            expect(caughtErrorValue.getType()).to.equal('object');
            expect(caughtErrorValue.getClassName()).to.equal('Exception');
            expect(caughtErrorValue.getProperty('message').getNative())
                .to.equal('Cannot get return value of a generator that hasn\'t returned');
        });
    });

    describe('hasReturned()', function () {
        it('should return true when the generator has returned', async function () {
            func.onFirstCall().callsFake(function () {
                return valueFactory.createString('my result');
            });
            await iterator.advance().toPromise();

            expect(iterator.hasReturned()).to.be.true;
        });

        it('should return false when the generator has not started', async function () {
            func.onFirstCall().callsFake(function () {
                return valueFactory.createString('my result');
            });
            // Note that there is no initial .advance() call.

            expect(iterator.hasReturned()).to.be.false;
        });

        it('should return true when the generator has yielded', async function () {
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my value'))
                    .yield();
            });
            await iterator.advance().toPromise();

            expect(iterator.hasReturned()).to.be.false;
        });
    });

    describe('hasYielded()', function () {
        it('should return true when the generator has yielded', async function () {
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my value'))
                    .yield();
            });
            await iterator.advance().toPromise();

            expect(iterator.hasYielded()).to.be.true;
        });

        it('should return false when the generator has not started', async function () {
            func.onFirstCall().callsFake(function () {
                return valueFactory.createString('my result');
            });

            expect(iterator.hasYielded()).to.be.false;
        });
    });

    describe('isNotFinished()', function () {
        it('should return true when the iterator has not yet started', async function () {
            expect(iterator.isNotFinished()).to.be.true;
        });

        it('should return true when the iterator has started but not yet reached the end', async function () {
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my value'))
                    .yield();
            });
            await iterator.advance().toPromise();

            expect(iterator.isNotFinished()).to.be.true;
        });

        it('should return false when the iterator has reached the end', async function () {
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my value'))
                    .yield();
            });
            await iterator.advance().toPromise();
            await iterator.advance().toPromise();

            expect(iterator.isNotFinished()).to.be.false;
        });

        it('should return false when the iterator has returned a value', async function () {
            func.onFirstCall().callsFake(function () {
                return valueFactory.createString('my result');
            });
            await iterator.advance().toPromise();

            expect(iterator.isNotFinished()).to.be.false;
        });

        it('should return false when the iterator has thrown', async function () {
            var caughtObjectValue,
                classObject = sinon.createStubInstance(Class),
                throwableObjectValue = valueFactory.createObject({}, classObject);
            func.onFirstCall().callsFake(function () {
                throw throwableObjectValue;
            });
            try {
                await iterator.advance().toPromise();
            } catch (error) {
                caughtObjectValue = error;
            }

            expect(iterator.isNotFinished()).to.be.false;
            expect(caughtObjectValue).to.equal(throwableObjectValue);
        });
    });

    describe('send()', function () {
        it('should return the yielded value', async function () {
            var yieldedValue;
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my first value'))
                    .yield();
            });
            func.onSecondCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my second value'))
                    .yield();
            });
            await iterator.advance().toPromise();

            yieldedValue = await iterator.send(valueFactory).toPromise();

            expect(yieldedValue.getType()).to.equal('string');
            expect(yieldedValue.getNative()).to.equal('my second value');
        });

        it('should start the generator if needed', async function () {
            var yieldedValue;
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my value'))
                    .yield();
            });

            yieldedValue = await iterator.send(valueFactory).toPromise();

            expect(yieldedValue.getType()).to.equal('string');
            expect(yieldedValue.getNative()).to.equal('my value');
        });
    });

    describe('throwInto()', function () {
        it('should return the yielded value', async function () {
            var classObject = sinon.createStubInstance(Class),
                throwableObjectValue = valueFactory.createObject({}, classObject),
                yieldedValue;
            classObject.is
                .withArgs('Throwable')
                .returns(true);
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my first value'))
                    .yield();
            });
            func.onSecondCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my second value'))
                    .yield();
            });
            await iterator.advance().toPromise();

            yieldedValue = await iterator.throwInto(throwableObjectValue).toPromise();

            expect(yieldedValue.getType()).to.equal('string');
            expect(yieldedValue.getNative()).to.equal('my second value');
            expect(call.throwInto).to.have.been.calledOnce;
            expect(call.throwInto).to.have.been.calledWith(sinon.match.same(throwableObjectValue));
        });
    });

    describe('yieldValue()', function () {
        it('should yield the given key as well as value', async function () {
            var yieldedKey = valueFactory.createString('my key'),
                yieldedValue = valueFactory.createString('my value');

            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(yieldedKey, yieldedValue)
                    .yield();
            });
            await iterator.advance().toPromise();

            expect(await iterator.getCurrentKey().toPromise()).to.equal(yieldedKey);
            expect(await iterator.getCurrentElementValue().toPromise()).to.equal(yieldedValue);
        });

        it('should yield a key of 0 if no key is given and it is the first yield', async function () {
            var yieldedKey;
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my value'))
                    .yield();
            });
            await iterator.advance().toPromise();

            yieldedKey = await iterator.getCurrentKey().toPromise();

            expect(yieldedKey.getType()).to.equal('int');
            expect(yieldedKey.getNative()).to.equal(0);
        });

        it('should yield a key of 1 if no keys are given and it is the second yield', async function () {
            var yieldedKey;
            func.onFirstCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my first value'))
                    .yield();
            });
            func.onSecondCall().callsFake(function () {
                iterator.yieldValue(null, valueFactory.createString('my second value'))
                    .yield();
            });
            await iterator.advance().toPromise();
            await iterator.advance().toPromise();

            yieldedKey = await iterator.getCurrentKey().toPromise();

            expect(yieldedKey.getType()).to.equal('int');
            expect(yieldedKey.getNative()).to.equal(1);
        });
    });
});
