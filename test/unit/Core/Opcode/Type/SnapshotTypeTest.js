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
    KeyReferencePair = require('../../../../../src/KeyReferencePair'),
    KeyValuePair = require('../../../../../src/KeyValuePair'),
    Reference = require('../../../../../src/Reference/Reference'),
    ReferenceElement = require('../../../../../src/Element/ReferenceElement'),
    ReferenceSnapshot = require('../../../../../src/Reference/ReferenceSnapshot'),
    ReferenceFactory = require('../../../../../src/ReferenceFactory').sync(),
    SnapshotType = require('../../../../../src/Core/Opcode/Type/SnapshotType'),
    Value = require('../../../../../src/Value').sync(),
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

    describe('allowsValue()', function () {
        it('should return true for a ReferenceSnapshot instance', function () {
            var value = sinon.createStubInstance(ReferenceSnapshot);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return true for a non-ReferenceSnapshot Reference instance', function () {
            var value = sinon.createStubInstance(Reference);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return false for a ReferenceElement instance', function () {
            var value = sinon.createStubInstance(ReferenceElement);

            expect(type.allowsValue(value)).to.be.false;
        });

        it('should return false for a KeyReferencePair instance', function () {
            var value = sinon.createStubInstance(KeyReferencePair);

            expect(type.allowsValue(value)).to.be.false;
        });

        it('should return false for a KeyValuePair instance', function () {
            var value = sinon.createStubInstance(KeyValuePair);

            expect(type.allowsValue(value)).to.be.false;
        });

        it('should return false for a Value instance', function () {
            var value = sinon.createStubInstance(Value);

            expect(type.allowsValue(value)).to.be.false;
        });

        it('should return true for a Variable instance', function () {
            var value = sinon.createStubInstance(Variable);

            expect(type.allowsValue(value)).to.be.true;
        });

        it('should return false for a native string', function () {
            expect(type.allowsValue('my string')).to.be.false;
        });
    });

    describe('coerceValue()', function () {
        it('should return the snapshot when given a ReferenceSnapshot', function () {
            var snapshot = sinon.createStubInstance(ReferenceSnapshot);

            expect(type.coerceValue(snapshot)).to.equal(snapshot);
        });

        it('should throw when given a ReferenceElement', function () {
            var element = sinon.createStubInstance(ReferenceElement);

            expect(function () {
                type.coerceValue(element);
            }).to.throw(
                Exception,
                'Unexpected value provided for SnapshotType'
            );
        });

        it('should throw when given a KeyReferencePair', function () {
            var pair = sinon.createStubInstance(KeyReferencePair);

            expect(function () {
                type.coerceValue(pair);
            }).to.throw(
                Exception,
                'Unexpected value provided for SnapshotType'
            );
        });

        it('should throw when given a KeyValuePair', function () {
            var pair = sinon.createStubInstance(KeyValuePair);

            expect(function () {
                type.coerceValue(pair);
            }).to.throw(
                Exception,
                'Unexpected value provided for SnapshotType'
            );
        });

        it('should throw when given a Value', function () {
            var value = valueFactory.createString('my string');

            expect(function () {
                type.coerceValue(value);
            }).to.throw(
                Exception,
                'SnapshotType cannot accept Values'
            );
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

    describe('getDisplayName()', function () {
        it('should return "snapshot"', function () {
            expect(type.getDisplayName()).to.equal('snapshot');
        });
    });
});
