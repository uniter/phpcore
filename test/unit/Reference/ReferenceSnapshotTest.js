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
    Reference = require('../../../src/Reference/Reference'),
    ReferenceFactory = require('../../../src/ReferenceFactory').sync(),
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot'),
    ReferenceSnapshot = require('../../../src/Reference/ReferenceSnapshot');

describe('ReferenceSnapshot', function () {
    var createSnapshot,
        flow,
        futureFactory,
        reference,
        referenceFactory,
        snapshot,
        state,
        value,
        valueFactory,
        wrappedReference;

    beforeEach(function () {
        state = tools.createIsolatedState();
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        reference = null;
        referenceFactory = sinon.createStubInstance(ReferenceFactory);
        valueFactory = state.getValueFactory();
        value = valueFactory.createString('my value');
        wrappedReference = sinon.createStubInstance(Reference);

        wrappedReference.isReference.returns(false);
        wrappedReference.setValue.callsFake(function (assignedValue) {
            wrappedReference.getValue.returns(assignedValue);

            return assignedValue;
        });

        createSnapshot = function () {
            snapshot = new ReferenceSnapshot(
                valueFactory,
                referenceFactory,
                futureFactory,
                flow,
                wrappedReference,
                value,
                reference
            );
        };
    });

    describe('asValue()', function () {
        it('should return the value', function () {
            createSnapshot();

            expect(snapshot.asValue()).to.equal(value);
        });
    });

    describe('getReference()', function () {
        describe('when the snapshotted reference had no reference assigned', function () {
            it('should return a reference from the snapshotted one if one was assigned', function () {
                var slot = sinon.createStubInstance(ReferenceSlot);
                reference = sinon.createStubInstance(Reference);
                reference.getReference.returns(slot);
                createSnapshot();

                expect(snapshot.getReference()).to.equal(slot);
            });
        });

        describe('when the snapshotted reference had a reference assigned', function () {
            var syntheticReference;

            beforeEach(function () {
                syntheticReference = sinon.createStubInstance(ReferenceSlot);
                referenceFactory.createReferenceSlot.returns(syntheticReference);
                wrappedReference.isReference.returns(true);
            });

            it('should return a synthetic reference if the snapshotted reference had none assigned', function () {
                createSnapshot();

                expect(snapshot.getReference()).to.equal(syntheticReference);
            });

            it('should assign the value to the synthetic reference if the snapshot had one', function () {
                createSnapshot();

                snapshot.getReference();

                expect(syntheticReference.setValue).to.have.been.calledOnce;
                expect(syntheticReference.setValue).to.have.been.calledWith(sinon.match.same(value));
            });

            it('should not assign a value to the synthetic reference if the snapshot had none', function () {
                value = null;
                createSnapshot();

                snapshot.getReference();

                expect(syntheticReference.setValue).not.to.have.been.called;
            });

            it('should re-return the synthetic reference if one has been created', function () {
                createSnapshot();
                snapshot.getReference(); // Perform initial fetch.

                expect(snapshot.getReference()).to.equal(syntheticReference);
            });
        });
    });

    describe('getValue()', function () {
        describe('when the snapshotted reference had a value', function () {
            it('should return the value', function () {
                createSnapshot();

                expect(snapshot.getValue()).to.equal(value);
            });

            it('should not raise undefined for the snapshotted reference', function () {
                createSnapshot();

                snapshot.getValue();

                expect(wrappedReference.raiseUndefined).not.to.have.been.called;
            });
        });

        describe('when the snapshotted reference had no value', function () {
            var raiseUndefinedResult;

            beforeEach(function () {
                raiseUndefinedResult = valueFactory.createString('result of raiseUndefined');
                value = null;

                wrappedReference.raiseUndefined.returns(raiseUndefinedResult);
            });

            it('should return the result from .raiseUndefined()', function () {
                createSnapshot();

                expect(snapshot.getValue()).to.equal(raiseUndefinedResult);
            });

            it('should raise undefined for the snapshotted reference', function () {
                createSnapshot();

                snapshot.getValue();

                expect(wrappedReference.raiseUndefined).to.have.been.calledOnce;
            });
        });
    });

    describe('getWrappedReference()', function () {
        it('should return the snapshotted reference', function () {
            createSnapshot();

            expect(snapshot.getWrappedReference()).to.equal(wrappedReference);
        });
    });

    describe('isDefined()', function () {
        it('should return true when the snapshotted reference was defined', function () {
            createSnapshot();

            expect(snapshot.isDefined()).to.be.true;
        });

        it('should return false when the snapshotted reference was not defined', function () {
            value = null;
            createSnapshot();

            expect(snapshot.isDefined()).to.be.false;
        });
    });

    describe('isFuture()', function () {
        it('should return false', function () {
            createSnapshot();

            expect(snapshot.isFuture()).to.be.false;
        });
    });

    describe('isReference()', function () {
        it('should return true when the snapshotted reference was defined with a reference', function () {
            reference = sinon.createStubInstance(Reference);
            createSnapshot();

            expect(snapshot.isReference()).to.be.true;
        });

        it('should return false when the snapshotted reference was defined with a value', function () {
            createSnapshot();

            expect(snapshot.isReference()).to.be.false;
        });

        it('should return false when the snapshotted reference was not defined', function () {
            value = null;
            createSnapshot();

            expect(snapshot.isReference()).to.be.false;
        });
    });

    describe('setValue()', function () {
        it('should set the given value on the snapshotted reference', function () {
            var newValue = valueFactory.createString('my new value');
            createSnapshot();

            snapshot.setValue(newValue);

            expect(wrappedReference.setValue).to.have.been.calledOnce;
            expect(wrappedReference.setValue).to.have.been.calledWith(sinon.match.same(newValue));
        });

        it('should return the result from .setValue(...) on the snapshotted reference', function () {
            var newValue = valueFactory.createString('my new value'),
                result = valueFactory.createString('my setValue result');
            wrappedReference.setValue.returns(result);
            createSnapshot();

            expect(snapshot.setValue(newValue)).to.equal(result);
        });
    });

    describe('toPromise()', function () {
        it('should return a Promise that resolves to the ReferenceSnapshot', async function () {
            createSnapshot();

            expect(await snapshot.toPromise()).to.equal(snapshot);
        });
    });

    describe('yieldSync()', function () {
        it('should just return the snapshot', function () {
            createSnapshot();

            expect(snapshot.yieldSync()).to.equal(snapshot);
        });
    });
});
