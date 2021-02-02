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
    Class = require('../../../../../src/Class').sync(),
    ObjectValue = require('../../../../../src/Value/Object').sync(),
    ProxyClassFactory = require('../../../../../src/FFI/Value/Proxy/ProxyClassFactory'),
    ProxyMemberFactory = require('../../../../../src/FFI/Value/Proxy/ProxyMemberFactory'),
    ValueStorage = require('../../../../../src/FFI/Value/ValueStorage');

describe('FFI ProxyClassFactory', function () {
    var classObject,
        factory,
        InternalClass,
        InternalSuperClass,
        proxyMemberFactory,
        valueStorage;

    beforeEach(function () {
        classObject = sinon.createStubInstance(Class);
        InternalSuperClass = sinon.stub();
        InternalClass = function () {};
        InternalClass.prototype = Object.create(InternalSuperClass.prototype);
        proxyMemberFactory = sinon.createStubInstance(ProxyMemberFactory);
        valueStorage = sinon.createStubInstance(ValueStorage);

        classObject.getInternalClass.returns(InternalClass);
        classObject.getSuperClass.returns(null);

        factory = new ProxyClassFactory(valueStorage, proxyMemberFactory);
    });

    describe('create()', function () {
        var callCreate,
            objectValue,
            ProxyClass;

        beforeEach(function () {
            objectValue = sinon.createStubInstance(ObjectValue);
            ProxyClass = null; // Set by callCreate() below

            callCreate = function () {
                ProxyClass = factory.create(classObject);
            };
        });

        it('should return the created ProxyClass', function () {
            callCreate();

            expect(ProxyClass).to.be.a('function');
        });

        describe('the created ProxyClass', function () {
            describe('constructor()', function () {
                it('should store the privates data for the native proxy', function () {
                    var proxy;
                    callCreate();

                    proxy = new ProxyClass(objectValue, true);

                    expect(proxy).to.be.an.instanceOf(ProxyClass);
                    expect(valueStorage.setPrivatesForNativeProxy).to.have.been.calledOnce;
                    expect(valueStorage.setPrivatesForNativeProxy).to.have.been.calledWith(
                        sinon.match.same(proxy)
                    );
                    expect(valueStorage.setPrivatesForNativeProxy.args[0][1].objectValue).to.equal(objectValue);
                    expect(valueStorage.setPrivatesForNativeProxy.args[0][1].useSyncApiAlthoughPsync).to.be.true;
                });

                it('should store useSyncApiAlthoughPsync=false correctly in privates data', function () {
                    var proxy;
                    callCreate();

                    proxy = new ProxyClass(objectValue, false);

                    expect(proxy).to.be.an.instanceOf(ProxyClass);
                    expect(valueStorage.setPrivatesForNativeProxy.args[0][1].useSyncApiAlthoughPsync).to.be.false;
                });
            });

            describe('methods defined directly on the PHP class\'s internal class prototype hierarchy', function () {
                var firstOriginalMethod,
                    firstProxyMethod,
                    secondOriginalMethod,
                    secondProxyMethod;

                beforeEach(function () {
                    firstOriginalMethod = sinon.stub();
                    firstProxyMethod = sinon.stub();
                    secondOriginalMethod = sinon.stub();
                    secondProxyMethod = sinon.stub();

                    // First method is inherited from a super JS class, even though there is no super PHP class
                    InternalSuperClass.prototype.firstMethod = firstOriginalMethod;
                    InternalClass.prototype.secondMethod = secondOriginalMethod;

                    proxyMemberFactory.createProxyMethod
                        .withArgs('firstMethod')
                        .returns(firstProxyMethod);
                    proxyMemberFactory.createProxyMethod
                        .withArgs('secondMethod')
                        .returns(secondProxyMethod);

                    callCreate();
                });

                it('should be defined via the ProxyMemberFactory', function () {
                    var proxy = new ProxyClass(objectValue, true);

                    expect(proxy.firstMethod).to.equal(firstProxyMethod);
                    expect(proxy.secondMethod).to.equal(secondProxyMethod);
                });
            });

            describe('methods defined on the PHP super class\'s internal class prototype hierarchy', function () {
                var firstOriginalMethod,
                    firstProxyMethod,
                    SuperClassInternalClass,
                    SuperClassInternalSuperClass,
                    secondOriginalMethod,
                    secondProxyMethod,
                    superClass;

                beforeEach(function () {
                    superClass = sinon.createStubInstance(Class);
                    superClass.getSuperClass.returns(null);
                    classObject.getSuperClass.returns(superClass);

                    SuperClassInternalSuperClass = sinon.stub();
                    SuperClassInternalClass = function () {};
                    SuperClassInternalClass.prototype = Object.create(SuperClassInternalSuperClass.prototype);
                    superClass.getInternalClass.returns(SuperClassInternalClass);

                    firstOriginalMethod = sinon.stub();
                    firstProxyMethod = sinon.stub();
                    secondOriginalMethod = sinon.stub();
                    secondProxyMethod = sinon.stub();

                    // First method is inherited from a super JS class of the super PHP class
                    SuperClassInternalSuperClass.prototype.firstMethod = firstOriginalMethod;
                    SuperClassInternalClass.prototype.secondMethod = secondOriginalMethod;

                    proxyMemberFactory.createProxyMethod
                        .withArgs('firstMethod')
                        .returns(firstProxyMethod);
                    proxyMemberFactory.createProxyMethod
                        .withArgs('secondMethod')
                        .returns(secondProxyMethod);

                    callCreate();
                });

                it('should be defined via the ProxyMemberFactory', function () {
                    var proxy = new ProxyClass(objectValue, true);

                    expect(proxy.firstMethod).to.equal(firstProxyMethod);
                    expect(proxy.secondMethod).to.equal(secondProxyMethod);
                });
            });
        });
    });
});
