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
    ClassInternalsClassFactory = require('../../../../src/FFI/Internals/ClassInternalsClassFactory'),
    Class = require('../../../../src/Class').sync(),
    Internals = require('../../../../src/FFI/Internals/Internals'),
    Namespace = require('../../../../src/Namespace').sync(),
    NamespaceScope = require('../../../../src/NamespaceScope').sync(),
    ObjectValue = require('../../../../src/Value/Object').sync(),
    UnwrapperRepository = require('../../../../src/FFI/Export/UnwrapperRepository'),
    ValueFactory = require('../../../../src/ValueFactory').sync(),
    ValueStorage = require('../../../../src/FFI/Value/ValueStorage');

describe('FFI ClassInternalsClassFactory', function () {
    var baseInternals,
        factory,
        globalNamespace,
        globalNamespaceScope,
        unwrapperRepository,
        valueFactory,
        valueStorage;

    beforeEach(function () {
        baseInternals = sinon.createStubInstance(Internals);
        globalNamespace = sinon.createStubInstance(Namespace);
        globalNamespaceScope = sinon.createStubInstance(NamespaceScope);
        unwrapperRepository = sinon.createStubInstance(UnwrapperRepository);
        valueStorage = sinon.createStubInstance(ValueStorage);
        valueFactory = new ValueFactory(null, null, null, null, null, null, valueStorage);

        factory = new ClassInternalsClassFactory(
            baseInternals,
            unwrapperRepository,
            valueFactory,
            globalNamespace,
            globalNamespaceScope
        );
    });

    describe('create()', function () {
        var ClassInternals;

        beforeEach(function () {
            ClassInternals = factory.create();
        });

        it('should return a ClassInternals class constructor function', function () {
            expect(ClassInternals).to.be.a('function');
        });

        describe('the ClassInternals class returned', function () {
            var classInternals,
                classObject,
                definitionFactory,
                MyClass,
                myStuffNamespace;

            beforeEach(function () {
                classInternals = new ClassInternals('My\\Stuff\\MyClass');
                classObject = sinon.createStubInstance(Class);
                definitionFactory = sinon.stub();
                MyClass = sinon.stub();
                myStuffNamespace = sinon.createStubInstance(Namespace);

                definitionFactory
                    .withArgs(sinon.match.same(classInternals))
                    .returns(MyClass);

                globalNamespace.parseName
                    .withArgs('My\\Stuff\\MyClass')
                    .returns({
                        namespace: myStuffNamespace,
                        name: 'MyClass'
                    });

                myStuffNamespace.defineClass
                    .withArgs(
                        'MyClass',
                        sinon.match.same(MyClass),
                        sinon.match.same(globalNamespaceScope),
                        true // enableAutoCoercion
                    )
                    .returns(classObject);
            });

            it('should extend the base Internals instance', function () {
                var FakeBaseInternals = function () {};
                FakeBaseInternals.prototype = baseInternals;

                expect(classInternals).to.be.an.instanceOf(FakeBaseInternals);
            });

            describe('callSuperConstructor()', function () {
                it('should throw when not extending a super class', function () {
                    expect(function () {
                        classInternals.callSuperConstructor({}, ['first arg', 21]);
                    }).to.throw(
                        'Cannot call superconstructor: no superclass is defined for class "My\\Stuff\\MyClass"'
                    );
                });

                describe('when extending a super class, in auto-coercing mode', function () {
                    var nativeObject,
                        objectValue,
                        superClass;

                    beforeEach(function () {
                        nativeObject = {my: 'native object'};
                        objectValue = sinon.createStubInstance(ObjectValue);
                        objectValue.getType.returns('object');
                        superClass = sinon.createStubInstance(Class);
                        globalNamespace.getClass
                            .withArgs('My\\SuperClass')
                            .returns(superClass);

                        valueStorage.hasObjectValueForExport
                            .withArgs(sinon.match.same(nativeObject))
                            .returns(true);
                        valueStorage.getObjectValueForExport
                            .withArgs(sinon.match.same(nativeObject))
                            .returns(objectValue);

                        classInternals.extendClass('My\\SuperClass');
                    });

                    it('should call the super constructor with native instance coerced to ObjectValue', function () {
                        classInternals.callSuperConstructor(nativeObject, ['first arg', 21]);

                        expect(superClass.construct).to.have.been.calledOnce;
                        expect(superClass.construct.args[0][0]).to.equal(objectValue);
                    });

                    it('should call the super constructor with native arguments coerced', function () {
                        classInternals.callSuperConstructor(nativeObject, ['first arg', 21]);

                        expect(superClass.construct).to.have.been.calledOnce;
                        expect(superClass.construct.args[0][1][0].getType()).to.equal('string');
                        expect(superClass.construct.args[0][1][0].getNative()).to.equal('first arg');
                        expect(superClass.construct.args[0][1][1].getType()).to.equal('int');
                        expect(superClass.construct.args[0][1][1].getNative()).to.equal(21);
                    });
                });

                describe('when extending a super class, in non-coercing mode', function () {
                    var objectValue,
                        superClass;

                    beforeEach(function () {
                        objectValue = sinon.createStubInstance(ObjectValue);
                        objectValue.getType.returns('object');
                        superClass = sinon.createStubInstance(Class);
                        globalNamespace.getClass
                            .withArgs('My\\SuperClass')
                            .returns(superClass);

                        classInternals.disableAutoCoercion();
                        classInternals.extendClass('My\\SuperClass');
                    });

                    it('should call the super constructor with the instance ObjectValue', function () {
                        classInternals.callSuperConstructor(objectValue, ['first arg', 21]);

                        expect(superClass.construct).to.have.been.calledOnce;
                        expect(superClass.construct.args[0][0]).to.equal(objectValue);
                    });

                    it('should call the super constructor with the given argument Values', function () {
                        classInternals.callSuperConstructor(objectValue, [
                            valueFactory.createString('first arg'),
                            valueFactory.createInteger(21)
                        ]);

                        expect(superClass.construct).to.have.been.calledOnce;
                        expect(superClass.construct.args[0][1][0].getType()).to.equal('string');
                        expect(superClass.construct.args[0][1][0].getNative()).to.equal('first arg');
                        expect(superClass.construct.args[0][1][1].getType()).to.equal('int');
                        expect(superClass.construct.args[0][1][1].getNative()).to.equal(21);
                    });
                });
            });

            describe('defineClass()', function () {
                it('should set the super class when one was extended', function () {
                    var superClass = sinon.createStubInstance(Class);
                    globalNamespace.getClass
                        .withArgs('My\\SuperClass')
                        .returns(superClass);
                    classInternals.extendClass('My\\SuperClass');

                    classInternals.defineClass(definitionFactory);

                    expect(MyClass.superClass).to.equal(superClass);
                });

                it('should set any implemented interface names', function () {
                    classInternals.implement('My\\FirstInterface');
                    classInternals.implement('My\\SecondInterface');

                    classInternals.defineClass(definitionFactory);

                    expect(MyClass.interfaces).to.contain('My\\FirstInterface');
                    expect(MyClass.interfaces).to.contain('My\\SecondInterface');
                });

                it('should set the unwrapper if defined', function () {
                    var unwrapper = sinon.stub();
                    classInternals.defineUnwrapper(unwrapper);

                    classInternals.defineClass(definitionFactory);

                    expect(unwrapperRepository.defineUnwrapper).to.have.been.calledOnce;
                    expect(unwrapperRepository.defineUnwrapper).to.have.been.calledWith(
                        sinon.match.same(classObject),
                        sinon.match.same(unwrapper)
                    );
                });

                it('should enable auto-coercion by default', function () {
                    classInternals.defineClass(definitionFactory);

                    expect(myStuffNamespace.defineClass).to.have.been.calledOnce;
                    expect(myStuffNamespace.defineClass).to.have.been.calledWith(
                        sinon.match.any,
                        sinon.match.any,
                        sinon.match.any,
                        true
                    );
                });

                it('should disable auto-coercion when disabled', function () {
                    classInternals.disableAutoCoercion();

                    classInternals.defineClass(definitionFactory);

                    expect(myStuffNamespace.defineClass).to.have.been.calledOnce;
                    expect(myStuffNamespace.defineClass).to.have.been.calledWith(
                        sinon.match.any,
                        sinon.match.any,
                        sinon.match.any,
                        false
                    );
                });

                it('should return the Class instance from the Namespace', function () {
                    expect(classInternals.defineClass(definitionFactory)).to.equal(classObject);
                });
            });
        });
    });
});
