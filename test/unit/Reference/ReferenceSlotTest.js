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
    tools = require('../tools'),
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot'),
    Value = require('../../../src/Value').sync();

describe('ReferenceSlot', function () {
    var reference,
        referenceFactory,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        referenceFactory = state.getReferenceFactory();
        valueFactory = state.getValueFactory();

        reference = new ReferenceSlot(valueFactory, referenceFactory);
    });

    describe('asArrayElement()', function () {
        it('should return the value of the slot for assignment', function () {
            var result,
                resultValue = sinon.createStubInstance(Value);
            resultValue.getForAssignment.returns(valueFactory.createString('my value for assignment'));
            reference.setValue(resultValue);

            result = reference.asArrayElement();

            expect(result.getType()).to.equal('string');
            expect(result.getNative()).to.equal('my value for assignment');
        });
    });

    describe('asEventualNative()', function () {
        it('should return a Future that resolves to the native value of the slot', async function () {
            reference.setValue(valueFactory.createString('my value'));

            expect(await reference.asEventualNative().toPromise()).to.equal('my value');
        });
    });

    describe('getForAssignment()', function () {
        it('should return the value of the slot', function () {
            var result = sinon.createStubInstance(Value);
            reference.setValue(result);

            expect(reference.getForAssignment()).to.equal(result);
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the slot', function () {
            reference.setValue(valueFactory.createString('the native value of my var'));

            expect(reference.getNative()).to.equal('the native value of my var');
        });
    });

    describe('getValue()', function () {
        it('should return the value of the slot', function () {
            var value = valueFactory.createString('the native value of my var');
            reference.setValue(value);

            expect(reference.getValue()).to.equal(value);
        });
    });

    describe('getValueOrNull()', function () {
        it('should return the value when the slot has one set', function () {
            var value = valueFactory.createString('my value');
            reference.setValue(value);

            expect(reference.getValueOrNull()).to.equal(value);
        });

        it('should return a NullValue when the slot has no value set', function () {
            expect(reference.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('hasReferenceSetter()', function () {
        it('should return false', function () {
            expect(reference.hasReferenceSetter()).to.be.false;
        });
    });

    describe('isReferenceable()', function () {
        it('should return true', function () {
            expect(reference.isReferenceable()).to.be.true;
        });
    });

    describe('setValue()', function () {
        it('should set the value of the slot to the new value', function () {
            var newValue = sinon.createStubInstance(Value);

            reference.setValue(newValue);

            expect(reference.getValue()).to.equal(newValue);
        });

        it('should return the new value', function () {
            var newValue = sinon.createStubInstance(Value);

            expect(reference.setValue(newValue)).to.equal(newValue);
        });
    });

    describe('toPromise()', function () {
        it('should return a Promise that resolves with the Value of the slot', async function () {
            var resultValue;
            reference.setValue(valueFactory.createString('my value'));

            resultValue = await reference.toPromise();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('my value');
        });
    });
});
