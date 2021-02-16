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
    AsyncObjectValue = require('../../../../src/FFI/Value/AsyncObjectValue').sync(),
    CallStack = require('../../../../src/CallStack'),
    ObjectValue = require('../../../../src/Value/Object').sync(),
    Value = require('../../../../src/Value').sync(),
    ValueCaller = require('../../../../src/FFI/Call/ValueCaller').sync(),
    ValueFactory = require('../../../../src/ValueFactory').sync();

describe('FFI AsyncObjectValue', function () {
    var callStack,
        nativeObject,
        value,
        valueCaller,
        valueFactory,
        wrappedObjectValue;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        nativeObject = {my: 'native object'};
        valueCaller = sinon.createStubInstance(ValueCaller);
        valueFactory = new ValueFactory();
        wrappedObjectValue = sinon.createStubInstance(ObjectValue);

        wrappedObjectValue.getObject.returns(nativeObject);

        value = new AsyncObjectValue(
            valueFactory,
            callStack,
            valueCaller,
            wrappedObjectValue
        );
    });

    it('should extend Value', function () {
        expect(value).to.be.an.instanceOf(Value);
    });

    describe('constructor()', function () {
        it('should use the native object from the wrapped ObjectValue', function () {
            expect(value.getNative()).to.equal(nativeObject);
        });
    });

    describe('getType()', function () {
        it('should return "object"', function () {
            expect(value.getType()).to.equal('object');
        });
    });

    describe('callMethod()', function () {
        it('should call the method via the ValueCaller', function () {
            value.callMethod('myMethod', ['first arg', 101]);

            expect(value.valueCaller.callMethod).to.have.been.calledOnce;
            expect(value.valueCaller.callMethod).to.have.been.calledWith(
                sinon.match.same(wrappedObjectValue),
                'myMethod',
                ['first arg', 101]
            );
        });

        it('should return the result from the ValueCaller', function () {
            var resultValue = valueFactory.createString('my result');
            value.valueCaller.callMethod
                .withArgs(
                    sinon.match.same(wrappedObjectValue),
                    'myMethod',
                    ['first arg', 101]
                )
                .returns(resultValue);

            expect(value.callMethod('myMethod', ['first arg', 101])).to.equal(resultValue);
        });
    });
});
