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
    NullReference = require('../../src/Reference/Null'),
    ObjectValue = require('../../src/Value/Object').sync(),
    PropertyReference = require('../../src/Reference/Property'),
    StringValue = require('../../src/Value/String').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('ValueFactory', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = sinon.createStubInstance(ValueFactory);
        this.factory.createFloat.restore();
        sinon.stub(this.factory, 'createFloat', function (nativeValue) {
            var floatValue = sinon.createStubInstance(FloatValue);
            floatValue.coerceToKey.returns(floatValue);
            floatValue.getForAssignment.returns(floatValue);
            floatValue.getNative.returns(nativeValue);
            return floatValue;
        });
        this.factory.createString.restore();
        sinon.stub(this.factory, 'createString', function (nativeValue) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.getNative.returns(nativeValue);
            return stringValue;
        });

        this.value = new Value(this.factory, this.callStack, 'my-type', 'my value');
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
            this.factory.createStdClassObject.returns(this.stdClassObject);

            this.stdClassObject.getInstancePropertyByName.restore();
            sinon.stub(this.stdClassObject, 'getInstancePropertyByName', function (nameValue) {
                var propertyRef = sinon.createStubInstance(PropertyReference);

                propertyRef.setValue.restore();
                sinon.stub(propertyRef, 'setValue', function (value) {
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
