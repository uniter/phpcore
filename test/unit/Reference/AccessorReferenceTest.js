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
    beforeEach(function () {
        this.valueFactory = new ValueFactory();
        this.valueGetter = sinon.stub();
        this.valueSetter = sinon.spy();

        this.reference = new AccessorReference(this.valueFactory, this.valueGetter, this.valueSetter);
    });

    describe('concatWith()', function () {
        it('should append the given value to the result of the getter and pass it to the setter', function () {
            this.valueGetter.returns('hello');

            this.reference.concatWith(this.valueFactory.createString(' world'));

            expect(this.valueSetter).to.have.been.calledOnce;
            expect(this.valueSetter).to.have.been.calledWith('hello world');
        });
    });

    describe('decrementBy()', function () {
        it('should subtract the given value from the result of the getter and pass it to the setter', function () {
            this.valueGetter.returns(21);

            this.reference.decrementBy(this.valueFactory.createInteger(10));

            expect(this.valueSetter).to.have.been.calledOnce;
            expect(this.valueSetter).to.have.been.calledWith(11);
        });
    });

    describe('divideBy()', function () {
        it('should divide the result of the getter by the given value and pass it to the setter', function () {
            this.valueGetter.returns(40);

            this.reference.divideBy(this.valueFactory.createInteger(10));

            expect(this.valueSetter).to.have.been.calledOnce;
            expect(this.valueSetter).to.have.been.calledWith(4);
        });
    });

    describe('formatAsString()', function () {
        it('should return the native result of the getter, formatted', function () {
            this.valueGetter.returns('My native result');

            expect(this.reference.formatAsString()).to.equal('\'My native resul...\'');
        });
    });

    describe('getNative()', function () {
        it('should return result of the getter coerced to a PHP value', function () {
            this.valueGetter.returns(21);

            expect(this.reference.getNative()).to.equal(21);
        });
    });

    describe('getValue()', function () {
        it('should return the result of the getter coerced to a PHP value', function () {
            var value;
            this.valueGetter.returns(101);

            value = this.reference.getValue();

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(101);
        });
    });

    describe('incrementBy()', function () {
        it('should add the given value to the result of the getter and pass it to the setter', function () {
            this.valueGetter.returns(21);

            this.reference.incrementBy(this.valueFactory.createInteger(6));

            expect(this.valueSetter).to.have.been.calledOnce;
            expect(this.valueSetter).to.have.been.calledWith(27);
        });
    });

    describe('isDefined()', function () {
        it('should return true', function () {
            expect(this.reference.isDefined()).to.be.true;
        });
    });

    describe('multiplyBy()', function () {
        it('should multiply the result of the getter by the given value and pass it to the setter', function () {
            this.valueGetter.returns(4);

            this.reference.multiplyBy(this.valueFactory.createInteger(10));

            expect(this.valueSetter).to.have.been.calledOnce;
            expect(this.valueSetter).to.have.been.calledWith(40);
        });
    });

    describe('setValue()', function () {
        it('should call the setter with the value unwrapped for native JS', function () {
            var newValue = this.valueFactory.createInteger(27);

            this.reference.setValue(newValue);

            expect(this.valueSetter).to.have.been.calledOnce;
            expect(this.valueSetter).to.have.been.calledWith(27);
        });

        it('should return the new value', function () {
            var newValue = this.valueFactory.createString('my new value');

            expect(this.reference.setValue(newValue)).to.equal(newValue);
        });
    });
});
