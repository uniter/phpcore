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
    AnyType = require('../../../../../src/Core/Opcode/Type/AnyType'),
    Exception = phpCommon.Exception,
    ListType = require('../../../../../src/Core/Opcode/Type/ListType'),
    NativeType = require('../../../../../src/Core/Opcode/Type/NativeType'),
    ReferenceType = require('../../../../../src/Core/Opcode/Type/ReferenceType'),
    SnapshotType = require('../../../../../src/Core/Opcode/Type/SnapshotType'),
    TypeFactory = require('../../../../../src/Core/Opcode/Type/TypeFactory'),
    TypeProvider = require('../../../../../src/Core/Opcode/Type/TypeProvider'),
    UnionType = require('../../../../../src/Core/Opcode/Type/UnionType'),
    ValueType = require('../../../../../src/Core/Opcode/Type/ValueType');

describe('Opcode TypeProvider', function () {
    var provider,
        typeFactory;

    beforeEach(function () {
        typeFactory = sinon.createStubInstance(TypeFactory);

        provider = new TypeProvider(typeFactory);
    });

    describe('provideAnyType()', function () {
        it('should return an instance of AnyType', function () {
            var type = sinon.createStubInstance(AnyType);
            typeFactory.createAnyType.returns(type);

            expect(provider.provideAnyType()).to.equal(type);
        });
    });

    describe('provideType()', function () {
        it('should return an AnyType from TypeFactory when given "any"', function () {
            var type = sinon.createStubInstance(AnyType);
            typeFactory.createAnyType.returns(type);

            expect(provider.provideType('any')).to.equal(type);
        });

        it('should return a NativeType<boolean> from TypeFactory when given "bool"', function () {
            var type = sinon.createStubInstance(NativeType);
            typeFactory.createNativeType
                .withArgs('boolean')
                .returns(type);

            expect(provider.provideType('bool')).to.equal(type);
        });

        it('should return a ListType from TypeFactory when given "list"', function () {
            var type = sinon.createStubInstance(ListType);
            typeFactory.createListType.returns(type);

            expect(provider.provideType('list')).to.equal(type);
        });

        it('should return a NativeType<null> from TypeFactory when given "null"', function () {
            var type = sinon.createStubInstance(NativeType);
            typeFactory.createNativeType
                .withArgs('null')
                .returns(type);

            expect(provider.provideType('null')).to.equal(type);
        });

        it('should return a NativeType<number> from TypeFactory when given "number"', function () {
            var type = sinon.createStubInstance(NativeType);
            typeFactory.createNativeType
                .withArgs('number')
                .returns(type);

            expect(provider.provideType('number')).to.equal(type);
        });

        it('should return a ReferenceType from TypeFactory when given "ref"', function () {
            var type = sinon.createStubInstance(ReferenceType);
            typeFactory.createReferenceType.returns(type);

            expect(provider.provideType('ref')).to.equal(type);
        });

        it('should return a SnapshotType from TypeFactory when given "snapshot"', function () {
            var type = sinon.createStubInstance(SnapshotType);
            typeFactory.createSnapshotType.returns(type);

            expect(provider.provideType('snapshot')).to.equal(type);
        });

        it('should return a NativeType<string> from TypeFactory when given "string"', function () {
            var type = sinon.createStubInstance(NativeType);
            typeFactory.createNativeType
                .withArgs('string')
                .returns(type);

            expect(provider.provideType('string')).to.equal(type);
        });

        it('should return a ValueType from TypeFactory when given "val"', function () {
            var type = sinon.createStubInstance(ValueType);
            typeFactory.createValueType.returns(type);

            expect(provider.provideType('val')).to.equal(type);
        });

        it('should return a UnionType from TypeFactory when given "val|ref"', function () {
            var referenceType = sinon.createStubInstance(ReferenceType),
                unionType = sinon.createStubInstance(UnionType),
                valueType = sinon.createStubInstance(ValueType);
            typeFactory.createReferenceType.returns(referenceType);
            typeFactory.createUnionType
                .withArgs([sinon.match.same(valueType), sinon.match.same(referenceType)])
                .returns(unionType);
            typeFactory.createValueType.returns(valueType);

            expect(provider.provideType('val|ref')).to.equal(unionType);
        });

        it('should throw when given an unsupported type', function () {
            expect(function () {
                provider.provideType('my_unsupported_type');
            }).to.throw(Exception, 'Unsupported type "my_unsupported_type"');
        });
    });
});
