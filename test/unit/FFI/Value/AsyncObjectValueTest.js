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
    tools = require('../../tools'),
    AsyncObjectValue = require('../../../../src/FFI/Value/AsyncObjectValue').sync(),
    CallStack = require('../../../../src/CallStack'),
    FutureValue = require('../../../../src/Value/Future'),
    ObjectValue = require('../../../../src/Value/Object').sync(),
    Value = require('../../../../src/Value').sync(),
    ValueCaller = require('../../../../src/FFI/Call/ValueCaller').sync();

describe('FFI AsyncObjectValue', function () {
    var callStack,
        state,
        value,
        valueCaller,
        valueFactory,
        wrappedObjectFutureValue,
        wrappedObjectPresentValue;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState(null, {
            'call_stack': callStack
        });
        valueCaller = sinon.createStubInstance(ValueCaller);
        valueFactory = state.getValueFactory();
        wrappedObjectFutureValue = sinon.createStubInstance(FutureValue);
        wrappedObjectPresentValue = sinon.createStubInstance(ObjectValue);
        wrappedObjectFutureValue.toPromise.returns(Promise.resolve(wrappedObjectPresentValue));

        value = new AsyncObjectValue(
            valueFactory,
            state.getReferenceFactory(),
            state.getFutureFactory(),
            callStack,
            valueCaller,
            wrappedObjectFutureValue
        );
    });

    it('should extend Value', function () {
        expect(value).to.be.an.instanceOf(Value);
    });

    describe('constructor()', function () {
        it('should use null as the native object', function () {
            expect(value.getNative()).to.be.null;
        });
    });

    describe('getType()', function () {
        it('should return "object"', function () {
            expect(value.getType()).to.equal('object');
        });
    });

    describe('callMethod()', function () {
        it('should call the method via the ValueCaller', async function () {
            await value.callMethod('myMethod', ['first arg', 101]);

            expect(value.valueCaller.callMethod).to.have.been.calledOnce;
            expect(value.valueCaller.callMethod).to.have.been.calledWith(
                sinon.match.same(wrappedObjectPresentValue),
                'myMethod',
                ['first arg', 101]
            );
        });

        it('should return the result from the ValueCaller', async function () {
            var resultValue = valueFactory.createString('my result');
            value.valueCaller.callMethod
                .withArgs(
                    sinon.match.same(wrappedObjectPresentValue),
                    'myMethod',
                    ['first arg', 101]
                )
                .returns(resultValue);

            expect(await value.callMethod('myMethod', ['first arg', 101])).to.equal(resultValue);
        });
    });
});
