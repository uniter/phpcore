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
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    PropertyReference = require('../../../src/Reference/Property'),
    MethodSpec = require('../../../src/MethodSpec'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    Reference = require('../../../src/Reference/Reference'),
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot'),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync(),
    Variable = require('../../../src/Variable').sync();

describe('PropertyReference', function () {
    var callStack,
        classObject,
        createProperty,
        keyValue,
        objectValue,
        property,
        propertyValue,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        classObject = sinon.createStubInstance(Class);
        valueFactory = new ValueFactory();
        propertyValue = sinon.createStubInstance(Value);
        objectValue = sinon.createStubInstance(ObjectValue);
        objectValue.isMethodDefined.returns(false);
        keyValue = sinon.createStubInstance(Value);

        classObject.getName.returns('My\\AwesomeClass');
        keyValue.getNative.returns('my_property');
        keyValue.getType.returns('string');
        propertyValue.formatAsString.returns('\'the value of my...\'');
        propertyValue.getForAssignment.returns(propertyValue);
        propertyValue.getNative.returns('value for my prop');
        propertyValue.getType.returns('string');

        createProperty = function (visibility) {
            property = new PropertyReference(
                valueFactory,
                callStack,
                objectValue,
                keyValue,
                classObject,
                visibility || 'public',
                21
            );
        };
        createProperty();
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
        it('should return "NULL" for an unset property', function () {
            expect(property.formatAsString()).to.equal('NULL');
        });

        it('should return the correct string when the property has a value that is empty', function () {
            propertyValue.isEmpty.returns(true);
            property.initialise(propertyValue);

            expect(property.formatAsString()).to.equal('\'the value of my...\'');
        });

        it('should return the correct string when the property has a value that is not empty', function () {
            propertyValue.isEmpty.returns(false);
            property.initialise(propertyValue);

            expect(property.formatAsString()).to.equal('\'the value of my...\'');
        });

        it('should return the correct string when the property has a reference to a value that is empty', function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(propertyValue);
            propertyValue.isEmpty.returns(true);
            property.setReference(reference);
            property.initialise(propertyValue);

            expect(property.formatAsString()).to.equal('\'the value of my...\'');
        });

        it('should return the correct string when the property has a reference to a value that is not empty', function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(propertyValue);
            propertyValue.isEmpty.returns(false);
            property.setReference(reference);
            property.initialise(propertyValue);

            expect(property.formatAsString()).to.equal('\'the value of my...\'');
        });
    });

    describe('getExternalName()', function () {
        it('should prefix a private property\'s name with its visibility', function () {
            createProperty('private');

            expect(property.getExternalName()).to.equal('\0My\\AwesomeClass\0my_property');
        });

        it('should prefix a protected property\'s name with an asterisk to indicate its visibility', function () {
            createProperty('protected');

            expect(property.getExternalName()).to.equal('\0*\0my_property');
        });

        it('should just return the name for a public property', function () {
            expect(property.getExternalName()).to.equal('my_property');
        });
    });

    describe('getIndex()', function () {
        it('should return the index of the property', function () {
            expect(property.getIndex()).to.equal(21);
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the property\'s value', function () {
            property.initialise(propertyValue);

            expect(property.getNative()).to.equal('value for my prop');
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

    describe('getValue()', function () {
        describe('when the property is defined', function () {
            it('should return the value assigned', function () {
                property.initialise(propertyValue);

                expect(property.getValue()).to.equal(propertyValue);
            });

            it('should return the value assigned, when the property is a reference', function () {
                var reference = sinon.createStubInstance(Variable),
                    value = valueFactory.createString('my current value');
                reference.getValue.returns(value);
                property.setReference(reference);

                expect(property.getValue()).to.equal(value);
            });
        });

        describe('when the property is not defined, but magic __get is', function () {
            beforeEach(function () {
                objectValue.isMethodDefined.withArgs('__get').returns(true);
            });

            it('should fetch the value via the magic getter', function () {
                var value = valueFactory.createString('my current value');
                objectValue.callMethod.withArgs('__get').returns(value);

                expect(property.getValue()).to.equal(value);
                expect(objectValue.callMethod).to.have.been.calledOnce;
                expect(objectValue.callMethod).to.have.been.calledWith(
                    '__get',
                    [sinon.match.same(keyValue)]
                );
            });
        });

        describe('when the property is not defined, and magic __get is not either', function () {
            beforeEach(function () {
                objectValue.referToElement.withArgs('my_property').returns('property: MyClass::$my_property');
            });

            it('should raise a notice', function () {
                property.getValue();

                expect(callStack.raiseError).to.have.been.calledOnce;
                expect(callStack.raiseError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'Undefined property: MyClass::$my_property'
                );
            });

            it('should return NULL', function () {
                expect(property.getValue().getType()).to.equal('null');
            });
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

        it('should return a NullValue when the property is not defined', function () {
            property.unset();

            expect(property.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('getVisibility()', function () {
        it('should return the visibility of the property when public', function () {
            expect(property.getVisibility()).to.equal('public');
        });

        it('should return the visibility of the property when protected', function () {
            createProperty('protected');

            expect(property.getVisibility()).to.equal('protected');
        });
    });

    describe('incrementBy()', function () {
        it('should add the given value to the property\'s value and assign it back to the property', function () {
            property.setValue(valueFactory.createInteger(20));

            property.incrementBy(valueFactory.createInteger(4));

            expect(property.getNative()).to.equal(24);
        });
    });

    describe('initialise()', function () {
        it('should set the value of the property', function () {
            property.initialise(propertyValue);

            expect(property.getValue()).to.equal(propertyValue);
        });
    });

    describe('isDefined()', function () {
        it('should return true when the property is assigned a non-NULL value', function () {
            property.initialise(propertyValue);

            expect(property.isDefined()).to.be.true;
        });

        it('should return true when the property is assigned a NULL value', function () {
            property.setValue(valueFactory.createNull());

            expect(property.isDefined()).to.be.true;
        });

        it('should return false when the property is not assigned a value', function () {
            keyValue.getNative.returns('not_my_property');

            expect(property.isDefined()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true when the property is not set', function () {
            property.unset();

            expect(property.isEmpty()).to.be.true;
        });

        it('should return true when the property is set to an empty value', function () {
            propertyValue.isEmpty.returns(true);

            expect(property.isEmpty()).to.be.true;
        });

        it('should return false when the property is set to a non-empty value', function () {
            property.initialise(propertyValue);
            propertyValue.isEmpty.returns(false);

            expect(property.isEmpty()).to.be.false;
        });
    });

    describe('isSet()', function () {
        it('should return true when the property is set', function () {
            property.initialise(propertyValue);

            expect(property.isSet()).to.be.true;
        });

        it('should return false when the property is not set', function () {
            expect(property.isSet()).to.be.false;
        });

        it('should return false when the property is set to null', function () {
            propertyValue.getType.returns('null');

            expect(property.isSet()).to.be.false;
        });
    });

    describe('isVisible()', function () {
        describe('for a public property', function () {
            it('should return true', function () {
                expect(property.isVisible()).to.be.true;
            });
        });

        describe('for a protected property', function () {
            var callingClass;

            beforeEach(function () {
                createProperty('protected');
                callingClass = sinon.createStubInstance(Class);
                callStack.getCurrentClass.returns(callingClass);
                callingClass.isInFamilyOf.returns(false);
            });

            it('should return true when the calling class is in the same family as the definer', function () {
                callingClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);

                expect(property.isVisible()).to.be.true;
            });

            it('should return false when the calling class is not in the same family as the definer', function () {
                callingClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(false);

                expect(property.isVisible()).to.be.false;
            });
        });

        describe('for a private property', function () {
            var callingClass;

            beforeEach(function () {
                createProperty('private');
                callingClass = sinon.createStubInstance(Class);
                callStack.getCurrentClass.returns(callingClass);
                callingClass.getName.returns('Some\\OtherClass');
                callingClass.isInFamilyOf.returns(false);
            });

            it('should return true when the calling class is the definer', function () {
                callingClass.getName.returns('My\\AwesomeClass');

                expect(property.isVisible()).to.be.true;
            });

            it('should return false even when the calling class is in the same family as the definer', function () {
                callingClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);

                expect(property.isVisible()).to.be.false;
            });
        });
    });

    describe('multiplyBy()', function () {
        it('should multiply the property\'s value by the given value and assign it back to the property', function () {
            property.setValue(valueFactory.createInteger(20));

            property.multiplyBy(valueFactory.createInteger(4));

            expect(property.getNative()).to.equal(80);
        });
    });

    describe('setReference()', function () {
        it('should return the property reference', function () {
            var reference = sinon.createStubInstance(Variable);

            expect(property.setReference(reference)).to.equal(reference);
        });
    });

    describe('setValue()', function () {
        var newValue;

        beforeEach(function () {
            newValue = valueFactory.createString('my new value');
        });

        describe('when the property is not a reference', function () {
            it('should store the new value for the property', function () {
                property.setValue(newValue);

                expect(property.getNative()).to.equal('my new value');
            });

            it('should return the value assigned', function () {
                expect(property.setValue(newValue)).to.equal(newValue);
            });
        });

        describe('when the property is a reference', function () {
            var reference;

            beforeEach(function () {
                reference = sinon.createStubInstance(Variable);
                property.setReference(reference);
            });

            it('should set the property via the reference', function () {
                property.setValue(newValue);

                expect(reference.setValue).to.have.been.calledOnce;
                expect(reference.setValue).to.have.been.calledWith(sinon.match.same(newValue));
            });

            it('should return the value assigned', function () {
                expect(property.setValue(newValue)).to.equal(newValue);
            });
        });

        describe('when this property is the first one to be defined', function () {
            beforeEach(function () {
                objectValue.getLength.returns(0);
            });

            it('should change the object\'s array-like pointer to point to this property', function () {
                property.setValue(newValue);

                expect(objectValue.pointToProperty).to.have.been.calledOnce;
                expect(objectValue.pointToProperty).to.have.been.calledWith(sinon.match.same(property));
            });
        });

        describe('when this property is the second one to be defined', function () {
            beforeEach(function () {
                objectValue.getLength.returns(1);
            });

            it('should not change the array-like pointer', function () {
                property.setValue(newValue);

                expect(objectValue.pointToProperty).not.to.have.been.called;
            });
        });

        describe('when this property is not defined', function () {
            beforeEach(function () {
                objectValue.getLength.returns(0); // Property is the first to be defined

                keyValue.getNative.returns('my_new_property');
            });

            describe('when magic __set is not defined either', function () {
                it('should change the object\'s array-like pointer to point to this property', function () {
                    property.setValue(newValue);

                    expect(objectValue.pointToProperty).to.have.been.calledOnce;
                    expect(objectValue.pointToProperty).to.have.been.calledWith(sinon.match.same(property));
                });
            });

            describe('when magic __set is defined', function () {
                beforeEach(function () {
                    objectValue.isMethodDefined.withArgs('__set').returns(sinon.createStubInstance(MethodSpec));
                });

                it('should call the magic setter', function () {
                    property.setValue(newValue);

                    expect(objectValue.callMethod).to.have.been.calledOnce;
                    expect(objectValue.callMethod).to.have.been.calledWith('__set', [
                        sinon.match.same(keyValue),
                        sinon.match.same(newValue)
                    ]);
                });

                it('should not change the array-like pointer', function () {
                    property.setValue(newValue);

                    expect(objectValue.pointToProperty).not.to.have.been.called;
                });
            });
        });
    });

    describe('unset()', function () {
        it('should leave the property no longer set', function () {
            property.initialise(propertyValue);

            property.unset();

            expect(property.isSet()).to.be.false;
        });

        it('should leave the property empty', function () {
            property.initialise(propertyValue);

            property.unset();

            expect(property.isEmpty()).to.be.true;
        });

        it('should leave the property undefined', function () {
            property.initialise(propertyValue);

            property.unset();

            expect(property.isDefined()).to.be.false;
        });
    });
});
