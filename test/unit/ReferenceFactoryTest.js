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
    ArrayValue = require('../../src/Value/Array').sync(),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    FutureFactory = require('../../src/Control/FutureFactory'),
    ObjectValue = require('../../src/Value/Object').sync(),
    Reference = require('../../src/Reference/Reference'),
    ReferenceFactory = require('../../src/ReferenceFactory').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('ReferenceFactory', function () {
    var AccessorReference,
        callStack,
        ElementReference,
        factory,
        futureFactory,
        NullReference,
        ObjectElementReference,
        PropertyReference,
        ReferenceSlot,
        ReferenceSnapshot,
        StaticPropertyReference,
        UndeclaredStaticPropertyReference,
        valueFactory;

    beforeEach(function () {
        AccessorReference = sinon.stub();
        callStack = sinon.createStubInstance(CallStack);
        ElementReference = sinon.stub();
        futureFactory = sinon.createStubInstance(FutureFactory);
        NullReference = sinon.stub();
        ObjectElementReference = sinon.stub();
        PropertyReference = sinon.stub();
        ReferenceSlot = sinon.stub();
        ReferenceSnapshot = sinon.stub();
        StaticPropertyReference = sinon.stub();
        UndeclaredStaticPropertyReference = sinon.stub();
        valueFactory = sinon.createStubInstance(ValueFactory);

        factory = new ReferenceFactory(
            AccessorReference,
            ElementReference,
            NullReference,
            ObjectElementReference,
            PropertyReference,
            ReferenceSlot,
            ReferenceSnapshot,
            StaticPropertyReference,
            UndeclaredStaticPropertyReference,
            valueFactory,
            futureFactory,
            callStack
        );
    });

    describe('createAccessor()', function () {
        var definednessGetter,
            emptinessGetter,
            referenceClearer,
            referenceGetter,
            referenceSetter,
            setnessGetter,
            undefinednessRaiser,
            valueGetter,
            valueSetter;

        beforeEach(function () {
            definednessGetter = sinon.stub();
            emptinessGetter = sinon.stub();
            referenceClearer = sinon.stub();
            referenceGetter = sinon.stub();
            referenceSetter = sinon.stub();
            setnessGetter = sinon.stub();
            undefinednessRaiser = sinon.stub();
            valueGetter = sinon.stub();
            valueSetter = sinon.stub();
        });

        it('should create the AccessorReference correctly', function () {
            factory.createAccessor(
                valueGetter,
                valueSetter,
                referenceGetter,
                referenceSetter,
                referenceClearer,
                definednessGetter,
                emptinessGetter,
                setnessGetter,
                undefinednessRaiser
            );

            expect(AccessorReference).to.have.been.calledOnce;
            expect(AccessorReference).to.have.been.calledWith(
                sinon.match.same(valueFactory),
                sinon.match.same(factory),
                sinon.match.same(valueGetter),
                sinon.match.same(valueSetter),
                sinon.match.same(referenceGetter),
                sinon.match.same(referenceSetter),
                sinon.match.same(referenceClearer),
                sinon.match.same(definednessGetter),
                sinon.match.same(emptinessGetter),
                sinon.match.same(setnessGetter),
                sinon.match.same(undefinednessRaiser)
            );
        });

        it('should return the created AccessorReference', function () {
            var reference = sinon.createStubInstance(AccessorReference);
            AccessorReference.returns(reference);

            expect(
                factory.createAccessor(valueGetter, valueSetter, referenceSetter)
            ).to.equal(reference);
        });
    });

    describe('createElement()', function () {
        var arrayValue,
            keyValue;

        beforeEach(function () {
            arrayValue = sinon.createStubInstance(ArrayValue);
            keyValue = sinon.createStubInstance(Value);
        });

        it('should create the ElementReference correctly when it has a value', function () {
            var value = sinon.createStubInstance(Value);

            factory.createElement(arrayValue, keyValue, value, null);

            expect(ElementReference).to.have.been.calledOnce;
            expect(ElementReference).to.have.been.calledWith(
                sinon.match.same(valueFactory),
                sinon.match.same(factory),
                sinon.match.same(futureFactory),
                sinon.match.same(callStack),
                sinon.match.same(arrayValue),
                sinon.match.same(keyValue),
                sinon.match.same(value),
                null
            );
        });

        it('should create the ElementReference correctly when it has a reference', function () {
            var reference = sinon.createStubInstance(Reference);

            factory.createElement(arrayValue, keyValue, null, reference);

            expect(ElementReference).to.have.been.calledOnce;
            expect(ElementReference).to.have.been.calledWith(
                sinon.match.same(valueFactory),
                sinon.match.same(factory),
                sinon.match.same(futureFactory),
                sinon.match.same(callStack),
                sinon.match.same(arrayValue),
                sinon.match.same(keyValue),
                null,
                sinon.match.same(reference)
            );
        });

        it('should return the created ElementReference', function () {
            var reference = sinon.createStubInstance(ElementReference),
                value = sinon.createStubInstance(Value);
            ElementReference.returns(reference);

            expect(factory.createElement(arrayValue, keyValue, value, null)).to.equal(reference);
        });
    });

    describe('createNull()', function () {
        it('should create the NullReference correctly', function () {
            factory.createNull();

            expect(NullReference).to.have.been.calledOnce;
            expect(NullReference).to.have.been.calledWith(
                sinon.match.same(valueFactory)
            );
        });

        it('should return the created NullReference', function () {
            var reference = sinon.createStubInstance(NullReference);
            NullReference.returns(reference);

            expect(factory.createNull()).to.equal(reference);
        });
    });

    describe('createObjectElement()', function () {
        var objectValue,
            keyValue;

        beforeEach(function () {
            objectValue = sinon.createStubInstance(ObjectValue);
            keyValue = sinon.createStubInstance(Value);
        });

        it('should create the ObjectElementReference correctly', function () {
            factory.createObjectElement(objectValue, keyValue);

            expect(ObjectElementReference).to.have.been.calledOnce;
            expect(ObjectElementReference).to.have.been.calledWith(
                sinon.match.same(valueFactory),
                sinon.match.same(factory),
                sinon.match.same(objectValue),
                sinon.match.same(keyValue)
            );
        });

        it('should return the created ObjectElementReference', function () {
            var reference = sinon.createStubInstance(ElementReference);
            ObjectElementReference.returns(reference);

            expect(factory.createObjectElement(objectValue, keyValue)).to.equal(reference);
        });
    });

    describe('createProperty()', function () {
        var classObject,
            objectValue,
            keyValue;

        beforeEach(function () {
            classObject = sinon.createStubInstance(Class);
            objectValue = sinon.createStubInstance(ObjectValue);
            keyValue = sinon.createStubInstance(Value);
        });

        it('should create the PropertyReference correctly', function () {
            factory.createProperty(objectValue, keyValue, classObject, 'private', 21);

            expect(PropertyReference).to.have.been.calledOnce;
            expect(PropertyReference).to.have.been.calledWith(
                sinon.match.same(valueFactory),
                sinon.match.same(factory),
                sinon.match.same(futureFactory),
                sinon.match.same(callStack),
                sinon.match.same(objectValue),
                sinon.match.same(keyValue),
                sinon.match.same(classObject),
                'private',
                21
            );
        });

        it('should return the created PropertyReference', function () {
            var reference = sinon.createStubInstance(PropertyReference);
            PropertyReference.returns(reference);

            expect(factory.createProperty(objectValue, keyValue, classObject, 'private', 21))
                .to.equal(reference);
        });
    });

    describe('createReferenceSlot()', function () {
        var classObject,
            objectValue,
            keyValue;

        beforeEach(function () {
            classObject = sinon.createStubInstance(Class);
            objectValue = sinon.createStubInstance(ObjectValue);
            keyValue = sinon.createStubInstance(Value);
        });

        it('should create the ReferenceSlot correctly', function () {
            factory.createReferenceSlot();

            expect(ReferenceSlot).to.have.been.calledOnce;
            expect(ReferenceSlot).to.have.been.calledWith(
                sinon.match.same(valueFactory),
                sinon.match.same(factory)
            );
        });

        it('should return the created ReferenceSlot', function () {
            var reference = sinon.createStubInstance(ReferenceSlot);
            ReferenceSlot.returns(reference);

            expect(factory.createReferenceSlot()).to.equal(reference);
        });
    });

    describe('createSnapshot()', function () {
        var assignedReference,
            value,
            wrappedReference;

        beforeEach(function () {
            assignedReference = sinon.createStubInstance(ReferenceSlot);
            value = sinon.createStubInstance(Value);
            wrappedReference = sinon.createStubInstance(Reference);

            wrappedReference.getReference.returns(assignedReference);
            wrappedReference.isReference.returns(true);
        });

        describe('when given the wrapped reference and its current value because it is defined', function () {
            it('should create the ReferenceSnapshot correctly when a reference was assigned', function () {
                factory.createSnapshot(wrappedReference, value);

                expect(ReferenceSnapshot).to.have.been.calledOnce;
                expect(ReferenceSnapshot).to.have.been.calledWith(
                    sinon.match.same(valueFactory),
                    sinon.match.same(factory),
                    sinon.match.same(futureFactory),
                    sinon.match.same(wrappedReference),
                    sinon.match.same(value),
                    sinon.match.same(assignedReference)
                );
            });

            it('should create the ReferenceSnapshot correctly when no reference was assigned', function () {
                wrappedReference.getReference.returns(null);
                wrappedReference.isReference.returns(false);

                factory.createSnapshot(wrappedReference, value);

                expect(ReferenceSnapshot).to.have.been.calledOnce;
                expect(ReferenceSnapshot).to.have.been.calledWith(
                    sinon.match.same(valueFactory),
                    sinon.match.same(factory),
                    sinon.match.same(futureFactory),
                    sinon.match.same(wrappedReference),
                    sinon.match.same(value),
                    null
                );
            });

            it('should return the created ReferenceSnapshot', function () {
                var snapshot = sinon.createStubInstance(ReferenceSnapshot);
                ReferenceSnapshot.returns(snapshot);

                expect(factory.createSnapshot(wrappedReference, value)).to.equal(snapshot);
            });
        });

        describe('when given only the wrapped reference because it has no value defined', function () {
            it('should create the ReferenceSnapshot correctly when a reference was assigned', function () {
                factory.createSnapshot(wrappedReference);

                expect(ReferenceSnapshot).to.have.been.calledOnce;
                expect(ReferenceSnapshot).to.have.been.calledWith(
                    sinon.match.same(valueFactory),
                    sinon.match.same(factory),
                    sinon.match.same(futureFactory),
                    sinon.match.same(wrappedReference),
                    null,
                    sinon.match.same(assignedReference)
                );
            });

            it('should create the ReferenceSnapshot correctly when no reference was assigned', function () {
                wrappedReference.getReference.returns(null);
                wrappedReference.isReference.returns(false);

                factory.createSnapshot(wrappedReference);

                expect(ReferenceSnapshot).to.have.been.calledOnce;
                expect(ReferenceSnapshot).to.have.been.calledWith(
                    sinon.match.same(valueFactory),
                    sinon.match.same(factory),
                    sinon.match.same(futureFactory),
                    sinon.match.same(wrappedReference),
                    null,
                    null
                );
            });

            it('should return the created ReferenceSnapshot', function () {
                var snapshot = sinon.createStubInstance(ReferenceSnapshot);
                ReferenceSnapshot.returns(snapshot);

                expect(factory.createSnapshot(wrappedReference)).to.equal(snapshot);
            });
        });
    });

    describe('createStaticProperty()', function () {
        var classObject,
            keyValue;

        beforeEach(function () {
            classObject = sinon.createStubInstance(Class);
            keyValue = sinon.createStubInstance(Value);
        });

        it('should create the StaticPropertyReference correctly', function () {
            factory.createStaticProperty('myProp', classObject, 'protected');

            expect(StaticPropertyReference).to.have.been.calledOnce;
            expect(StaticPropertyReference).to.have.been.calledWith(
                sinon.match.same(valueFactory),
                sinon.match.same(factory),
                sinon.match.same(callStack),
                sinon.match.same(classObject),
                'myProp',
                'protected'
            );
        });

        it('should return the created StaticPropertyReference', function () {
            var reference = sinon.createStubInstance(StaticPropertyReference);
            StaticPropertyReference.returns(reference);

            expect(factory.createStaticProperty('myProp', classObject, 'private'))
                .to.equal(reference);
        });
    });

    describe('createUndeclaredStaticProperty()', function () {
        var classObject,
            keyValue;

        beforeEach(function () {
            classObject = sinon.createStubInstance(Class);
            keyValue = sinon.createStubInstance(Value);
        });

        it('should create the UndeclaredStaticPropertyReference correctly', function () {
            factory.createUndeclaredStaticProperty('myProp', classObject);

            expect(UndeclaredStaticPropertyReference).to.have.been.calledOnce;
            expect(UndeclaredStaticPropertyReference).to.have.been.calledWith(
                sinon.match.same(valueFactory),
                sinon.match.same(factory),
                sinon.match.same(futureFactory),
                sinon.match.same(callStack),
                sinon.match.same(classObject),
                'myProp'
            );
        });

        it('should return the created StaticPropertyReference', function () {
            var reference = sinon.createStubInstance(UndeclaredStaticPropertyReference);
            UndeclaredStaticPropertyReference.returns(reference);

            expect(factory.createUndeclaredStaticProperty('myProp', classObject))
                .to.equal(reference);
        });
    });
});
