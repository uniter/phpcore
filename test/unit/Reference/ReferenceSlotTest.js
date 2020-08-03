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
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot'),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('ReferenceSlot', function () {
    var factory,
        reference;

    beforeEach(function () {
        factory = new ValueFactory();

        reference = new ReferenceSlot(factory);
    });

    describe('concatWith()', function () {
        it('should append the given value to the variable\'s value and assign it back to the variable', function () {
            reference.setValue(factory.createString('value for my variable'));

            reference.concatWith(factory.createString(' with world on the end'));

            expect(reference.getNative()).to.equal('value for my variable with world on the end');
        });
    });

    describe('decrementBy()', function () {
        it('should subtract the given value from the variable\'s value and assign it back to the variable', function () {
            reference.setValue(factory.createInteger(20));

            reference.decrementBy(factory.createInteger(4));

            expect(reference.getNative()).to.equal(16);
        });
    });

    describe('divideBy()', function () {
        it('should divide the variable\'s value by the given value and assign it back to the variable', function () {
            reference.setValue(factory.createInteger(20));

            reference.divideBy(factory.createInteger(4));

            expect(reference.getNative()).to.equal(5);
        });
    });

    describe('getForAssignment()', function () {
        it('should return the value of the variable', function () {
            var result = sinon.createStubInstance(Value);
            reference.setValue(result);

            expect(reference.getForAssignment()).to.equal(result);
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the slot', function () {
            reference.setValue(factory.createString('the native value of my var'));

            expect(reference.getNative()).to.equal('the native value of my var');
        });
    });

    describe('getValue()', function () {
        it('should return the value of the slot', function () {
            var value = factory.createString('the native value of my var');
            reference.setValue(value);

            expect(reference.getValue()).to.equal(value);
        });
    });

    describe('getValueOrNull()', function () {
        it('should return the value when the slot has one set', function () {
            var value = factory.createString('my value');
            reference.setValue(value);

            expect(reference.getValueOrNull()).to.equal(value);
        });

        it('should return a NullValue when the slot has no value set', function () {
            expect(reference.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('incrementBy()', function () {
        it('should add the given value to the variable\'s value and assign it back to the variable', function () {
            reference.setValue(factory.createInteger(20));

            reference.incrementBy(factory.createInteger(4));

            expect(reference.getNative()).to.equal(24);
        });
    });

    describe('multiplyBy()', function () {
        it('should multiply the variable\'s value by the given value and assign it back to the variable', function () {
            reference.setValue(factory.createInteger(20));

            reference.multiplyBy(factory.createInteger(4));

            expect(reference.getNative()).to.equal(80);
        });
    });

    describe('postDecrement()', function () {
        var decrementedValue,
            originalValue;

        beforeEach(function () {
            originalValue = sinon.createStubInstance(Value);
            decrementedValue = sinon.createStubInstance(Value);
            originalValue.decrement.returns(decrementedValue);
            reference.setValue(originalValue);
        });

        it('should assign the decremented value to the slot', function () {
            reference.postDecrement();

            expect(reference.getValue()).to.equal(decrementedValue);
        });

        it('should return the original value', function () {
            expect(reference.postDecrement()).to.equal(originalValue);
        });
    });

    describe('postIncrement()', function () {
        var incrementedValue,
            originalValue;

        beforeEach(function () {
            originalValue = sinon.createStubInstance(Value);
            incrementedValue = sinon.createStubInstance(Value);
            originalValue.increment.returns(incrementedValue);
            reference.setValue(originalValue);
        });

        it('should assign the incremented value to the slot', function () {
            reference.postIncrement();

            expect(reference.getValue()).to.equal(incrementedValue);
        });

        it('should return the original value', function () {
            expect(reference.postIncrement()).to.equal(originalValue);
        });
    });

    describe('preDecrement()', function () {
        var decrementedValue,
            originalValue;

        beforeEach(function () {
            originalValue = sinon.createStubInstance(Value);
            decrementedValue = sinon.createStubInstance(Value);
            originalValue.decrement.returns(decrementedValue);
            reference.setValue(originalValue);
        });

        it('should assign the decremented value to the slot', function () {
            reference.preDecrement();

            expect(reference.getValue()).to.equal(decrementedValue);
        });

        it('should return the decremented value', function () {
            expect(reference.preDecrement()).to.equal(decrementedValue);
        });
    });

    describe('preIncrement()', function () {
        var incrementedValue,
            originalValue;

        beforeEach(function () {
            originalValue = sinon.createStubInstance(Value);
            incrementedValue = sinon.createStubInstance(Value);
            originalValue.increment.returns(incrementedValue);
            reference.setValue(originalValue);
        });

        it('should assign the incremented value to the slot', function () {
            reference.preIncrement();

            expect(reference.getValue()).to.equal(incrementedValue);
        });

        it('should return the incremented value', function () {
            expect(reference.preIncrement()).to.equal(incrementedValue);
        });
    });

    describe('setValue()', function () {
        it('should set the value of the variable to the new value', function () {
            var newValue = sinon.createStubInstance(Value);

            reference.setValue(newValue);

            expect(reference.getValue()).to.equal(newValue);
        });

        it('should return the new value', function () {
            var newValue = sinon.createStubInstance(Value);

            expect(reference.setValue(newValue)).to.equal(newValue);
        });
    });
});
