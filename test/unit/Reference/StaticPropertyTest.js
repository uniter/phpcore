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
    PHPFatalError = phpCommon.PHPFatalError,
    StaticPropertyReference = require('../../../src/Reference/StaticProperty'),
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('StaticPropertyReference', function () {
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
        this.factory.createString.restore();
        sinon.stub(this.factory, 'createString', function (nativeValue) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.getNative.returns(nativeValue);
            return stringValue;
        });

        this.classObject = sinon.createStubInstance(Class);
        this.propertyValue = this.factory.createString('my_property');

        this.classObject.getName.returns('My\\Namespaced\\ClassName');

        this.property = new StaticPropertyReference(
            this.classObject,
            'myProp',
            'protected',
            this.propertyValue
        );
    });

    describe('getNative()', function () {
        it('should return the native value of the property\'s value', function () {
            expect(this.property.getNative()).to.equal('my_property');
        });
    });

    describe('isEmpty()', function () {
        it('should return true when the property has an empty value', function () {
            this.propertyValue.isEmpty.returns(true);

            expect(this.property.isEmpty()).to.be.true;
        });

        it('should return false when the property has a non-empty value', function () {
            this.propertyValue.isEmpty.returns(false);

            expect(this.property.isEmpty()).to.be.false;
        });
    });

    describe('isSet()', function () {
        it('should return true when the property is set to a non-null value', function () {
            this.propertyValue.isSet.returns(true);

            expect(this.property.isSet()).to.be.true;
        });

        it('should return false when the property is set to a null value', function () {
            this.propertyValue.isSet.returns(false);

            expect(this.property.isSet()).to.be.false;
        });
    });

    describe('unset()', function () {
        it('should throw a fatal error as static properties cannot be unset', function () {
            expect(function () {
                this.property.unset();
            }.bind(this)).to.throw(
                PHPFatalError,
                'PHP Fatal error: Attempt to unset static property My\\Namespaced\\ClassName::$myProp'
            );
        });
    });
});
