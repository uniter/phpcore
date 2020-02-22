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
    NullReference = require('../../../src/Reference/Null'),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('NullReference', function () {
    beforeEach(function () {
        this.valueFactory = new ValueFactory();
        this.onSet = sinon.spy();

        this.reference = new NullReference(this.valueFactory, {
            onSet: this.onSet
        });
    });

    describe('concatWith()', function () {
        it('should call the `onSet()` callback once', function () {
            this.reference.concatWith(this.valueFactory.createString(' world'));

            expect(this.onSet).to.have.been.calledOnce;
        });
    });

    describe('decrementBy()', function () {
        it('should call the `onSet()` callback once', function () {
            this.reference.setValue(this.valueFactory.createInteger(20));
            this.onSet.resetHistory();

            this.reference.decrementBy(this.valueFactory.createInteger(4));

            expect(this.onSet).to.have.been.calledOnce;
        });
    });

    describe('divideBy()', function () {
        it('should call the `onSet()` callback once', function () {
            this.reference.setValue(this.valueFactory.createInteger(20));
            this.onSet.resetHistory();

            this.reference.divideBy(this.valueFactory.createInteger(4));

            expect(this.onSet).to.have.been.calledOnce;
        });
    });

    describe('getNative()', function () {
        it('should return null', function () {
            expect(this.reference.getNative()).to.be.null;
        });
    });

    describe('getValue()', function () {
        it('should return the value Null', function () {
            expect(this.reference.getValue().getType()).to.equal('null');
        });
    });

    describe('incrementBy()', function () {
        it('should call the `onSet()` callback once', function () {
            this.reference.setValue(this.valueFactory.createInteger(20));
            this.onSet.resetHistory();

            this.reference.incrementBy(this.valueFactory.createInteger(4));

            expect(this.onSet).to.have.been.calledOnce;
        });
    });

    describe('isEmpty()', function () {
        it('should return true', function () {
            expect(this.reference.isEmpty()).to.be.true;
        });
    });

    describe('isSet()', function () {
        it('should return false', function () {
            expect(this.reference.isSet()).to.be.false;
        });
    });

    describe('multiplyBy()', function () {
        it('should call the `onSet()` callback once', function () {
            this.reference.setValue(this.valueFactory.createInteger(20));
            this.onSet.resetHistory();

            this.reference.multiplyBy(this.valueFactory.createInteger(4));

            expect(this.onSet).to.have.been.calledOnce;
        });
    });

    describe('setValue()', function () {
        it('should call the `onSet()` callback once', function () {
            this.reference.setValue(sinon.createStubInstance(Value));

            expect(this.onSet).to.have.been.calledOnce;
        });
    });
});
