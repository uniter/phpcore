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
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    tools = require('../../../tools'),
    Exception = phpCommon.Exception,
    CallStack = require('../../../../../src/CallStack'),
    Reference = require('../../../../../src/Reference/Reference'),
    ReferenceSnapshot = require('../../../../../src/Reference/ReferenceSnapshot'),
    ReferenceFactory = require('../../../../../src/ReferenceFactory').sync(),
    SnapshotType = require('../../../../../src/Core/Opcode/Type/SnapshotType'),
    Variable = require('../../../../../src/Variable').sync();

describe('Opcode SnapshotType', function () {
    var callStack,
        referenceFactory,
        state,
        type,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        referenceFactory = sinon.createStubInstance(ReferenceFactory);
        valueFactory = state.getValueFactory();

        referenceFactory.createSnapshot.callsFake(function (wrappedReference, snapshotValue) {
            var snapshot = sinon.createStubInstance(ReferenceSnapshot);

            snapshot.getValue.returns(snapshotValue || null);
            snapshot.getWrappedReference.returns(wrappedReference);

            return snapshot;
        });

        type = new SnapshotType(valueFactory, referenceFactory);
    });

    describe('coerceValue()', function () {
        it('should return the value when given a Value', function () {
            var value = valueFactory.createString('my string');

            expect(type.coerceValue(value)).to.equal(value);
        });

        it('should return the snapshot when given a ReferenceSnapshot', function () {
            var snapshot = sinon.createStubInstance(ReferenceSnapshot);

            expect(type.coerceValue(snapshot)).to.equal(snapshot);
        });

        it('should throw when given a native string', function () {
            expect(function () {
                type.coerceValue('my string');
            }).to.throw(
                Exception,
                'Unexpected value provided for SnapshotType'
            );
        });

        describe('when given a Reference', function () {
            var reference;

            beforeEach(function () {
                reference = sinon.createStubInstance(Reference);

                reference.getValueOrNativeNull.returns(valueFactory.createAsyncPresent('my value'));
            });

            it('should return a ReferenceSnapshot with the snapshotted value when defined', async function () {
                var snapshot;

                snapshot = await type.coerceValue(reference).toPromise();

                expect(snapshot).to.be.an.instanceOf(ReferenceSnapshot);
                expect(snapshot.getWrappedReference()).to.equal(reference);
                expect(snapshot.getValue().getNative()).to.equal('my value');
            });

            it('should return a ReferenceSnapshot representing undefined when undefined', function () {
                var snapshot;
                reference.getValueOrNativeNull.returns(null);

                snapshot = type.coerceValue(reference);

                expect(snapshot).to.be.an.instanceOf(ReferenceSnapshot);
                expect(snapshot.getWrappedReference()).to.equal(reference);
                expect(snapshot.getValue()).to.be.null;
            });
        });

        describe('when given a Variable', function () {
            var variable;

            beforeEach(function () {
                variable = sinon.createStubInstance(Variable);

                variable.getValueOrNativeNull.returns(valueFactory.createAsyncPresent('my value'));
            });

            it('should return a ReferenceSnapshot with the snapshotted value when defined', async function () {
                var snapshot;

                snapshot = await type.coerceValue(variable).toPromise();

                expect(snapshot).to.be.an.instanceOf(ReferenceSnapshot);
                expect(snapshot.getWrappedReference()).to.equal(variable);
                expect(snapshot.getValue().getNative()).to.equal('my value');
            });

            it('should return a ReferenceSnapshot representing undefined when undefined', function () {
                var snapshot;
                variable.getValueOrNativeNull.returns(null);

                snapshot = type.coerceValue(variable);

                expect(snapshot).to.be.an.instanceOf(ReferenceSnapshot);
                expect(snapshot.getWrappedReference()).to.equal(variable);
                expect(snapshot.getValue()).to.be.null;
            });
        });
    });
});
