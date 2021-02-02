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
    Class = require('../../../../src/Class').sync(),
    ExportFactory = require('../../../../src/FFI/Export/ExportFactory'),
    ObjectValue = require('../../../../src/Value/Object').sync(),
    ProxyFactory = require('../../../../src/FFI/Value/Proxy/ProxyFactory'),
    UnwrapperRepository = require('../../../../src/FFI/Export/UnwrapperRepository'),
    ValueFactory = require('../../../../src/ValueFactory').sync();

describe('ExportFactory', function () {
    var classObject,
        factory,
        objectValue,
        proxyFactory,
        unwrapperRepository,
        valueFactory;

    beforeEach(function () {
        classObject = sinon.createStubInstance(Class);
        objectValue = sinon.createStubInstance(ObjectValue);
        proxyFactory = sinon.createStubInstance(ProxyFactory);
        unwrapperRepository = sinon.createStubInstance(UnwrapperRepository);
        valueFactory = new ValueFactory();

        objectValue.getClass.returns(classObject);

        factory = new ExportFactory(unwrapperRepository, proxyFactory);
    });

    describe('create()', function () {
        describe('when a custom unwrapper has been defined for the class of the object', function () {
            var unwrapper;

            beforeEach(function () {
                unwrapper = sinon.stub();
                unwrapperRepository.getUnwrapperForClass
                    .withArgs(sinon.match.same(classObject))
                    .returns(unwrapper);
            });

            it('should return the result of calling the unwrapper', function () {
                var result = {my: 'unwrapped export'};
                unwrapper.returns(result);

                expect(factory.create(objectValue)).to.equal(result);
            });

            it('should pass the coerced ObjectValue to the unwrapper', function () {
                var coercedObjectValue = sinon.createStubInstance(ObjectValue),
                    result = {my: 'unwrapped export'};
                unwrapper.returns(result);
                objectValue.getThisObject.returns(coercedObjectValue);

                factory.create(objectValue);

                expect(unwrapper).to.have.been.calledOnce;
                expect(unwrapper).to.have.been.calledWith(sinon.match.same(coercedObjectValue));
                expect(unwrapper).to.have.been.calledOn(sinon.match.same(coercedObjectValue));
            });
        });

        describe('when no custom unwrapper is defined for the class of the object', function () {
            beforeEach(function () {
                unwrapperRepository.getUnwrapperForClass
                    .withArgs(sinon.match.same(classObject))
                    .returns(null);
            });

            it('should return a proxy created via the ProxyFactory', function () {
                var proxy = {my: 'proxy'};
                proxyFactory.create
                    .withArgs(sinon.match.same(objectValue))
                    .returns(proxy);

                expect(factory.create(objectValue)).to.equal(proxy);
            });
        });
    });
});
