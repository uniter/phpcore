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
    FloatValue = require('../../src/Value/Float').sync(),
    IntegerValue = require('../../src/Value/Integer').sync(),
    NullReference = require('../../src/Reference/Null'),
    ObjectValue = require('../../src/Value/Object').sync(),
    PropertyReference = require('../../src/Reference/Property'),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Value', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = new ValueFactory();

        this.createValue = function (factory) {
            this.value = new Value(factory || this.factory, this.callStack, 'my-type', 'my value');
        }.bind(this);
        this.createValue();
    });

    describe('bitwiseAnd()', function () {
        it('should return the correct result for 0b10101101 & 0b00001111', function () {
            var left = parseInt('10101101', 2),
                right = parseInt('00001011', 2),
                expectedResult = parseInt('00001001', 2),
                leftValue = new Value(this.factory, this.callStack, 'first-type', left),
                rightValue = new Value(this.factory, this.callStack, 'second-type', right),
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
                leftValue = new Value(this.factory, this.callStack, 'first-type', left),
                rightValue = new Value(this.factory, this.callStack, 'second-type', right),
                result = leftValue.bitwiseOr(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(expectedResult);
        });
    });

    describe('coerceToInteger()', function () {
        it('should coerce the value to an integer', function () {
            var value = new Value(this.factory, this.callStack, 'my-type', '127.632'),
                result = value.coerceToInteger();

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(127); // Value should be coerced to an integer
        });
    });

    describe('coerceToNumber()', function () {
        it('should coerce the value to a float', function () {
            var value = new Value(this.factory, this.callStack, 'my-type', '12'),
                result = value.coerceToNumber();

            expect(result).to.be.an.instanceOf(FloatValue);
            expect(result.getNative()).to.equal(12); // Value should be coerced to a number
        });
    });

    describe('coerceToObject()', function () {
        beforeEach(function () {
            this.nativeStdClassObject = {};
            this.stdClassObject = sinon.createStubInstance(ObjectValue);
            sinon.stub(this.factory, 'createStdClassObject').returns(this.stdClassObject);

            this.stdClassObject.getInstancePropertyByName.callsFake(function (nameValue) {
                var propertyRef = sinon.createStubInstance(PropertyReference);

                propertyRef.setValue.callsFake(function (value) {
                    this.nativeStdClassObject[nameValue.getNative()] = value.getNative();
                }.bind(this));

                return propertyRef;
            }.bind(this));
        });

        it('should return an ObjectValue wrapping the created stdClass instance', function () {
            var coercedValue = this.value.coerceToObject();

            expect(coercedValue).to.equal(this.stdClassObject);
        });

        it('should store the value as a property of the stdClass object called `scalar`', function () {
            this.value.coerceToObject();

            expect(this.nativeStdClassObject.scalar).to.equal('my value');
        });
    });

    describe('getPushElement()', function () {
        it('should return a NullReference', function () {
            expect(this.value.getPushElement()).to.be.an.instanceOf(NullReference);
        });
    });
});
