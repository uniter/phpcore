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
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    Reference = require('../../../src/Reference/Reference'),
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot'),
    StaticPropertyReference = require('../../../src/Reference/StaticProperty');

describe('StaticPropertyReference', function () {
    var callStack,
        classObject,
        flow,
        futureFactory,
        propertyValue,
        property,
        state,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();
        classObject = sinon.createStubInstance(Class);
        propertyValue = valueFactory.createString('the value of my property');

        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        classObject.getName.returns('My\\Namespaced\\ClassName');

        property = new StaticPropertyReference(
            valueFactory,
            state.getReferenceFactory(),
            futureFactory,
            callStack,
            flow,
            classObject,
            'myProp',
            'protected'
        );

        // At runtime this is done lazily, see Class.getStaticPropertyByName(...).
        property.setValue(propertyValue);
    });

    describe('asArrayElement()', function () {
        it('should return the value of the property', function () {
            property.setValue(propertyValue);

            expect(property.asArrayElement()).to.equal(propertyValue);
        });
    });

    describe('asEventualNative()', function () {
        it('should return a Future that resolves to the native value of the property', async function () {
            property.setValue(propertyValue);

            expect(await property.asEventualNative().toPromise()).to.equal('the value of my property');
        });
    });

    describe('asValue()', function () {
        it('should return the value of the property', function () {
            var value = valueFactory.createString('my value');
            property.setValue(value);

            expect(property.asValue()).to.equal(value);
        });

        it('should return a rejected Future when a reference assigned raises an error', async function () {
            var reference = sinon.createStubInstance(Reference);
            reference.getValue.throws(new Error('Bang!'));
            property.setReference(reference);

            await expect(property.asValue().toPromise()).to.eventually.be.rejectedWith('Bang!');
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the property\'s value', function () {
            expect(property.getNative()).to.equal('the value of my property');
        });
    });

    describe('getReference()', function () {
        it('should return the existing reference if the property already has one assigned (may not be a ReferenceSlot)', function () {
            var reference = sinon.createStubInstance(Reference);
            property.setReference(reference);

            expect(property.getReference()).to.equal(reference);
        });

        it('should return the existing reference on subsequent calls (ensure no ReferenceSlot is created)', function () {
            var reference = sinon.createStubInstance(Reference);
            property.setReference(reference);

            property.getReference(); // First call
            expect(property.getReference()).to.equal(reference);
        });

        it('should assign a ReferenceSlot to the property if it was undefined', function () {
            var referenceSlot = property.getReference();

            expect(referenceSlot).to.be.an.instanceOf(ReferenceSlot);
        });

        it('should return the same ReferenceSlot on subsequent calls', function () {
            var referenceSlot = property.getReference();

            expect(property.getReference()).to.equal(referenceSlot); // Call again
        });

        it('should assign any existing value of the property to the new ReferenceSlot', function () {
            var existingValue = valueFactory.createString('my existing value'),
                referenceSlot;
            property.setValue(existingValue);

            referenceSlot = property.getReference();

            expect(referenceSlot.getValue()).to.equal(existingValue);
        });

        it('should subsequently inherit its value from future values of the ReferenceSlot', function () {
            var referenceSlot = property.getReference(),
                value = valueFactory.createString('my new value');
            referenceSlot.setValue(value);

            expect(property.getValue()).to.equal(value);
        });
    });

    describe('getValueOrNativeNull()', function () {
        it('should return the value when the property is defined with a value', function () {
            var value = valueFactory.createString('my value');
            property.setValue(value);

            expect(property.getValueOrNativeNull()).to.equal(value);
        });

        // StaticProperties are always defined, so native null should never be returned.
    });

    describe('getValueOrNull()', function () {
        it('should return the value when the property is defined with a value', function () {
            var value = valueFactory.createString('my value');
            property.setValue(value);

            expect(property.getValueOrNull()).to.equal(value);
        });

        it('should return the value of the reference when the property is defined with a reference', function () {
            var reference = sinon.createStubInstance(Reference),
                value = valueFactory.createString('my val from reference');
            reference.getValue.returns(value);
            property.setReference(reference);

            expect(property.getValueOrNull()).to.equal(value);
        });
    });

    describe('hasReferenceSetter()', function () {
        it('should return false', function () {
            expect(property.hasReferenceSetter()).to.be.false;
        });
    });

    describe('isDefined()', function () {
        it('should return true', function () {
            expect(property.isDefined()).to.be.true;
        });
    });

    describe('isEmpty()', function () {
        it('should return true when the property has an empty value', async function () {
            propertyValue = valueFactory.createString('');
            property.setValue(propertyValue);

            expect(await property.isEmpty().toPromise()).to.be.true;
        });

        it('should return false when the property has a non-empty value', async function () {
            expect(await property.isEmpty().toPromise()).to.be.false;
        });
    });

    describe('isFuture()', function () {
        it('should return false', function () {
            expect(property.isFuture()).to.be.false;
        });
    });

    describe('isReference()', function () {
        it('should return true when a reference has been assigned', function () {
            var reference = sinon.createStubInstance(Reference);
            property.setReference(reference);

            expect(property.isReference()).to.be.true;
        });

        it('should return false when a value has been assigned', function () {
            property.setValue(valueFactory.createString('my value'));

            expect(property.isReference()).to.be.false;
        });
    });

    describe('isReferenceable()', function () {
        it('should return true', function () {
            expect(property.isReferenceable()).to.be.true;
        });
    });

    describe('isSet()', function () {
        it('should return true when the property is set to a non-null value', async function () {
            expect(await property.isSet().toPromise()).to.be.true;
        });

        it('should return false when the property is set to a null value', async function () {
            propertyValue = valueFactory.createNull();
            property.setValue(propertyValue);

            expect(await property.isSet().toPromise()).to.be.false;
        });
    });

    describe('setValue()', function () {
        it('should return the value assigned when the property is not defined with a reference', async function () {
            var value = valueFactory.createString('my value'),
                resultValue = await property.setValue(value).toPromise();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('my value');
        });

        it('should return the value assigned when the property is defined with a reference', async function () {
            var reference = sinon.createStubInstance(Reference),
                resultValue,
                value = valueFactory.createString('my val for reference');
            reference.setValue.returns(value);
            property.setReference(reference);

            resultValue = await property.setValue(value).toPromise();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('my val for reference');
            expect(reference.setValue).to.have.been.calledOnce;
            expect(reference.setValue).to.have.been.calledWith(sinon.match.same(value));
        });
    });

    describe('toPromise()', function () {
        it('should return a Promise that resolves to the StaticPropertyReference', async function () {
            expect(await property.toPromise()).to.equal(property);
        });
    });

    describe('unset()', function () {
        it('should throw a fatal error as static properties cannot be unset', function () {
            expect(function () {
                property.unset();
            }).to.throw(
                'Fake PHP Fatal error for #core.cannot_unset_static_property with {"className":"My\\\\Namespaced\\\\ClassName","propertyName":"myProp"}'
            );
        });
    });

    describe('yieldSync()', function () {
        it('should just return the property', function () {
            expect(property.yieldSync()).to.equal(property);
        });
    });
});
