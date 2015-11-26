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
    ArrayValue = require('../../../src/Value/Array').sync(),
    CallStack = require('../../../src/CallStack'),
    ElementReference = require('../../../src/Reference/Element'),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    KeyValuePair = require('../../../src/KeyValuePair'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PropertyReference = require('../../../src/Reference/Property'),
    StringValue = require('../../../src/Value/String').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Array', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = sinon.createStubInstance(ValueFactory);
        this.factory.createInteger.restore();
        sinon.stub(this.factory, 'createInteger', function (nativeValue) {
            var integerValue = sinon.createStubInstance(IntegerValue);
            integerValue.getNative.returns(nativeValue);
            return integerValue;
        });
        this.factory.createString.restore();
        sinon.stub(this.factory, 'createString', function (nativeValue) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.getNative.returns(nativeValue);
            return stringValue;
        });

        this.element1 = sinon.createStubInstance(KeyValuePair);
        this.element2 = sinon.createStubInstance(KeyValuePair);
        this.element1.getKey.returns(this.factory.createString('firstEl'));
        this.element1.getValue.returns(this.factory.createString('value of first el'));
        this.element2.getKey.returns(this.factory.createString('secondEl'));
        this.element2.getValue.returns(this.factory.createString('value of second el'));

        this.value = new ArrayValue(this.factory, this.callStack, [
            this.element1,
            this.element2
        ]);
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

        it('should store the array elements as properties of the stdClass object', function () {
            this.value.coerceToObject();

            expect(this.nativeStdClassObject.firstEl).to.equal('value of first el');
            expect(this.nativeStdClassObject.secondEl).to.equal('value of second el');
        });
    });

    describe('getPushElement()', function () {
        it('should return an ElementReference', function () {
            expect(this.value.getPushElement()).to.be.an.instanceOf(ElementReference);
        });
    });

    describe('pushElement()', function () {
        it('should add the element to the array', function () {
            var element = sinon.createStubInstance(ElementReference);
            element.getKey.returns(this.factory.createInteger(21));
            element.getValue.returns(this.factory.createString('a value'));

            this.value.pushElement(element);

            expect(this.value.getNative()[21]).to.equal('a value');
        });

        it('should return an IntegerValue with the pushed element\'s key', function () {
            var element = sinon.createStubInstance(ElementReference),
                result;
            element.getKey.returns(this.factory.createInteger(21));
            element.getValue.returns(this.factory.createString('a value'));

            result = this.value.pushElement(element);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(2); // 0 and 1 already taken by existing elements
        });
    });
});
