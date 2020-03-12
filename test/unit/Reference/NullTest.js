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
    var onSet,
        reference,
        valueFactory;

    beforeEach(function () {
        valueFactory = new ValueFactory();
        onSet = sinon.spy();

        reference = new NullReference(valueFactory, {
            onSet: onSet
        });
    });

    describe('concatWith()', function () {
        it('should call the `onSet()` callback once', function () {
            reference.concatWith(valueFactory.createString(' world'));

            expect(onSet).to.have.been.calledOnce;
        });
    });

    describe('decrementBy()', function () {
        it('should call the `onSet()` callback once', function () {
            reference.setValue(valueFactory.createInteger(20));
            onSet.resetHistory();

            reference.decrementBy(valueFactory.createInteger(4));

            expect(onSet).to.have.been.calledOnce;
        });
    });

    describe('divideBy()', function () {
        it('should call the `onSet()` callback once', function () {
            reference.setValue(valueFactory.createInteger(20));
            onSet.resetHistory();

            reference.divideBy(valueFactory.createInteger(4));

            expect(onSet).to.have.been.calledOnce;
        });
    });

    describe('formatAsString()', function () {
        it('should return "NULL"', function () {
            expect(reference.formatAsString()).to.equal('NULL');
        });
    });

    describe('getNative()', function () {
        it('should return null', function () {
            expect(reference.getNative()).to.be.null;
        });
    });

    describe('getValue()', function () {
        it('should return the value Null', function () {
            expect(reference.getValue().getType()).to.equal('null');
        });
    });

    describe('getValueOrNull()', function () {
        it('should return a NullValue', function () {
            expect(reference.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('incrementBy()', function () {
        it('should call the `onSet()` callback once', function () {
            reference.setValue(valueFactory.createInteger(20));
            onSet.resetHistory();

            reference.incrementBy(valueFactory.createInteger(4));

            expect(onSet).to.have.been.calledOnce;
        });
    });

    describe('isDefined()', function () {
        it('should return false', function () {
            expect(reference.isDefined()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true', function () {
            expect(reference.isEmpty()).to.be.true;
        });
    });

    describe('isSet()', function () {
        it('should return false', function () {
            expect(reference.isSet()).to.be.false;
        });
    });

    describe('multiplyBy()', function () {
        it('should call the `onSet()` callback once', function () {
            reference.setValue(valueFactory.createInteger(20));
            onSet.resetHistory();

            reference.multiplyBy(valueFactory.createInteger(4));

            expect(onSet).to.have.been.calledOnce;
        });
    });

    describe('setValue()', function () {
        it('should call the `onSet()` callback once', function () {
            reference.setValue(sinon.createStubInstance(Value));

            expect(onSet).to.have.been.calledOnce;
        });
    });
});
