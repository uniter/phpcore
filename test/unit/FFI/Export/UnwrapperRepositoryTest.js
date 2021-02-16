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
    UnwrapperRepository = require('../../../../src/FFI/Export/UnwrapperRepository');

describe('UnwrapperRepository', function () {
    var classObject,
        repository;

    beforeEach(function () {
        classObject = sinon.createStubInstance(Class);

        classObject.getInterfaces.returns([]);
        classObject.getSuperClass.returns(null);

        repository = new UnwrapperRepository();
    });

    describe('getUnwrapperForClass()', function () {
        it('should return null when the class nor any of its interfaces defines an unwrapper', function () {
            expect(repository.getUnwrapperForClass(classObject)).to.be.null;
        });

        it('should return a custom unwrapper defined for the given class itself', function () {
            var unwrapper = sinon.stub();
            repository.defineUnwrapper(classObject, unwrapper);

            expect(repository.getUnwrapperForClass(classObject)).to.equal(unwrapper);
        });

        it('should return a custom unwrapper defined by an interface of the given class itself', function () {
            var interfaceObject = sinon.createStubInstance(Class),
                unwrapper = sinon.stub();
            interfaceObject.getSuperClass.returns(null);
            classObject.getInterfaces.returns([
                interfaceObject
            ]);
            repository.defineUnwrapper(interfaceObject, unwrapper);

            expect(repository.getUnwrapperForClass(classObject)).to.equal(unwrapper);
        });

        it('should return a custom unwrapper defined for the parent class', function () {
            var superClass = sinon.createStubInstance(Class),
                unwrapper = sinon.stub();
            superClass.getInterfaces.returns([]);
            superClass.getSuperClass.returns(null);
            classObject.getSuperClass.returns(superClass);
            repository.defineUnwrapper(superClass, unwrapper);

            expect(repository.getUnwrapperForClass(classObject)).to.equal(unwrapper);
        });

        it('should return a custom unwrapper defined by an interface of the parent class', function () {
            var interfaceObject = sinon.createStubInstance(Class),
                superClass = sinon.createStubInstance(Class),
                unwrapper = sinon.stub();
            interfaceObject.getSuperClass.returns(null);
            superClass.getInterfaces.returns([
                interfaceObject
            ]);
            superClass.getSuperClass.returns(null);
            classObject.getSuperClass.returns(superClass);
            repository.defineUnwrapper(interfaceObject, unwrapper);

            expect(repository.getUnwrapperForClass(classObject)).to.equal(unwrapper);
        });

        it('should return a custom unwrapper defined by a parent of an interface of the parent class', function () {
            var interfaceObject = sinon.createStubInstance(Class),
                superInterface = sinon.createStubInstance(Class),
                superClass = sinon.createStubInstance(Class),
                unwrapper = sinon.stub();
            superInterface.getInterfaces.returns([]);
            superInterface.getSuperClass.returns(null);
            interfaceObject.getInterfaces.returns([
                superInterface
            ]);
            superClass.getInterfaces.returns([
                interfaceObject
            ]);
            superClass.getSuperClass.returns(null);
            classObject.getSuperClass.returns(superClass);
            repository.defineUnwrapper(superInterface, unwrapper);

            expect(repository.getUnwrapperForClass(classObject)).to.equal(unwrapper);
        });
    });
});
