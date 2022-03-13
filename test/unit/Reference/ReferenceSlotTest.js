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

    describe('getForAssignment()', function () {
        it('should return the value of the variable', function () {
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

    describe('isReferenceable()', function () {
        it('should return true', function () {
            expect(reference.isReferenceable()).to.be.true;
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
