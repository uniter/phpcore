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
    AccessorReference = require('../../../src/Reference/AccessorReference'),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('AccessorReference', function () {
    var reference,
        valueFactory,
        valueGetter,
        valueSetter;

    beforeEach(function () {
        valueFactory = new ValueFactory();
        valueGetter = sinon.stub();
        valueSetter = sinon.spy();

        reference = new AccessorReference(valueFactory, valueGetter, valueSetter);
    });

    describe('concatWith()', function () {
        it('should append the given value to the result of the getter and pass it to the setter', function () {
            valueGetter.returns('hello');

            reference.concatWith(valueFactory.createString(' world'));

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter).to.have.been.calledWith('hello world');
        });
    });

    describe('decrementBy()', function () {
        it('should subtract the given value from the result of the getter and pass it to the setter', function () {
            valueGetter.returns(21);

            reference.decrementBy(valueFactory.createInteger(10));

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter).to.have.been.calledWith(11);
        });
    });

    describe('divideBy()', function () {
        it('should divide the result of the getter by the given value and pass it to the setter', function () {
            valueGetter.returns(40);

            reference.divideBy(valueFactory.createInteger(10));

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter).to.have.been.calledWith(4);
        });
    });

    describe('formatAsString()', function () {
        it('should return the native result of the getter, formatted', function () {
            valueGetter.returns('My native result');

            expect(reference.formatAsString()).to.equal('\'My native resul...\'');
        });
    });

    describe('getNative()', function () {
        it('should return result of the getter coerced to a PHP value', function () {
            valueGetter.returns(21);

            expect(reference.getNative()).to.equal(21);
        });
    });

    describe('getValue()', function () {
        it('should return the result of the getter coerced to a PHP value', function () {
            var value;
            valueGetter.returns(101);

            value = reference.getValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(101);
        });
    });

    describe('getValueOrNull()', function () {
        it('should return the value when the getter returns a value', function () {
            var value = valueFactory.createString('my value');
            valueGetter.returns(value);

            expect(reference.getValueOrNull()).to.equal(value);
        });

        it('should return a NullValue when the getter returns no value', function () {
            expect(reference.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('incrementBy()', function () {
        it('should add the given value to the result of the getter and pass it to the setter', function () {
            valueGetter.returns(21);

            reference.incrementBy(valueFactory.createInteger(6));

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter).to.have.been.calledWith(27);
        });
    });

    describe('isDefined()', function () {
        it('should return true', function () {
            expect(reference.isDefined()).to.be.true;
        });
    });

    describe('multiplyBy()', function () {
        it('should multiply the result of the getter by the given value and pass it to the setter', function () {
            valueGetter.returns(4);

            reference.multiplyBy(valueFactory.createInteger(10));

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter).to.have.been.calledWith(40);
        });
    });

    describe('setValue()', function () {
        it('should call the setter with the value unwrapped for native JS', function () {
            var newValue = valueFactory.createInteger(27);

            reference.setValue(newValue);

            expect(valueSetter).to.have.been.calledOnce;
            expect(valueSetter).to.have.been.calledWith(27);
        });

        it('should return the new value', function () {
            var newValue = valueFactory.createString('my new value');

            expect(reference.setValue(newValue)).to.equal(newValue);
        });
    });
});
