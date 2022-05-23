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
    ResultValue = require('../../../../src/FFI/Value/ResultValue'),
    Value = require('../../../../src/Value').sync();

describe('ResultValue', function () {
    var internalValue,
        nativeValue,
        presentNativeValue,
        proxyValue,
        state,
        value,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        valueFactory = state.getValueFactory();
        internalValue = sinon.createStubInstance(Value);
        nativeValue = {my: 'real native value'};
        presentNativeValue = {my: 'present native value'};
        proxyValue = {my: 'proxy value'};

        internalValue.getType.returns('object');
        internalValue.getNative.returns(nativeValue);
        internalValue.getProxy.returns(proxyValue);

        value = new ResultValue(internalValue, presentNativeValue);
    });

    describe('getInternalValue()', function () {
        it('should return the internal Value', function () {
            expect(value.getInternalValue()).to.equal(internalValue);
        });
    });

    describe('getNative()', function () {
        it('should return the present native value', function () {
            expect(value.getNative()).to.equal(presentNativeValue);
        });
    });

    describe('getProxy()', function () {
        it('should return the proxy for an internal ObjectValue', function () {
            internalValue.getType.returns('object');

            expect(value.getProxy()).to.equal(proxyValue);
        });

        it('should return the present native value for an internal non-object Value', function () {
            internalValue.getType.returns('string');
            internalValue.getNative.returns('my string');

            expect(value.getProxy()).to.equal(presentNativeValue);
        });
    });

    describe('getStatus()', function () {
        it('should return the status for an internal ExitValue', function () {
            internalValue.getType.returns('exit');
            internalValue.getStatus.returns(21);

            expect(value.getStatus()).to.equal(21);
        });

        it('should return null for an internal non-exit Value', function () {
            internalValue.getType.returns('string');
            internalValue.getNative.returns('my string');

            expect(value.getStatus()).to.be.null;
        });
    });

    describe('getType()', function () {
        it('should return the type of the internal Value', function () {
            expect(value.getType()).to.equal('object');
        });
    });
});
