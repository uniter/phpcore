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
    tools = require('../tools'),
    ArrayType = require('../../../src/Type/ArrayType'),
    CallableType = require('../../../src/Type/CallableType'),
    ClassType = require('../../../src/Type/ClassType'),
    IterableType = require('../../../src/Type/IterableType'),
    MixedType = require('../../../src/Type/MixedType'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ObjectType = require('../../../src/Type/ObjectType'),
    ScalarType = require('../../../src/Type/ScalarType'),
    TypeFactory = require('../../../src/Type/TypeFactory'),
    TypeInterface = require('../../../src/Type/TypeInterface'),
    UnionType = require('../../../src/Type/UnionType');

describe('TypeFactory', function () {
    var factory,
        flow,
        futureFactory,
        state;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();

        factory = new TypeFactory(futureFactory, flow);
    });

    describe('createArrayType()', function () {
        it('should return an ArrayType that allows null when specified', function () {
            var type = factory.createArrayType(true);

            expect(type).to.be.an.instanceOf(ArrayType);
            expect(type.allowsNull()).to.be.true;
        });

        it('should return an ArrayType that disallows null when specified', function () {
            var type = factory.createArrayType(false);

            expect(type).to.be.an.instanceOf(ArrayType);
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('createCallableType()', function () {
        var namespaceScope;

        beforeEach(function () {
            namespaceScope = sinon.createStubInstance(NamespaceScope);
        });

        it('should return a CallableType that allows null when specified', function () {
            var type = factory.createCallableType(namespaceScope, true);

            expect(type).to.be.an.instanceOf(CallableType);
            expect(type.allowsNull()).to.be.true;
        });

        it('should return a CallableType that disallows null when specified', function () {
            var type = factory.createCallableType(namespaceScope, false);

            expect(type).to.be.an.instanceOf(CallableType);
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('createClassType()', function () {
        it('should return a ClassType that allows null when specified', function () {
            var type = factory.createClassType('My\\Fqcn', true);

            expect(type).to.be.an.instanceOf(ClassType);
            expect(type.allowsNull()).to.be.true;
        });

        it('should return a ClassType that disallows null when specified', function () {
            var type = factory.createClassType('My\\Fqcn', false);

            expect(type).to.be.an.instanceOf(ClassType);
            expect(type.allowsNull()).to.be.false;
        });

        it('should give the ClassType the correct FQCN', function () {
            var type = factory.createClassType('My\\Fqcn', false);

            expect(type.getDisplayName()).to.equal('My\\Fqcn');
        });
    });

    describe('createIterableType()', function () {
        var namespaceScope;

        beforeEach(function () {
            namespaceScope = sinon.createStubInstance(NamespaceScope);
        });

        it('should return a IterableType that allows null when specified', function () {
            var type = factory.createIterableType(true);

            expect(type).to.be.an.instanceOf(IterableType);
            expect(type.allowsNull()).to.be.true;
        });

        it('should return a IterableType that disallows null when specified', function () {
            var type = factory.createIterableType(false);

            expect(type).to.be.an.instanceOf(IterableType);
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('createMixedType()', function () {
        var namespaceScope;

        beforeEach(function () {
            namespaceScope = sinon.createStubInstance(NamespaceScope);
        });

        it('should return a MixedType that allows null', function () {
            var type = factory.createMixedType();

            expect(type).to.be.an.instanceOf(MixedType);
            expect(type.allowsNull()).to.be.true;
        });
    });

    describe('createObjectType()', function () {
        it('should return an ObjectType that allows null when specified', function () {
            var type = factory.createObjectType(true);

            expect(type).to.be.an.instanceOf(ObjectType);
            expect(type.allowsNull()).to.be.true;
        });

        it('should return an ObjectType that disallows null when specified', function () {
            var type = factory.createObjectType(false);

            expect(type).to.be.an.instanceOf(ObjectType);
            expect(type.allowsNull()).to.be.false;
        });
    });

    describe('createScalarType()', function () {
        it('should return a ScalarType that allows null when specified', function () {
            var type = factory.createScalarType('int', true);

            expect(type).to.be.an.instanceOf(ScalarType);
            expect(type.allowsNull()).to.be.true;
        });

        it('should return a ScalarType that disallows null when specified', function () {
            var type = factory.createScalarType('int', false);

            expect(type).to.be.an.instanceOf(ScalarType);
            expect(type.allowsNull()).to.be.false;
        });

        it('should give the ScalarType the correct scalar type', function () {
            var type = factory.createScalarType('int', false);

            expect(type.getDisplayName()).to.equal('int');
        });
    });

    describe('createUnionType()', function () {
        var classSubType1,
            classSubType2,
            classSubTypes,
            scalarSubType1,
            scalarSubType2,
            scalarSubTypesByValueType,
            scalarSubTypesByPriority,
            otherSubType1,
            otherSubType2,
            otherSubTypes;

        beforeEach(function () {
            classSubType1 = sinon.createStubInstance(ClassType);
            classSubType1.getDisplayName.returns('MyClass');
            classSubType2 = sinon.createStubInstance(ClassType);
            classSubType2.getDisplayName.returns('YourClass');
            classSubTypes = [classSubType1, classSubType2];
            scalarSubType1 = sinon.createStubInstance(ScalarType);
            scalarSubType1.getDisplayName.returns('int');
            scalarSubType2 = sinon.createStubInstance(ScalarType);
            scalarSubType2.getDisplayName.returns('string');
            scalarSubTypesByValueType = {
                'int': scalarSubType1,
                'string': scalarSubType2
            };
            scalarSubTypesByPriority = [scalarSubType1, scalarSubType2];
            otherSubType1 = sinon.createStubInstance(TypeInterface);
            otherSubType1.getDisplayName.returns('callable');
            otherSubType2 = sinon.createStubInstance(TypeInterface);
            otherSubType2.getDisplayName.returns('iterable');
            otherSubTypes = [otherSubType1, otherSubType2];
        });

        it('should return a UnionType that allows null when specified', function () {
            var type = factory.createUnionType(
                    scalarSubTypesByValueType,
                    scalarSubTypesByPriority,
                    classSubTypes,
                    otherSubTypes,
                    true
                );

            expect(type).to.be.an.instanceOf(UnionType);
            expect(type.allowsNull()).to.be.true;
        });

        it('should return a UnionType that disallows null when specified', function () {
            var type = factory.createUnionType(
                    scalarSubTypesByValueType,
                    scalarSubTypesByPriority,
                    classSubTypes,
                    otherSubTypes,
                    false
                );

            expect(type).to.be.an.instanceOf(UnionType);
            expect(type.allowsNull()).to.be.false;
        });

        it('should give the UnionType the correct types', function () {
            var type = factory.createUnionType(
                    scalarSubTypesByValueType,
                    scalarSubTypesByPriority,
                    classSubTypes,
                    otherSubTypes,
                    true
                );

            expect(type.getDisplayName()).to.equal('MyClass|YourClass|callable|iterable|string|int|null');
        });
    });
});
