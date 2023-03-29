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
    var flow,
        futureFactory,
        reference,
        referenceFactory,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        referenceFactory = state.getReferenceFactory();
        valueFactory = state.getValueFactory();

        reference = new ReferenceSlot(valueFactory, referenceFactory, futureFactory, flow);
    });

    describe('asArrayElement()', function () {
        it('should return the value of the slot for assignment', function () {
            var result,
                resultValue = sinon.createStubInstance(Value);
            resultValue.getForAssignment.returns(valueFactory.createString('my value for assignment'));
            resultValue.next.callsArgWith(0, resultValue);
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

    describe('asValue()', function () {
        it('should return the value of the slot', function () {
            var value = valueFactory.createString('the native value of my var');
            reference.setValue(value);

            expect(reference.asValue()).to.equal(value);
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

    describe('getValueOrNativeNull()', function () {
        it('should return the value when the slot has one set', function () {
            var value = valueFactory.createString('my value');
            reference.setValue(value);

            expect(reference.getValueOrNativeNull()).to.equal(value);
        });

        // ReferenceSlots are always defined, so native null should never be returned.
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

    describe('isReference()', function () {
        it('should return false as ReferenceSlots cannot themselves have references assigned', function () {
            expect(reference.isReference()).to.be.false;
        });
    });

    describe('isReferenceable()', function () {
        it('should return true', function () {
            expect(reference.isReferenceable()).to.be.true;
        });
    });

    describe('isSet()', function () {
        it('should return true when the slot has a set value assigned', async function () {
            reference.setValue(valueFactory.createString('my value'));

            expect(await reference.isSet().toPromise()).to.be.true;
        });

        it('should return true when the slot has null assigned', async function () {
            expect(await reference.isSet().toPromise()).to.be.false;
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
        it('should return a Promise that resolves to the ReferenceSlot', async function () {
            expect(await reference.toPromise()).to.equal(reference);
        });
    });
});
