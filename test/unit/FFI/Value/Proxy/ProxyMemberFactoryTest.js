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
    NativeCaller = require('../../../../../src/FFI/Call/NativeCaller').sync(),
    ObjectValue = require('../../../../../src/Value/Object').sync(),
    ProxyMemberFactory = require('../../../../../src/FFI/Value/Proxy/ProxyMemberFactory'),
    ValueFactory = require('../../../../../src/ValueFactory').sync(),
    ValueStorage = require('../../../../../src/FFI/Value/ValueStorage');

describe('FFI ProxyMemberFactory', function () {
    var factory,
        nativeCaller,
        objectValue,
        valueFactory,
        valueStorage;

    beforeEach(function () {
        objectValue = sinon.createStubInstance(ObjectValue);
        nativeCaller = sinon.createStubInstance(NativeCaller);
        valueStorage = sinon.createStubInstance(ValueStorage);
        valueFactory = new ValueFactory(null, null, null, null, null, null, valueStorage);

        factory = new ProxyMemberFactory(
            valueFactory,
            valueStorage,
            nativeCaller
        );
    });

    describe('createProxyMethod()', function () {
        it('should return a proxy method function', function () {
            expect(factory.createProxyMethod('myMethod')).to.be.a('function');
        });

        describe('the proxy method function returned', function () {
            var nativeProxy,
                proxyMethod;

            beforeEach(function () {
                nativeProxy = {my: 'proxy'};
                proxyMethod = factory.createProxyMethod('myMethod');

                valueStorage.getPrivatesForNativeProxy
                    .withArgs(sinon.match.same(nativeProxy))
                    .returns({
                        objectValue: objectValue,
                        useSyncApiAlthoughPsync: true
                    });
            });

            it('should have the inbound stack marker as its name for stack cleaning', function () {
                expect(proxyMethod.name).to.equal('__uniterInboundStackMarker__');
            });

            it('should call the method via the NativeCaller with args coerced when useSyncApiAlthoughPsync=true', function () {
                proxyMethod.call(nativeProxy, 'first arg', 'second arg');

                expect(factory.nativeCaller.callMethod).to.have.been.calledOnce;
                expect(factory.nativeCaller.callMethod).to.have.been.calledWith(
                    sinon.match.same(objectValue),
                    'myMethod',
                    sinon.match.any, // Arguments array: see below assertion
                    true
                );
                expect(factory.nativeCaller.callMethod.args[0][2][0].getType()).to.equal('string');
                expect(factory.nativeCaller.callMethod.args[0][2][0].getNative()).to.equal('first arg');
                expect(factory.nativeCaller.callMethod.args[0][2][1].getType()).to.equal('string');
                expect(factory.nativeCaller.callMethod.args[0][2][1].getNative()).to.equal('second arg');
            });

            it('should support useSyncApiAlthoughPsync=false', function () {
                valueStorage.getPrivatesForNativeProxy
                    .withArgs(sinon.match.same(nativeProxy))
                    .returns({
                        objectValue: objectValue,
                        useSyncApiAlthoughPsync: false
                    });

                proxyMethod.call(nativeProxy, 'first arg', 'second arg');

                expect(factory.nativeCaller.callMethod).to.have.been.calledOnce;
                expect(factory.nativeCaller.callMethod).to.have.been.calledWith(
                    sinon.match.any, // ObjectValue
                    sinon.match.any, // Method name
                    sinon.match.any, // Arguments array
                    false
                );
            });

            it('should return the result from the NativeCaller', function () {
                factory.nativeCaller.callMethod
                    .withArgs(
                        sinon.match.same(objectValue),
                        'myMethod'
                    )
                    .returns('my result');

                expect(proxyMethod.call(nativeProxy)).to.equal('my result');
            });
        });
    });
});
