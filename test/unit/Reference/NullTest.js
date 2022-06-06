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
    NullReference = require('../../../src/Reference/Null'),
    Value = require('../../../src/Value').sync();

describe('NullReference', function () {
    var futureFactory,
        onSet,
        reference,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();
        onSet = sinon.spy();

        reference = new NullReference(valueFactory, futureFactory, {
            onSet: onSet
        });
    });

    describe('asArrayElement()', function () {
        it('should return the value Null', function () {
            expect(reference.asArrayElement().getType()).to.equal('null');
        });
    });

    describe('asEventualNative()', function () {
        it('should return a Future that resolves to null', async function () {
            expect(await reference.asEventualNative().toPromise()).to.be.null;
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

    describe('hasReferenceSetter()', function () {
        it('should return false', function () {
            expect(reference.hasReferenceSetter()).to.be.false;
        });
    });

    describe('isDefined()', function () {
        it('should return false', function () {
            expect(reference.isDefined()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true', async function () {
            expect(await reference.isEmpty().toPromise()).to.be.true;
        });
    });

    describe('isReferenceable()', function () {
        it('should return true', function () {
            expect(reference.isReferenceable()).to.be.true;
        });
    });

    describe('isSet()', function () {
        it('should return false', async function () {
            expect(await reference.isSet().toPromise()).to.be.false;
        });
    });

    describe('setValue()', function () {
        it('should call the `onSet()` callback once', function () {
            reference.setValue(sinon.createStubInstance(Value));

            expect(onSet).to.have.been.calledOnce;
        });

        it('should return the assigned value', function () {
            var value = sinon.createStubInstance(Value);

            expect(reference.setValue(value)).to.equal(value);
        });
    });

    describe('toPromise()', function () {
        it('should return a Promise that resolves to a NullValue', async function () {
            var resultValue = await reference.toPromise();

            expect(resultValue.getType()).to.equal('null');
        });
    });
});
