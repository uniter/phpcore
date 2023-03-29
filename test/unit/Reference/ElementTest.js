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
    ElementReference = require('../../../src/Reference/Element'),
    KeyReferencePair = require('../../../src/KeyReferencePair'),
    KeyValuePair = require('../../../src/KeyValuePair'),
    PHPError = phpCommon.PHPError,
    Reference = require('../../../src/Reference/Reference'),
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot'),
    Value = require('../../../src/Value').sync(),
    Variable = require('../../../src/Variable').sync();

describe('ElementReference', function () {
    var arrayValue,
        callStack,
        element,
        flow,
        futureFactory,
        keyValue,
        referenceFactory,
        state,
        value,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState(null, {
            'call_stack': callStack
        });
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();
        arrayValue = sinon.createStubInstance(ArrayValue);
        keyValue = valueFactory.createString('my_element');
        referenceFactory = state.getReferenceFactory();
        value = sinon.createStubInstance(Value);

        arrayValue.referToElement
            .withArgs('my_element')
            .returns('offset: my_element');

        value.formatAsString.returns('\'the value of my...\'');
        value.asEventualNative.returns(futureFactory.createPresent('the value of my element'));
        value.getForAssignment.returns(value);
        value.getNative.returns('the value of my element');
        value.getType.returns('string');
        value.next.callsArgWith(0, value);
        value.toPromise.returns(Promise.resolve(value));

        element = new ElementReference(
            valueFactory,
            referenceFactory,
            futureFactory,
            callStack,
            flow,
            arrayValue,
            keyValue,
            value,
            null
        );
    });

    describe('asArrayElement()', function () {
        it('should return the element\'s value', function () {
            expect(element.asArrayElement()).to.equal(value);
        });
    });

    describe('asEventualNative()', function () {
        it('should return a Future that resolves to the native value of the element', async function () {
            expect(await element.asEventualNative().toPromise()).to.equal('the value of my element');
        });
    });

    describe('asValue()', function () {
        it('should return the value when the element is defined with a value', function () {
            var value = valueFactory.createString('my value');
            element.setValue(value);

            expect(element.asValue()).to.equal(value);
        });

        it('should return the value of the reference when the element is defined with a reference', function () {
            var reference = sinon.createStubInstance(Reference),
                value = valueFactory.createString('my val from reference');
            reference.getValue.returns(value);
            element.setReference(reference);

            expect(element.asValue()).to.equal(value);
        });

        it('should return a NullValue when the element is not defined', function () {
            element.unset();

            expect(element.asValue().getType()).to.equal('null');
        });

        it('should return a rejected Future when a reference assigned raises an error', async function () {
            var reference = sinon.createStubInstance(Reference);
            reference.getValue.throws(new Error('Bang!'));
            element.setReference(reference);

            await expect(element.asValue().toPromise()).to.eventually.be.rejectedWith('Bang!');
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the element\'s value', function () {
            element.setValue(valueFactory.createString('my native value'));

            expect(element.getNative()).to.equal('my native value');
        });
    });

    describe('getPairForAssignment()', function () {
        it('should return a KeyValuePair when the element has a value, with value fetched for assignment', function () {
            var pair,
                valueForAssignment = sinon.createStubInstance(Value);
            value.getForAssignment.returns(valueForAssignment);

            pair = element.getPairForAssignment();

            expect(pair).to.be.an.instanceOf(KeyValuePair);
            expect(pair.getKey()).to.equal(keyValue);
            expect(pair.getValue()).to.equal(valueForAssignment);
        });

        it('should return a KeyReferencePair when the element is a reference', function () {
            var pair,
                reference = sinon.createStubInstance(Reference);
            element.setReference(reference);

            pair = element.getPairForAssignment();

            expect(pair).to.be.an.instanceOf(KeyReferencePair);
            expect(pair.getKey()).to.equal(keyValue);
            expect(pair.getReference()).to.equal(reference);
        });

        it('should allow the key to be overridden when specified', function () {
            var overrideKey = valueFactory.createInteger(21),
                pair = element.getPairForAssignment(overrideKey);

            expect(pair).to.be.an.instanceOf(KeyValuePair);
            expect(pair.getKey()).to.equal(overrideKey);
            expect(pair.getValue()).to.equal(value);
        });

        it('should throw an error when the element is not defined', function () {
            expect(function () {
                var element = new ElementReference(
                    valueFactory,
                    referenceFactory,
                    futureFactory,
                    callStack,
                    flow,
                    arrayValue,
                    keyValue
                );

                element.getPairForAssignment();
            }).to.throw('Element is not defined');
        });
    });

    describe('getReference()', function () {
        it('should return the existing reference if the element already has one assigned (may not be a ReferenceSlot)', function () {
            var reference = sinon.createStubInstance(Reference);
            element.setReference(reference);

            expect(element.getReference()).to.equal(reference);
        });

        it('should return the existing reference on subsequent calls (ensure no ReferenceSlot is created)', function () {
            var reference = sinon.createStubInstance(Reference);
            element.setReference(reference);

            element.getReference(); // First call
            expect(element.getReference()).to.equal(reference);
        });

        it('should assign a ReferenceSlot to the element if it was undefined', function () {
            var referenceSlot = element.getReference();

            expect(referenceSlot).to.be.an.instanceOf(ReferenceSlot);
        });

        it('should return the same ReferenceSlot on subsequent calls', function () {
            var referenceSlot = element.getReference();

            expect(element.getReference()).to.equal(referenceSlot); // Call again
        });

        it('should assign any existing value of the element to the new ReferenceSlot', function () {
            var existingValue = valueFactory.createString('my existing value'),
                referenceSlot;
            element.setValue(existingValue);

            referenceSlot = element.getReference();

            expect(referenceSlot.getValue()).to.equal(existingValue);
        });

        it('should subsequently inherit its value from future values of the ReferenceSlot', function () {
            var referenceSlot = element.getReference(),
                value = valueFactory.createString('my new value');
            referenceSlot.setValue(value);

            expect(element.getValue()).to.equal(value);
        });
    });

    describe('getValueOrNativeNull()', function () {
        it('should return the value when the element is defined with a value', function () {
            var value = valueFactory.createString('my value');
            element.setValue(value);

            expect(element.getValueOrNativeNull()).to.equal(value);
        });

        it('should return the value of the reference when the element is defined with a reference', function () {
            var reference = sinon.createStubInstance(Reference),
                value = valueFactory.createString('my val from reference');
            reference.getValue.returns(value);
            element.setReference(reference);

            expect(element.getValueOrNativeNull()).to.equal(value);
        });

        it('should return native null when the element is not defined', function () {
            element.unset();

            expect(element.getValueOrNativeNull()).to.be.null;
        });
    });

    describe('getValueOrNull()', function () {
        it('should return the value when the element is defined with a value', function () {
            var value = valueFactory.createString('my value');
            element.setValue(value);

            expect(element.getValueOrNull()).to.equal(value);
        });

        it('should return the value of the reference when the element is defined with a reference', function () {
            var reference = sinon.createStubInstance(Reference),
                value = valueFactory.createString('my val from reference');
            reference.getValue.returns(value);
            element.setReference(reference);

            expect(element.getValueOrNull()).to.equal(value);
        });

        it('should return a NullValue when the element is not defined', function () {
            element.unset();

            expect(element.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('getValueReference()', function () {
        it('should return the value when the element has a value', function () {
            expect(element.getValueReference()).to.equal(value);
        });

        it('should return a KeyReferencePair when the element is a reference', function () {
            var reference = sinon.createStubInstance(Reference);
            element.setReference(reference);

            expect(element.getValueReference()).to.equal(reference);
        });

        it('should return null when the element is not defined', function () {
            var element = new ElementReference(
                valueFactory,
                referenceFactory,
                futureFactory,
                callStack,
                flow,
                arrayValue,
                keyValue
            );

            expect(element.getValueReference()).to.be.null;
        });
    });

    describe('hasReferenceSetter()', function () {
        it('should return false', function () {
            expect(element.hasReferenceSetter()).to.be.false;
        });
    });

    describe('isDefined()', function () {
        it('should return false for an unset element', function () {
            element.unset();

            expect(element.isDefined()).to.be.false;
        });

        it('should return true when the element has a value that is empty', function () {
            value.isEmpty.returns(true);

            expect(element.isDefined()).to.be.true;
        });

        it('should return true when the element has a value that is not empty', function () {
            value.isEmpty.returns(false);

            expect(element.isDefined()).to.be.true;
        });

        it('should return true when the element has a reference to a value that is empty', function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(value);
            value.isEmpty.returns(true);
            element.setReference(reference);

            expect(element.isDefined()).to.be.true;
        });

        it('should return true when the element has a reference to a value that is not empty', function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(value);
            value.isEmpty.returns(false);
            element.setReference(reference);

            expect(element.isDefined()).to.be.true;
        });
    });

    describe('isEmpty()', function () {
        it('should return true for an unset element', async function () {
            element.unset();

            expect(await element.isEmpty().toPromise()).to.be.true;
        });

        it('should return true when the element has a value that is empty', async function () {
            value.isEmpty.returns(futureFactory.createPresent(true));

            expect(await element.isEmpty().toPromise()).to.be.true;
        });

        it('should return false when the element has a value that is not empty', async function () {
            value.isEmpty.returns(futureFactory.createPresent(false));

            expect(await element.isEmpty().toPromise()).to.be.false;
        });

        it('should return true when the element has a reference to a value that is empty', async function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(value);
            value.isEmpty.returns(futureFactory.createPresent(true));
            element.setReference(reference);

            expect(await element.isEmpty().toPromise()).to.be.true;
        });

        it('should return false when the element has a reference to a value that is not empty', async function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(value);
            value.isEmpty.returns(futureFactory.createPresent(false));
            element.setReference(reference);

            expect(await element.isEmpty().toPromise()).to.be.false;
        });
    });

    describe('isFuture()', function () {
        it('should return false', function () {
            expect(element.isFuture()).to.be.false;
        });
    });

    describe('isReference()', function () {
        it('should return true when a reference has been assigned', function () {
            var reference = sinon.createStubInstance(Reference);
            element.setReference(reference);

            expect(element.isReference()).to.be.true;
        });

        it('should return false when a value has been assigned', function () {
            element.setValue(valueFactory.createString('my value'));

            expect(element.isReference()).to.be.false;
        });

        it('should return false when the element is undefined', function () {
            expect(element.isReference()).to.be.false;
        });
    });

    describe('isReferenceable()', function () {
        it('should return true', function () {
            expect(element.isReferenceable()).to.be.true;
        });
    });

    describe('isSet()', function () {
        it('should return true if the element\'s value is set', async function () {
            value.isSet.returns(futureFactory.createPresent(true));

            expect(await element.isSet().toPromise()).to.be.true;
        });

        it('should return false if the element\'s value is not set', async function () {
            value.isSet.returns(futureFactory.createPresent(false));

            expect(await element.isSet().toPromise()).to.be.false;
        });
    });

    describe('raiseUndefined()', function () {
        it('should raise the correct E_NOTICE', function () {
            element.raiseUndefined();

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Undefined offset: my_element'
            );
        });

        it('should return null', function () {
            expect(element.raiseUndefined().getNative()).to.be.null;
        });
    });

    describe('setKey()', function () {
        it('should change the key of the element when an integer is given (indexed element)', function () {
            element.setKey(valueFactory.createInteger(21));

            expect(element.getKey().getNative()).to.equal(21);
        });

        it('should change the key of the element when a string is given (associative element)', function () {
            element.setKey(valueFactory.createString('my_key'));

            expect(element.getKey().getNative()).to.equal('my_key');
        });
    });

    describe('setReference()', function () {
        it('should define the element in its array', function () {
            var reference = sinon.createStubInstance(Variable);

            element.setReference(reference);

            expect(arrayValue.defineElement).to.have.been.calledOnce;
            expect(arrayValue.defineElement).to.have.been.calledWith(sinon.match.same(element));
        });

        it('should return the element reference', function () {
            var reference = sinon.createStubInstance(Variable);

            expect(element.setReference(reference)).to.equal(reference);
        });
    });

    describe('setValue()', function () {
        describe('when the element is not a reference', function () {
            it('should define the element in its array', async function () {
                var newValue = valueFactory.createString('my new value');

                await element.setValue(newValue).toPromise();

                expect(arrayValue.defineElement).to.have.been.calledOnce;
                expect(arrayValue.defineElement).to.have.been.calledWith(sinon.match.same(element));
            });

            it('should return the value assigned', async function () {
                var newValue = valueFactory.createString('my new value'),
                    resultValue = await element.setValue(newValue).toPromise();

                expect(resultValue.getType()).to.equal('string');
                expect(resultValue.getNative()).to.equal('my new value');
            });
        });

        describe('when the element is a reference', function () {
            var reference;

            beforeEach(function () {
                reference = sinon.createStubInstance(Variable);
                element.setReference(reference);
            });

            it('should define the element in its array', async function () {
                var newValue = valueFactory.createString('my new value');

                await element.setValue(newValue).toPromise();

                expect(arrayValue.defineElement).to.have.been.calledOnce;
                expect(arrayValue.defineElement).to.have.been.calledWith(sinon.match.same(element));
            });

            it('should return the value assigned', async function () {
                var newValue = valueFactory.createString('my new value'),
                    resultValue,
                    setValue = valueFactory.createString('my set value');
                reference.setValue
                    .withArgs(sinon.match.same(newValue))
                    .returns(setValue);

                resultValue = await element.setValue(newValue).toPromise();

                expect(resultValue.getType()).to.equal('string');
                expect(resultValue.getNative()).to.equal('my set value');
            });
        });

        describe('when this element is the first one to be defined', function () {
            beforeEach(function () {
                arrayValue.getLength.returns(0);
            });

            it('should change the array pointer to point to this element', async function () {
                var newValue = valueFactory.createString('my new value');

                await element.setValue(newValue).toPromise();

                expect(arrayValue.pointToElement).to.have.been.calledOnce;
                expect(arrayValue.pointToElement).to.have.been.calledWith(sinon.match.same(element));
            });
        });

        describe('when this element is the second one to be defined', function () {
            beforeEach(function () {
                arrayValue.getLength.returns(1);
            });

            it('should not change the array pointer', async function () {
                var newValue = valueFactory.createString('my new value');

                await element.setValue(newValue).toPromise();

                expect(arrayValue.pointToElement).not.to.have.been.called;
            });
        });
    });

    describe('toPromise()', function () {
        it('should return a Promise that resolves to the ElementReference', async function () {
            expect(await element.toPromise()).to.equal(element);
        });
    });

    describe('unset()', function () {
        it('should leave the element no longer set', async function () {
            element.unset();

            expect(await element.isSet().toPromise()).to.be.false;
        });

        it('should return a Future that resolves to null', async function () {
            expect(await element.unset().toPromise()).to.be.null;
        });
    });

    describe('yieldSync()', function () {
        it('should just return the element', function () {
            expect(element.yieldSync()).to.equal(element);
        });
    });
});
