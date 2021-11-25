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
    CallStack = require('../../src/CallStack'),
    FutureFactory = require('../../src/Control/FutureFactory'),
    IntegerValue = require('../../src/Value/Integer').sync(),
    NullReference = require('../../src/Reference/Null'),
    ObjectValue = require('../../src/Value/Object').sync(),
    PropertyReference = require('../../src/Reference/Property'),
    ReferenceFactory = require('../../src/ReferenceFactory').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

// TODO: Merge these tests into the relevant *Value class' tests - this should be considered abstract.
describe('Value', function () {
    var callStack,
        factory,
        futureFactory,
        referenceFactory,
        value;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        futureFactory = sinon.createStubInstance(FutureFactory);
        referenceFactory = sinon.createStubInstance(ReferenceFactory);
        factory = new ValueFactory();

        value = new Value(
            factory || factory,
            referenceFactory,
            futureFactory,
            callStack,
            'my-type',
            'my value'
        );
    });

    describe('bitwiseAnd()', function () {
        it('should return the correct result for 0b10101101 & 0b00001111', function () {
            var left = parseInt('10101101', 2),
                right = parseInt('00001011', 2),
                expectedResult = parseInt('00001001', 2),
                leftValue = new Value(factory, referenceFactory, futureFactory, callStack, 'first-type', left),
                rightValue = new Value(factory, referenceFactory, futureFactory, callStack, 'second-type', right),
                result = leftValue.bitwiseAnd(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(expectedResult);
        });
    });

    describe('bitwiseOr()', function () {
        it('should return the correct result for 0b10101001 | 0b11110000', function () {
            var left = parseInt('10101001', 2),
                right = parseInt('11110000', 2),
                expectedResult = parseInt('11111001', 2),
                leftValue = new Value(factory, referenceFactory, futureFactory, callStack, 'first-type', left),
                rightValue = new Value(factory, referenceFactory, futureFactory, callStack, 'second-type', right),
                result = leftValue.bitwiseOr(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(expectedResult);
        });
    });

    describe('coerceToInteger()', function () {
        it('should coerce the value to an integer', function () {
            var value = new Value(factory, referenceFactory, futureFactory, callStack, 'my-type', '127.632'),
                result = value.coerceToInteger();

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(127); // Value should be coerced to an integer
        });
    });

    describe('coerceToNumber()', function () {
        it('should coerce the value to an integer', function () {
            var value = new Value(factory, referenceFactory, futureFactory, callStack, 'my-type', '12'),
                result = value.coerceToNumber();

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(12); // Value should be coerced to a number
        });
    });

    describe('coerceToObject()', function () {
        var nativeStdClassObject,
            stdClassObject;

        beforeEach(function () {
            nativeStdClassObject = {};
            stdClassObject = sinon.createStubInstance(ObjectValue);
            sinon.stub(factory, 'createStdClassObject').returns(stdClassObject);

            stdClassObject.getInstancePropertyByName.callsFake(function (nameValue) {
                var propertyRef = sinon.createStubInstance(PropertyReference);

                propertyRef.setValue.callsFake(function (value) {
                    nativeStdClassObject[nameValue.getNative()] = value.getNative();
                });

                return propertyRef;
            });
        });

        it('should return an ObjectValue wrapping the created stdClass instance', function () {
            var coercedValue = value.coerceToObject();

            expect(coercedValue).to.equal(stdClassObject);
        });

        it('should store the value as a property of the stdClass object called `scalar`', function () {
            value.coerceToObject();

            expect(nativeStdClassObject.scalar).to.equal('my value');
        });
    });

    describe('getPushElement()', function () {
        it('should return a NullReference', function () {
            var nullReference = sinon.createStubInstance(NullReference);
            referenceFactory.createNull.returns(nullReference);

            expect(value.getPushElement()).to.equal(nullReference);
        });
    });
});
