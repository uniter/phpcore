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
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('StaticPropertyReference', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = new ValueFactory();
        this.classObject = sinon.createStubInstance(Class);
        this.propertyValue = sinon.createStubInstance(StringValue);

        this.classObject.getName.returns('My\\Namespaced\\ClassName');

        this.propertyValue.getNative.returns('the value of my property');
        this.propertyValue.getType.returns('string');

        this.property = new StaticPropertyReference(
            this.classObject,
            'myProp',
            'protected',
            this.propertyValue
        );
    });

    describe('concatWith()', function () {
        it('should append the given value to the property\'s value and assign it back to the property', function () {
            this.property.setValue(this.factory.createString('value for my prop'));

            this.property.concatWith(this.factory.createString(' with world on the end'));

            expect(this.property.getNative()).to.equal('value for my prop with world on the end');
        });
    });

    describe('decrementBy()', function () {
        it('should subtract the given value from the property\'s value and assign it back to the property', function () {
            this.property.setValue(this.factory.createInteger(20));

            this.property.decrementBy(this.factory.createInteger(4));

            expect(this.property.getNative()).to.equal(16);
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the property\'s value', function () {
            expect(this.property.getNative()).to.equal('the value of my property');
        });
    });

    describe('incrementBy()', function () {
        it('should add the given value to the property\'s value and assign it back to the property', function () {
            this.property.setValue(this.factory.createInteger(20));

            this.property.incrementBy(this.factory.createInteger(4));

            expect(this.property.getNative()).to.equal(24);
        });
    });

    describe('isDefined()', function () {
        it('should return true', function () {
            expect(this.property.isDefined()).to.be.true;
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
