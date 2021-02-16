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
    ProxyClassRepository = require('../../../../../src/FFI/Value/Proxy/ProxyClassRepository'),
    ProxyFactory = require('../../../../../src/FFI/Value/Proxy/ProxyFactory');

describe('FFI ProxyFactory', function () {
    var classObject,
        createFactory,
        factory,
        objectValue,
        ProxyClass,
        proxyClassRepository;

    beforeEach(function () {
        classObject = sinon.createStubInstance(Class);
        objectValue = sinon.createStubInstance(ObjectValue);
        ProxyClass = sinon.stub();
        proxyClassRepository = sinon.createStubInstance(ProxyClassRepository);

        objectValue.getClass.returns(classObject);

        proxyClassRepository.getProxyClass
            .withArgs(sinon.match.same(classObject))
            .returns(ProxyClass);

        createFactory = function (mode) {
            factory = new ProxyFactory(proxyClassRepository, mode);
        };
        createFactory('psync');
    });

    describe('create()', function () {
        it('should return an instance of the ProxyClass when useSyncApiAlthoughPsync=true', function () {
            var proxy = sinon.createStubInstance(ProxyClass);
            ProxyClass
                .withArgs(sinon.match.same(objectValue), true)
                .returns(proxy);

            expect(factory.create(objectValue, true)).to.equal(proxy);
        });

        it('should return an instance of the ProxyClass when useSyncApiAlthoughPsync=false', function () {
            var proxy = sinon.createStubInstance(ProxyClass);
            ProxyClass
                .withArgs(sinon.match.same(objectValue), false)
                .returns(proxy);

            expect(factory.create(objectValue, false)).to.equal(proxy);
        });

        it('should throw when requesting sync API in async mode', function () {
            createFactory('async');

            expect(function () {
                factory.create(objectValue, true);
            }).to.throw(
                'Cannot explicitly request sync API when not in psync mode'
            );
        });

        it('should throw when requesting sync API in sync mode', function () {
            createFactory('sync');

            expect(function () {
                factory.create(objectValue, true);
            }).to.throw(
                'Cannot explicitly request sync API when not in psync mode'
            );
        });
    });
});
