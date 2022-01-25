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
    ArrayType = require('../../../src/Type/ArrayType'),
    CallableType = require('../../../src/Type/CallableType'),
    ClassType = require('../../../src/Type/ClassType'),
    IterableType = require('../../../src/Type/IterableType'),
    MixedType = require('../../../src/Type/MixedType'),
    Namespace = require('../../../src/Namespace').sync(),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ParameterTypeFactory = require('../../../src/Function/ParameterTypeFactory'),
    TypeFactory = require('../../../src/Type/TypeFactory');

describe('ParameterTypeFactory', function () {
    var factory,
        namespaceScope,
        typeFactory;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        typeFactory = sinon.createStubInstance(TypeFactory);

        factory = new ParameterTypeFactory(typeFactory);
    });

    describe('createParameterType()', function () {
        it('should be able to create a nullable "array" type', function () {
            var arrayType = sinon.createStubInstance(ArrayType);
            typeFactory.createArrayType
                .withArgs(true)
                .returns(arrayType);

            expect(
                factory.createParameterType({type: 'array', nullable: true, name: 'myParam'}, namespaceScope)
            ).to.equal(arrayType);
        });

        it('should be able to create a non-nullable "array" type', function () {
            var arrayType = sinon.createStubInstance(ArrayType);
            typeFactory.createArrayType
                .withArgs(false)
                .returns(arrayType);

            expect(
                factory.createParameterType({type: 'array', nullable: false, name: 'myParam'}, namespaceScope)
            ).to.equal(arrayType);
        });

        it('should be able to create a nullable "callable" type', function () {
            var callableType = sinon.createStubInstance(CallableType);
            typeFactory.createCallableType
                .withArgs(sinon.match.same(namespaceScope), true)
                .returns(callableType);

            expect(
                factory.createParameterType({type: 'callable', nullable: true, name: 'myParam'}, namespaceScope)
            ).to.equal(callableType);
        });

        it('should be able to create a non-nullable "callable" type', function () {
            var callableType = sinon.createStubInstance(CallableType);
            typeFactory.createCallableType
                .withArgs(sinon.match.same(namespaceScope), false)
                .returns(callableType);

            expect(
                factory.createParameterType({type: 'callable', nullable: false, name: 'myParam'}, namespaceScope)
            ).to.equal(callableType);
        });

        it('should be able to create a nullable "class" type', function () {
            var classType = sinon.createStubInstance(ClassType),
                namespace = sinon.createStubInstance(Namespace);
            // Ensure we resolve the class path relative to the current namespace scope,
            // to account for relative class paths and/or those that depend on `use` imports
            // in the current module
            namespace.getPrefix.returns('My\\Absolute\\NamespacePathFor\\');
            typeFactory.createClassType
                .withArgs('My\\Absolute\\NamespacePathFor\\MyClass', true)
                .returns(classType);
            namespaceScope.resolveClass
                .withArgs('Relative\\NamespacePathFor\\MyClass')
                .returns({
                    namespace: namespace,
                    name: 'MyClass'
                });

            expect(
                factory.createParameterType({
                    type: 'class',
                    nullable: true,
                    className: 'Relative\\NamespacePathFor\\MyClass',
                    name: 'myParam'
                }, namespaceScope)
            ).to.equal(classType);
        });

        it('should be able to create a non-nullable "class" type', function () {
            var classType = sinon.createStubInstance(ClassType),
                namespace = sinon.createStubInstance(Namespace);
            // Ensure we resolve the class path relative to the current namespace scope,
            // to account for relative class paths and/or those that depend on `use` imports
            // in the current module
            namespace.getPrefix.returns('My\\Absolute\\NamespacePathFor\\');
            typeFactory.createClassType
                .withArgs('My\\Absolute\\NamespacePathFor\\MyClass', false)
                .returns(classType);
            namespaceScope.resolveClass
                .withArgs('Relative\\NamespacePathFor\\MyClass')
                .returns({
                    namespace: namespace,
                    name: 'MyClass'
                });

            expect(
                factory.createParameterType({
                    type: 'class',
                    nullable: false,
                    className: 'Relative\\NamespacePathFor\\MyClass',
                    name: 'myParam'
                }, namespaceScope)
            ).to.equal(classType);
        });

        it('should be able to create a nullable "iterable" type', function () {
            var iterableType = sinon.createStubInstance(IterableType);
            typeFactory.createIterableType
                .withArgs(true)
                .returns(iterableType);

            expect(
                factory.createParameterType({type: 'iterable', nullable: true, name: 'myParam'}, namespaceScope)
            ).to.equal(iterableType);
        });

        it('should be able to create a non-nullable "iterable" type', function () {
            var iterableType = sinon.createStubInstance(IterableType);
            typeFactory.createIterableType
                .withArgs(false)
                .returns(iterableType);

            expect(
                factory.createParameterType({type: 'iterable', nullable: false, name: 'myParam'}, namespaceScope)
            ).to.equal(iterableType);
        });

        it('should be able to create a mixed type', function () {
            var mixedType = sinon.createStubInstance(MixedType);
            typeFactory.createMixedType.returns(mixedType);

            expect(
                // NB: Type is omitted for a mixed type
                factory.createParameterType({name: 'myParam'}, namespaceScope)
            ).to.equal(mixedType);
        });

        it('should throw when given an unsupported type of parameter', function () {
            expect(function () {
                factory.createParameterType(
                    {type: 'my_unsupported_type', name: 'myParam'},
                    namespaceScope
                );
            }).to.throw('Unsupported parameter type "my_unsupported_type"');
        });
    });
});
