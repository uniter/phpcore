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
    FFIFactory = require('../../../../src/FFI/FFIFactory'),
    ObjectValue = require('../../../../src/Value/Object').sync(),
    ProxyFactory = require('../../../../src/FFI/Value/Proxy/ProxyFactory'),
    ValueFactory = require('../../../../src/ValueFactory').sync(),
    ValueHelper = require('../../../../src/FFI/Value/ValueHelper'),
    ValueStorage = require('../../../../src/FFI/Value/ValueStorage');

describe('FFI ValueHelper', function () {
    var createHelper,
        ffiFactory,
        proxyFactory,
        valueHelper,
        valueFactory,
        valueStorage;

    beforeEach(function () {
        ffiFactory = sinon.createStubInstance(FFIFactory);
        proxyFactory = sinon.createStubInstance(ProxyFactory);
        valueStorage = sinon.createStubInstance(ValueStorage);
        valueFactory = new ValueFactory(null, null, null, null, null, null, valueStorage);

        createHelper = function (mode) {
            valueHelper = new ValueHelper(proxyFactory, ffiFactory, valueStorage, mode);
        };
        createHelper('psync');
    });

    describe('toNativeWithSyncApi()', function () {
        var objectValue,
            proxy,
            syncAPIReproxy;

        beforeEach(function () {
            objectValue = sinon.createStubInstance(ObjectValue);
            proxy = {my: 'proxy'};
            syncAPIReproxy = null; // Created by proxyFactory.create(...) stub below

            proxyFactory.create
                .withArgs(sinon.match.same(objectValue), true)
                .callsFake(function () {
                    syncAPIReproxy = {my: 'reproxy'};

                    return syncAPIReproxy;
                });

            valueStorage.getPrivatesForNativeProxy
                .withArgs(sinon.match.same(proxy))
                .returns({objectValue: objectValue});
            valueStorage.hasPrivatesForNativeProxy
                .withArgs(sinon.match.same(proxy))
                .returns(true);
        });

        it('should just return the proxy object in sync mode', function () {
            createHelper('sync');

            expect(valueHelper.toNativeWithSyncApi(proxy)).to.equal(proxy);
        });

        it('should throw in async mode', function () {
            createHelper('async');

            expect(function () {
                valueHelper.toNativeWithSyncApi(proxy);
            }).to.throw(
                'ValueHelper.toNativeWithSyncApi() :: Unable to provide a synchronous API in async mode'
            );
        });

        it('should always return the same re-proxy with a sync API', function () {
            var firstSyncAPIReproxy = valueHelper.toNativeWithSyncApi(proxy),
                secondSyncAPIReproxy = valueHelper.toNativeWithSyncApi(proxy);

            expect(secondSyncAPIReproxy).to.equal(firstSyncAPIReproxy);
        });

        it('should always map a reproxy back to itself', function () {
            var firstSyncAPIReproxy = valueHelper.toNativeWithSyncApi(proxy),
                secondSyncAPIReproxy = valueHelper.toNativeWithSyncApi(firstSyncAPIReproxy);

            expect(secondSyncAPIReproxy).to.equal(firstSyncAPIReproxy);
        });

        it('should throw when an invalid proxy is given', function () {
            valueStorage.getPrivatesForNativeProxy
                .withArgs(sinon.match.same(proxy))
                .returns(null);
            valueStorage.hasPrivatesForNativeProxy
                .withArgs(sinon.match.same(proxy))
                .returns(false);

            expect(function () {
                valueHelper.toNativeWithSyncApi(proxy);
            }).to.throw(
                'ValueHelper.toNativeWithSyncApi() :: Invalid proxy instance given'
            );
        });

        it('should map the reproxy to its ObjectValue in the ValueStorage', function () {
            valueHelper.toNativeWithSyncApi(proxy);

            expect(valueStorage.setObjectValueForExport).to.have.been.calledOnce;
            expect(valueStorage.setObjectValueForExport).to.have.been.calledWith(
                sinon.match.same(syncAPIReproxy),
                sinon.match.same(objectValue)
            );
        });
    });

    describe('toValueWithAsyncApi()', function () {
        var asyncObjectValue,
            objectValue;

        beforeEach(function () {
            asyncObjectValue = sinon.createStubInstance(AsyncObjectValue);
            objectValue = sinon.createStubInstance(ObjectValue);

            ffiFactory.createAsyncObjectValue
                .withArgs(sinon.match.same(objectValue))
                .returns(asyncObjectValue);
        });

        it('should return an AsyncObjectValue from the FFIFactory', function () {
            expect(valueHelper.toValueWithAsyncApi(objectValue)).to.equal(asyncObjectValue);
        });
    });
});
