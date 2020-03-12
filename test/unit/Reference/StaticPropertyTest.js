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
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    Reference = require('../../../src/Reference/Reference'),
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot'),
    StaticPropertyReference = require('../../../src/Reference/StaticProperty'),
    StringValue = require('../../../src/Value/String').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('StaticPropertyReference', function () {
    var callStack,
        classObject,
        propertyValue,
        property,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        valueFactory = new ValueFactory();
        classObject = sinon.createStubInstance(Class);
        propertyValue = sinon.createStubInstance(StringValue);

        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        classObject.getName.returns('My\\Namespaced\\ClassName');

        propertyValue.formatAsString.returns('\'the value of my...\'');
        propertyValue.getNative.returns('the value of my property');
        propertyValue.getType.returns('string');

        property = new StaticPropertyReference(
            valueFactory,
            callStack,
            classObject,
            'myProp',
            'protected',
            propertyValue
        );
    });

    describe('concatWith()', function () {
        it('should append the given value to the property\'s value and assign it back to the property', function () {
            property.setValue(valueFactory.createString('value for my prop'));

            property.concatWith(valueFactory.createString(' with world on the end'));

            expect(property.getNative()).to.equal('value for my prop with world on the end');
        });
    });

    describe('decrementBy()', function () {
        it('should subtract the given value from the property\'s value and assign it back to the property', function () {
            property.setValue(valueFactory.createInteger(20));

            property.decrementBy(valueFactory.createInteger(4));

            expect(property.getNative()).to.equal(16);
        });
    });

    describe('divideBy()', function () {
        it('should divide the property\'s value by the given value and assign it back to the property', function () {
            property.setValue(valueFactory.createInteger(20));

            property.divideBy(valueFactory.createInteger(4));

            expect(property.getNative()).to.equal(5);
        });
    });

    describe('formatAsString()', function () {
        it('should return the correct string', function () {
            expect(property.formatAsString()).to.equal('\'the value of my...\'');
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

    describe('incrementBy()', function () {
        it('should add the given value to the property\'s value and assign it back to the property', function () {
            property.setValue(valueFactory.createInteger(20));

            property.incrementBy(valueFactory.createInteger(4));

            expect(property.getNative()).to.equal(24);
        });
    });

    describe('isDefined()', function () {
        it('should return true', function () {
            expect(property.isDefined()).to.be.true;
        });
    });

    describe('isEmpty()', function () {
        it('should return true when the property has an empty value', function () {
            propertyValue.isEmpty.returns(true);

            expect(property.isEmpty()).to.be.true;
        });

        it('should return false when the property has a non-empty value', function () {
            propertyValue.isEmpty.returns(false);

            expect(property.isEmpty()).to.be.false;
        });
    });

    describe('isSet()', function () {
        it('should return true when the property is set to a non-null value', function () {
            propertyValue.isSet.returns(true);

            expect(property.isSet()).to.be.true;
        });

        it('should return false when the property is set to a null value', function () {
            propertyValue.isSet.returns(false);

            expect(property.isSet()).to.be.false;
        });
    });

    describe('multiplyBy()', function () {
        it('should multiply the property\'s value by the given value and assign it back to the property', function () {
            property.setValue(valueFactory.createInteger(20));

            property.multiplyBy(valueFactory.createInteger(4));

            expect(property.getNative()).to.equal(80);
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
});
