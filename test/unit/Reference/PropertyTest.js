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
    PropertyReference = require('../../../src/Reference/Property'),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync(),
    Variable = require('../../../src/Variable').sync();

describe('PropertyReference', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = sinon.createStubInstance(ValueFactory);
        this.factory.coerce.restore();
        sinon.stub(this.factory, 'coerce', function (otherValue) {
            var value;
            if (otherValue instanceof Value) {
                return otherValue;
            }
            value = sinon.createStubInstance(Value);
            value.getNative.returns(otherValue);
            return value;
        });
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

        this.nativeObject = {
            'my_property': this.factory.createString('value for my prop')
        };
        this.objectValue = sinon.createStubInstance(ObjectValue);
        this.objectValue.getNative.returns(this.nativeObject);
        this.keyValue = this.factory.createString('my_property');

        this.property = new PropertyReference(
            this.factory,
            this.callStack,
            this.objectValue,
            this.nativeObject,
            this.keyValue
        );
    });

    describe('isSet()', function () {
        it('should return true when the property is set', function () {
            expect(this.property.isSet()).to.be.true;
        });

        it('should return false when the property is not set', function () {
            this.keyValue.getNative.returns('not_my_property');

            expect(this.property.isSet()).to.be.false;
        });

        it('should return false when the property is set to null', function () {
            this.nativeObject.my_property.getType.returns('null');

            expect(this.property.isSet()).to.be.false;
        });
    });

    describe('setReference()', function () {
        it('should return the property reference', function () {
            var reference = sinon.createStubInstance(Variable);

            expect(this.property.setReference(reference)).to.equal(reference);
        });
    });

    describe('setValue()', function () {
        describe('when the property is not a reference', function () {
            it('should return the value assigned', function () {
                var newValue = this.factory.createString('my new value');

                expect(this.property.setValue(newValue)).to.equal(newValue);
            });
        });

        describe('when the property is a reference', function () {
            beforeEach(function () {
                this.reference = sinon.createStubInstance(Variable);
                this.property.setReference(this.reference);
            });

            it('should return the value assigned', function () {
                var newValue = this.factory.createString('my new value');

                expect(this.property.setValue(newValue)).to.equal(newValue);
            });
        });

        describe('when this property is the first one to be defined', function () {
            beforeEach(function () {
                this.objectValue.getLength.returns(0);
            });

            it('should change the object\'s array-like pointer to point to this property', function () {
                var newValue = this.factory.createString('my new value');

                this.property.setValue(newValue);

                expect(this.objectValue.pointToProperty).to.have.been.calledOnce;
                expect(this.objectValue.pointToProperty).to.have.been.calledWith(sinon.match.same(this.property));
            });
        });

        describe('when this property is the second one to be defined', function () {
            beforeEach(function () {
                this.objectValue.getLength.returns(1);
            });

            it('should not change the array-like pointer', function () {
                var newValue = this.factory.createString('my new value');

                this.property.setValue(newValue);

                expect(this.objectValue.pointToProperty).not.to.have.been.called;
            });
        });
    });

    describe('unset()', function () {
        it('should leave the property no longer set', function () {
            this.property.unset();

            expect(this.property.isSet()).to.be.false;
        });

        it('should delete the property from the native object', function () {
            this.property.unset();

            expect(this.nativeObject).not.to.have.property('my_property');
        });
    });
});
