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
    var flow,
        futureFactory,
        onSet,
        reference,
        referenceFactory,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        referenceFactory = state.getReferenceFactory();
        valueFactory = state.getValueFactory();
        onSet = sinon.spy();

        reference = new NullReference(valueFactory, referenceFactory, futureFactory, flow, {
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

    describe('asValue()', function () {
        it('should return the value Null', function () {
            expect(reference.asValue().getType()).to.equal('null');
        });
    });

    describe('getNative()', function () {
        it('should return null', function () {
            expect(reference.getNative()).to.be.null;
        });
    });

    describe('getReference()', function () {
        it('should return the reference itself', function () {
            expect(reference.getReference()).to.equal(reference);
        });
    });

    describe('getValue()', function () {
        it('should return the value Null', function () {
            expect(reference.getValue().getType()).to.equal('null');
        });
    });

    describe('getValueOrNativeNull()', function () {
        it('should return native null', function () {
            expect(reference.getValueOrNativeNull()).to.be.null;
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

    describe('isFuture()', function () {
        it('should return false', function () {
            expect(reference.isFuture()).to.be.false;
        });
    });

    describe('isReference()', function () {
        it('should return false', function () {
            expect(reference.isReference()).to.be.false;
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

    describe('raiseUndefined()', function () {
        it('should return null', function () {
            expect(reference.raiseUndefined().getNative()).to.be.null;
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
        it('should return a Promise that resolves to the NullReference', async function () {
            expect(await reference.toPromise()).to.equal(reference);
        });
    });

    describe('yieldSync()', function () {
        it('should just return the reference', function () {
            expect(reference.yieldSync()).to.equal(reference);
        });
    });
});
