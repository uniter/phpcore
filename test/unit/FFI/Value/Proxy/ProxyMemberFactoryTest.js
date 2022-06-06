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
    tools = require('../../../tools'),
    ControlScope = require('../../../../../src/Control/ControlScope'),
    NativeCaller = require('../../../../../src/FFI/Call/NativeCaller').sync(),
    ObjectValue = require('../../../../../src/Value/Object').sync(),
    ProxyMemberFactory = require('../../../../../src/FFI/Value/Proxy/ProxyMemberFactory'),
    ValueStorage = require('../../../../../src/FFI/Value/ValueStorage');

describe('FFI ProxyMemberFactory', function () {
    var controlScope,
        factory,
        nativeCaller,
        objectValue,
        state,
        valueFactory,
        valueStorage;

    beforeEach(function () {
        controlScope = sinon.createStubInstance(ControlScope);
        state = tools.createIsolatedState('async', {
            'control_scope': controlScope
        });
        objectValue = sinon.createStubInstance(ObjectValue);
        nativeCaller = sinon.createStubInstance(NativeCaller);
        valueStorage = sinon.createStubInstance(ValueStorage);
        valueFactory = state.getValueFactory();

        controlScope.enterCoroutine.resetHistory();

        factory = new ProxyMemberFactory(
            valueFactory,
            valueStorage,
            nativeCaller,
            controlScope
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

            it('should enter a new Coroutine', function () {
                proxyMethod.call(nativeProxy, 'first arg', 'second arg');

                expect(controlScope.enterCoroutine).to.have.been.calledOnce;
            });

            it('should enter a new Coroutine before invoking NativeCaller', function () {
                proxyMethod.call(nativeProxy, 'first arg', 'second arg');

                expect(controlScope.enterCoroutine)
                    .to.have.been.calledBefore(factory.nativeCaller.callMethod);
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
