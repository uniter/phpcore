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
    CallStack = require('../../../src/CallStack'),
    FFIFactory = require('../../../src/FFI/FFIFactory'),
    NativeCaller = require('../../../src/FFI/Call/NativeCaller').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    Value = require('../../../src/Value').sync(),
    ValueCaller = require('../../../src/FFI/Call/ValueCaller').sync();

describe('FFIFactory', function () {
    var AsyncObjectValue,
        callStack,
        factory,
        flow,
        futureFactory,
        nativeCaller,
        PHPObject,
        referenceFactory,
        ResultValue,
        state,
        valueCaller,
        ValueCoercer,
        valueFactory;

    beforeEach(function () {
        AsyncObjectValue = sinon.stub();
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState(null, {
            'call_stack': callStack
        });
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        nativeCaller = sinon.createStubInstance(NativeCaller);
        PHPObject = sinon.stub();
        referenceFactory = state.getReferenceFactory();
        ResultValue = sinon.stub();
        valueCaller = sinon.createStubInstance(ValueCaller);
        ValueCoercer = sinon.stub();
        valueFactory = state.getValueFactory();

        factory = new FFIFactory(
            AsyncObjectValue,
            PHPObject,
            ResultValue,
            ValueCoercer,
            valueFactory,
            referenceFactory,
            futureFactory,
            flow,
            callStack,
            nativeCaller,
            valueCaller
        );
    });

    describe('createAsyncObjectValue()', function () {
        it('should correctly construct the new AsyncObjectValue instance', function () {
            var wrappedObjectValue = sinon.createStubInstance(ObjectValue);

            factory.createAsyncObjectValue(wrappedObjectValue);

            expect(AsyncObjectValue).to.have.been.calledOnce;
            expect(AsyncObjectValue).to.have.been.calledWith(
                sinon.match.same(valueFactory),
                sinon.match.same(referenceFactory),
                sinon.match.same(futureFactory),
                sinon.match.same(callStack),
                sinon.match.same(flow),
                sinon.match.same(valueCaller),
                sinon.match.same(wrappedObjectValue)
            );
        });

        it('should return the created AsyncObjectValue instance', function () {
            var asyncObjectValue = sinon.createStubInstance(AsyncObjectValue),
                wrappedObjectValue = sinon.createStubInstance(ObjectValue);
            AsyncObjectValue.returns(asyncObjectValue);

            expect(factory.createAsyncObjectValue(wrappedObjectValue)).to.equal(asyncObjectValue);
        });
    });

    describe('createPHPObject()', function () {
        it('should correctly construct the new AsyncObjectValue instance', function () {
            var objectValue = sinon.createStubInstance(ObjectValue);

            factory.createPHPObject(objectValue);

            expect(PHPObject).to.have.been.calledOnce;
            expect(PHPObject).to.have.been.calledWith(
                sinon.match.same(valueFactory),
                sinon.match.same(nativeCaller),
                sinon.match.same(objectValue)
            );
        });

        it('should return the created PHPObject instance', function () {
            var phpObject = sinon.createStubInstance(PHPObject),
                objectValue = sinon.createStubInstance(ObjectValue);
            PHPObject.returns(phpObject);

            expect(factory.createPHPObject(objectValue)).to.equal(phpObject);
        });
    });

    describe('createResultValue()', function () {
        var internalValue;

        beforeEach(function () {
            internalValue = sinon.createStubInstance(Value);
        });

        it('should correctly construct the new ResultValue instance', function () {
            factory.createResultValue(internalValue, 'my native value');

            expect(ResultValue).to.have.been.calledOnce;
            expect(ResultValue).to.have.been.calledWith(
                sinon.match.same(internalValue),
                'my native value'
            );
        });

        it('should return the created ResultValue instance', function () {
            var resultValue = sinon.createStubInstance(ResultValue);
            ResultValue.returns(resultValue);

            expect(factory.createResultValue(internalValue, 'my native value')).to.equal(resultValue);
        });
    });

    describe('createValueCoercer()', function () {
        describe('for auto-coercing mode', function () {
            it('should correctly construct the new ValueCoercer instance', function () {
                factory.createValueCoercer(true);

                expect(ValueCoercer).to.have.been.calledOnce;
                expect(ValueCoercer).to.have.been.calledWith(sinon.match.same(flow), true);
            });

            it('should return the created ValueCoercer instance', function () {
                var coercer = sinon.createStubInstance(ValueCoercer);
                ValueCoercer
                    .withArgs(sinon.match.same(flow), true)
                    .returns(coercer);

                expect(factory.createValueCoercer(true)).to.equal(coercer);
            });

            it('should cache the created ValueCoercer instance', function () {
                var coercer = sinon.createStubInstance(ValueCoercer);
                ValueCoercer
                    .withArgs(sinon.match.same(flow), true)
                    .onFirstCall()
                    .callsFake(function () {
                        return coercer;
                    });
                factory.createValueCoercer(true); // First fetch

                expect(factory.createValueCoercer(true)).to.equal(coercer);
                expect(ValueCoercer).to.have.been.calledOnce;
            });
        });

        describe('for non-coercing mode', function () {
            it('should correctly construct the new ValueCoercer instance', function () {
                factory.createValueCoercer(false);

                expect(ValueCoercer).to.have.been.calledOnce;
                expect(ValueCoercer).to.have.been.calledWith(sinon.match.same(flow), false);
            });

            it('should return the created ValueCoercer instance', function () {
                var coercer = sinon.createStubInstance(ValueCoercer);
                ValueCoercer
                    .withArgs(sinon.match.same(flow), false)
                    .returns(coercer);

                expect(factory.createValueCoercer(false)).to.equal(coercer);
            });

            it('should cache the created ValueCoercer instance', function () {
                var coercer = sinon.createStubInstance(ValueCoercer);
                ValueCoercer
                    .withArgs(sinon.match.same(flow), false)
                    .onFirstCall()
                    .returns(coercer);
                factory.createValueCoercer(false); // First fetch

                expect(factory.createValueCoercer(false)).to.equal(coercer);
                expect(ValueCoercer).to.have.been.calledOnce;
            });
        });
    });
});
