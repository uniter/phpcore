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
    Class = require('../../../src/Class').sync(),
    Future = require('../../../src/Control/Future'),
    PropertyReference = require('../../../src/Reference/Property'),
    MethodSpec = require('../../../src/MethodSpec'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    Present = require('../../../src/Control/Present'),
    Reference = require('../../../src/Reference/Reference'),
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot'),
    Variable = require('../../../src/Variable').sync();

describe('PropertyReference', function () {
    var callStack,
        classObject,
        createProperty,
        flow,
        futureFactory,
        keyValue,
        objectValue,
        property,
        propertyValue,
        state,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        classObject = sinon.createStubInstance(Class);
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();
        propertyValue = valueFactory.createString('value for my prop');
        objectValue = sinon.createStubInstance(ObjectValue);
        objectValue.isMethodDefined.returns(false);
        objectValue.referToElement
            .withArgs('my_property')
            .returns('property: My\\AwesomeClass::$my_property');
        keyValue = valueFactory.createString('my_property');

        classObject.getName.returns('My\\AwesomeClass');

        createProperty = function (visibility) {
            property = new PropertyReference(
                valueFactory,
                state.getReferenceFactory(),
                state.getFutureFactory(),
                callStack,
                flow,
                objectValue,
                keyValue,
                classObject,
                visibility || 'public',
                21
            );
        };
        createProperty();
    });

    describe('asArrayElement()', function () {
        it('should return the value of the property', function () {
            property.initialise(propertyValue);

            expect(property.asArrayElement()).to.equal(propertyValue);
        });
    });

    describe('asEventualNative()', function () {
        it('should return a Future that resolves to the native value of the property', async function () {
            property.initialise(propertyValue);

            expect(await property.asEventualNative().toPromise()).to.equal('value for my prop');
        });
    });

    describe('asValue()', function () {
        it('should return the value assigned', function () {
            property.initialise(propertyValue);

            expect(property.asValue()).to.equal(propertyValue);
        });

        it('should return a rejected Future when a reference assigned raises an error', async function () {
            var reference = sinon.createStubInstance(Reference);
            reference.getValue.throws(new Error('Bang!'));
            property.setReference(reference);

            await expect(property.asValue().toPromise()).to.eventually.be.rejectedWith('Bang!');
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

    describe('getName()', function () {
        it('should return the key of the property as a string', function () {
            expect(property.getName()).to.equal('my_property');
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

    describe('getValueOrNativeNull()', function () {
        it('should return the value when the property is defined with a value', function () {
            var value = valueFactory.createString('my value');
            property.setValue(value);

            expect(property.getValueOrNativeNull()).to.equal(value);
        });

        it('should return the value of the reference when the property is defined with a reference', function () {
            var reference = sinon.createStubInstance(Reference),
                value = valueFactory.createString('my val from reference');
            reference.getValue.returns(value);
            property.setReference(reference);

            expect(property.getValueOrNativeNull()).to.equal(value);
        });

        it('should return native null when the property is not defined', function () {
            property.unset();

            expect(property.getValueOrNativeNull()).to.be.null;
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

    describe('hasReferenceSetter()', function () {
        it('should return false', function () {
            expect(property.hasReferenceSetter()).to.be.false;
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
            keyValue = valueFactory.createString('not_my_property');
            createProperty();

            expect(property.isDefined()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true when the property is not set', async function () {
            property.unset();

            expect(await property.isEmpty().toPromise()).to.be.true;
        });

        it('should return true when the property is set to an empty value', async function () {
            propertyValue = valueFactory.createString('');
            property.initialise(propertyValue);

            expect(await property.isEmpty().toPromise()).to.be.true;
        });

        it('should return false when the property is set to a non-empty value', async function () {
            property.initialise(propertyValue);

            expect(await property.isEmpty().toPromise()).to.be.false;
        });
    });

    describe('isReadable()', function () {
        it('should return true when the property is defined', function () {
            property.initialise(propertyValue);

            expect(property.isReadable()).to.be.true;
        });

        it('should return true when the class implements magic __get', function () {
            objectValue.isMethodDefined.withArgs('__get').returns(true);

            expect(property.isReadable()).to.be.true;
        });

        it('should return false otherwise', function () {
            expect(property.isReadable()).to.be.false;
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

        it('should return false when the property is undefined', function () {
            expect(property.isReference()).to.be.false;
        });
    });

    describe('isReferenceable()', function () {
        it('should return true', function () {
            expect(property.isReferenceable()).to.be.true;
        });
    });

    describe('isSet()', function () {
        it('should return true when the property is set', async function () {
            property.initialise(propertyValue);

            expect(await property.isSet().toPromise()).to.be.true;
        });

        it('should return false when the property is not set', async function () {
            expect(await property.isSet().toPromise()).to.be.false;
        });

        it('should return false when the property is set to null', async function () {
            propertyValue = valueFactory.createNull();
            property.initialise(propertyValue);

            expect(await property.isSet().toPromise()).to.be.false;
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

    describe('raiseUndefined()', function () {
        it('should raise the correct E_NOTICE', function () {
            property.raiseUndefined();

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Undefined property: My\\AwesomeClass::$my_property'
            );
        });

        it('should return null', function () {
            expect(property.raiseUndefined().getNative()).to.be.null;
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
            it('should store the new value for the property', async function () {
                await property.setValue(newValue).toPromise();

                expect(property.getNative()).to.equal('my new value');
            });

            it('should return the value assigned', async function () {
                var resultPresent = await property.setValue(newValue).toPromise();

                expect(resultPresent.getType()).to.equal('string');
                expect(resultPresent.getNative()).to.equal('my new value');
            });
        });

        describe('when the property is a reference', function () {
            var reference;

            beforeEach(function () {
                reference = sinon.createStubInstance(Variable);

                reference.setValue.returnsArg(0);

                property.setReference(reference);
            });

            it('should set the property via the reference', async function () {
                await property.setValue(newValue).toPromise();

                expect(reference.setValue).to.have.been.calledOnce;
                expect(reference.setValue.args[0][0].getType()).to.equal('string');
                expect(reference.setValue.args[0][0].getNative()).to.equal('my new value');
            });

            it('should return the value assigned', async function () {
                var resultValue = await property.setValue(newValue).toPromise();

                expect(resultValue.getType()).to.equal('string');
                expect(resultValue.getNative()).to.equal('my new value');
            });
        });

        describe('when this property is not defined', function () {
            beforeEach(function () {
                objectValue.callMethod
                    .withArgs('__set')
                    // Result is discarded but may be async so should be awaited.
                    .returns(valueFactory.createAsyncPresent('my discarded result'));

                objectValue.getLength.returns(0); // Property is the first to be defined

                keyValue = valueFactory.createString('my_new_property');
                createProperty();
            });

            describe('when magic __set is defined', function () {
                beforeEach(function () {
                    objectValue.isMethodDefined.withArgs('__set').returns(sinon.createStubInstance(MethodSpec));
                });

                it('should call the magic setter', async function () {
                    await property.setValue(newValue).toPromise();

                    expect(objectValue.callMethod).to.have.been.calledOnce;
                    expect(objectValue.callMethod).to.have.been.calledWith('__set');
                    expect(objectValue.callMethod.args[0][1][0].getType()).to.equal('string');
                    expect(objectValue.callMethod.args[0][1][0].getNative()).to.equal('my_new_property');
                });

                it('should return the value assigned', async function () {
                    var resultValue = await property.setValue(newValue).toPromise();

                    expect(resultValue.getType()).to.equal('string');
                    expect(resultValue.getNative()).to.equal('my new value');
                });
            });
        });
    });

    describe('toPromise()', function () {
        it('should return a Promise that resolves to the PropertyReference', async function () {
            expect(await property.toPromise()).to.equal(property);
        });
    });

    describe('unset()', function () {
        it('should leave the property no longer set', async function () {
            property.initialise(propertyValue);

            await property.unset().toPromise();

            expect(await property.isSet().toPromise()).to.be.false;
        });

        it('should leave the property empty', async function () {
            property.initialise(propertyValue);

            await property.unset().toPromise();

            expect(await property.isEmpty().toPromise()).to.be.true;
        });

        it('should leave the property undefined', async function () {
            property.initialise(propertyValue);

            await property.unset().toPromise();

            expect(property.isDefined()).to.be.false;
        });

        describe('when the class does not define magic __unset(...)', function () {
            it('should return an unwrapped Present when defined', async function () {
                property.initialise(propertyValue);

                expect(property.unset()).to.be.an.instanceOf(Present);
            });

            it('should return an unwrapped Present when undefined', async function () {
                expect(property.unset()).to.be.an.instanceOf(Present);
            });
        });

        describe('when the class does define magic __unset(...)', function () {
            beforeEach(function () {
                objectValue.callMethod
                    .withArgs('__unset')
                    // Result is discarded but may be async so should be awaited.
                    .returns(valueFactory.createAsyncPresent('my discarded result'));

                objectValue.isMethodDefined.withArgs('__unset').returns(sinon.createStubInstance(MethodSpec));
            });

            it('should call the magic unsetter', async function () {
                await property.unset().toPromise();

                expect(objectValue.callMethod).to.have.been.calledOnce;
                expect(objectValue.callMethod).to.have.been.calledWith('__unset');
                expect(objectValue.callMethod.args[0][1][0].getType()).to.equal('string');
                expect(objectValue.callMethod.args[0][1][0].getNative()).to.equal('my_property');
            });

            it('should return an unwrapped Future when undefined', async function () {
                expect(property.unset()).to.be.an.instanceOf(Future);
            });
        });
    });
});
