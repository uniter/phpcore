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
    ProxyClassFactory = require('../../../../../src/FFI/Value/Proxy/ProxyClassFactory'),
    ProxyClassRepository = require('../../../../../src/FFI/Value/Proxy/ProxyClassRepository');

describe('FFI ProxyClassRepository', function () {
    var classObject,
        proxyClassFactory,
        repository,
        ProxyClass;

    beforeEach(function () {
        classObject = sinon.createStubInstance(Class);
        ProxyClass = null; // Created by the proxyClassFactory.create(...) stub below
        proxyClassFactory = sinon.createStubInstance(ProxyClassFactory);

        proxyClassFactory.create
            .withArgs(sinon.match.same(classObject))
            .callsFake(function () {
                ProxyClass = sinon.stub();

                return ProxyClass;
            });

        repository = new ProxyClassRepository(proxyClassFactory);
    });

    describe('getProxyClass()', function () {
        it('should return the ProxyClass', function () {
            var result = repository.getProxyClass(classObject);

            expect(result).to.be.a('function'); // Ensure .create() was used
            expect(result).to.equal(ProxyClass);
        });

        it('should cache the ProxyClass for each PHP class for identity and to save on memory', function () {
            var FirstProxyClass = repository.getProxyClass(classObject),
                SecondProxyClass = repository.getProxyClass(classObject);

            expect(SecondProxyClass).to.equal(FirstProxyClass);
        });
    });
});
