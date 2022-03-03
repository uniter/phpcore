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
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    ArrayType = require('../../../src/Type/ArrayType'),
    CallableType = require('../../../src/Type/CallableType'),
    ClassType = require('../../../src/Type/ClassType'),
    Exception = phpCommon.Exception,
    IterableType = require('../../../src/Type/IterableType'),
    MixedType = require('../../../src/Type/MixedType'),
    Namespace = require('../../../src/Namespace').sync(),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ObjectType = require('../../../src/Type/ObjectType'),
    SpecTypeProvider = require('../../../src/Type/SpecTypeProvider'),
    ScalarType = require('../../../src/Type/ScalarType'),
    TypeFactory = require('../../../src/Type/TypeFactory');

describe('SpecTypeProvider', function () {
    var factory,
        namespaceScope,
        typeFactory;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        typeFactory = sinon.createStubInstance(TypeFactory);

        factory = new SpecTypeProvider(typeFactory);
    });

    describe('createType()', function () {
        it('should be able to create a nullable "array" type', function () {
            var arrayType = sinon.createStubInstance(ArrayType);
            typeFactory.createArrayType
                .withArgs(true)
                .returns(arrayType);

            expect(
                factory.createType({type: 'array', nullable: true, name: 'myParam'}, namespaceScope)
            ).to.equal(arrayType);
        });

        it('should be able to create a non-nullable "array" type', function () {
            var arrayType = sinon.createStubInstance(ArrayType);
            typeFactory.createArrayType
                .withArgs(false)
                .returns(arrayType);

            expect(
                factory.createType({type: 'array', nullable: false, name: 'myParam'}, namespaceScope)
            ).to.equal(arrayType);
        });

        it('should be able to create a nullable "callable" type', function () {
            var callableType = sinon.createStubInstance(CallableType);
            typeFactory.createCallableType
                .withArgs(sinon.match.same(namespaceScope), true)
                .returns(callableType);

            expect(
                factory.createType({type: 'callable', nullable: true, name: 'myParam'}, namespaceScope)
            ).to.equal(callableType);
        });

        it('should be able to create a non-nullable "callable" type', function () {
            var callableType = sinon.createStubInstance(CallableType);
            typeFactory.createCallableType
                .withArgs(sinon.match.same(namespaceScope), false)
                .returns(callableType);

            expect(
                factory.createType({type: 'callable', nullable: false, name: 'myParam'}, namespaceScope)
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
                factory.createType({
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
                factory.createType({
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
                factory.createType({type: 'iterable', nullable: true, name: 'myParam'}, namespaceScope)
            ).to.equal(iterableType);
        });

        it('should be able to create a non-nullable "iterable" type', function () {
            var iterableType = sinon.createStubInstance(IterableType);
            typeFactory.createIterableType
                .withArgs(false)
                .returns(iterableType);

            expect(
                factory.createType({type: 'iterable', nullable: false, name: 'myParam'}, namespaceScope)
            ).to.equal(iterableType);
        });

        it('should be able to create a mixed type', function () {
            var mixedType = sinon.createStubInstance(MixedType);
            typeFactory.createMixedType.returns(mixedType);

            expect(
                // NB: Type is omitted for a mixed type
                factory.createType({name: 'myParam'}, namespaceScope)
            ).to.equal(mixedType);
        });

        it('should be able to create a nullable "object" type', function () {
            var objectType = sinon.createStubInstance(ObjectType);
            typeFactory.createObjectType
                .withArgs(true)
                .returns(objectType);

            expect(
                factory.createType({type: 'object', nullable: true, name: 'myParam'}, namespaceScope)
            ).to.equal(objectType);
        });

        it('should be able to create a non-nullable "object" type', function () {
            var objectType = sinon.createStubInstance(ObjectType);
            typeFactory.createObjectType
                .withArgs(false)
                .returns(objectType);

            expect(
                factory.createType({type: 'object', nullable: false, name: 'myParam'}, namespaceScope)
            ).to.equal(objectType);
        });

        it('should throw when given an unsupported type name', function () {
            expect(function () {
                factory.createType(
                    {type: 'my_unsupported_type', name: 'myParam'},
                    namespaceScope
                );
            }).to.throw(
                Exception,
                'Unsupported type "my_unsupported_type"'
            );
        });

        it('should be able to create a nullable "scalar" type', function () {
            var scalarType = sinon.createStubInstance(ScalarType);
            typeFactory.createScalarType
                .withArgs('float', true)
                .returns(scalarType);

            expect(
                factory.createType({
                    type: 'scalar',
                    nullable: true,
                    scalarType: 'float',
                    name: 'myParam'
                }, namespaceScope)
            ).to.equal(scalarType);
        });

        it('should be able to create a non-nullable "scalar" type', function () {
            var scalarType = sinon.createStubInstance(ScalarType);
            typeFactory.createScalarType
                .withArgs('float', false)
                .returns(scalarType);

            expect(
                factory.createType({
                    type: 'scalar',
                    nullable: false,
                    scalarType: 'float',
                    name: 'myParam'
                }, namespaceScope)
            ).to.equal(scalarType);
        });
    });
});
