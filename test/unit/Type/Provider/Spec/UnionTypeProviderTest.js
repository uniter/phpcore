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
    CallableType = require('../../../../../src/Type/CallableType'),
    ClassType = require('../../../../../src/Type/ClassType'),
    NamespaceScope = require('../../../../../src/NamespaceScope').sync(),
    ScalarType = require('../../../../../src/Type/ScalarType'),
    SpecTypeProvider = require('../../../../../src/Type/Provider/Spec/SpecTypeProvider'),
    TypeFactory = require('../../../../../src/Type/TypeFactory'),
    UnionType = require('../../../../../src/Type/UnionType'),
    UnionTypeProvider = require('../../../../../src/Type/Provider/Spec/UnionTypeProvider');

describe('UnionTypeProvider', function () {
    var namespaceScope,
        provider,
        specTypeProvider,
        typeFactory;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        specTypeProvider = sinon.createStubInstance(SpecTypeProvider);
        typeFactory = sinon.createStubInstance(TypeFactory);

        provider = new UnionTypeProvider(typeFactory, specTypeProvider);
    });

    describe('createType()', function () {
        it('should be able to create a nullable "union" type', function () {
            var unionType = sinon.createStubInstance(UnionType);
            typeFactory.createUnionType
                .returns(unionType);

            expect(
                provider.createType(
                    {
                        type: 'union',
                        types: [
                            {type: 'callable'},
                            {type: 'iterable'},
                            {type: 'null'}
                        ]
                    },
                    namespaceScope,
                    false // TODO: Remove this concept as it is inconsistent with |null.
                )
            ).to.equal(unionType);
            expect(typeFactory.createUnionType).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                true
            );
        });

        it('should be able to create a non-nullable "union" type', function () {
            var unionType = sinon.createStubInstance(UnionType);
            typeFactory.createUnionType
                .returns(unionType);

            expect(
                provider.createType(
                    {
                        type: 'union',
                        types: [
                            {type: 'callable'},
                            {type: 'iterable'}
                        ]
                    },
                    namespaceScope,
                    false // TODO: Remove this concept as it is inconsistent with |null.
                )
            ).to.equal(unionType);
            expect(typeFactory.createUnionType).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                false
            );
        });

        describe('with a complex union', function () {
            var callableType,
                classType,
                scalarBooleanType,
                scalarFloatType;

            beforeEach(function () {
                callableType = sinon.createStubInstance(CallableType);
                classType = sinon.createStubInstance(ClassType);
                scalarBooleanType = sinon.createStubInstance(ScalarType);
                scalarFloatType = sinon.createStubInstance(ScalarType);

                callableType.getDisplayName.returns('callable');
                classType.getDisplayName.returns('MyClass');

                scalarBooleanType.getDisplayName.returns('bool');
                // Note scalar value type of "boolean" while scalar type is "bool" (see above).
                scalarBooleanType.getScalarValueType.returns('boolean');
                scalarFloatType.getDisplayName.returns('float');
                scalarFloatType.getScalarValueType.returns('float');

                specTypeProvider.createType
                    .withArgs({type: 'callable'}, sinon.match.same(namespaceScope))
                    .returns(callableType);
                specTypeProvider.createType
                    .withArgs({type: 'class'}, sinon.match.same(namespaceScope))
                    .returns(classType);
                specTypeProvider.createType
                    .withArgs({type: 'scalar', scalarType: 'float'}, sinon.match.same(namespaceScope))
                    .returns(scalarFloatType);
                specTypeProvider.createType
                    // Note scalar type of "bool" while value type is "boolean" (see above).
                    .withArgs({type: 'scalar', scalarType: 'bool'}, sinon.match.same(namespaceScope))
                    .returns(scalarBooleanType);
            });

            it('should provide the scalar types indexed by value type', function () {
                provider.createType(
                    {
                        type: 'union',
                        types: [
                            {type: 'scalar', scalarType: 'bool'},
                            {type: 'scalar', scalarType: 'float'}
                        ]
                    },
                    namespaceScope,
                    false // TODO: Remove this concept as it is inconsistent with |null.
                );

                expect(typeFactory.createUnionType).to.have.been.calledOnce;
                expect(typeFactory.createUnionType).to.have.been.calledWith(
                    {
                        'boolean': sinon.match.same(scalarBooleanType),
                        'float': sinon.match.same(scalarFloatType)
                    }
                );
            });

            it('should provide the scalar types sorted by priority', function () {
                provider.createType(
                    {
                        type: 'union',
                        types: [
                            {type: 'scalar', scalarType: 'bool'},
                            {type: 'scalar', scalarType: 'float'}
                        ]
                    },
                    namespaceScope,
                    false // TODO: Remove this concept as it is inconsistent with |null.
                );

                expect(typeFactory.createUnionType).to.have.been.calledOnce;
                expect(typeFactory.createUnionType).to.have.been.calledWith(
                    sinon.match.any,
                    [
                        sinon.match.same(scalarFloatType),
                        sinon.match.same(scalarBooleanType)
                    ]
                );
            });

            it('should provide the class types', function () {
                provider.createType(
                    {
                        type: 'union',
                        types: [
                            {type: 'scalar', scalarType: 'bool'},
                            {type: 'class'}
                        ]
                    },
                    namespaceScope,
                    false // TODO: Remove this concept as it is inconsistent with |null.
                );

                expect(typeFactory.createUnionType).to.have.been.calledOnce;
                expect(typeFactory.createUnionType).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    [
                        sinon.match.same(classType)
                    ]
                );
            });

            it('should provide the "other" types such as "callable"', function () {
                provider.createType(
                    {
                        type: 'union',
                        types: [
                            {type: 'scalar', scalarType: 'bool'},
                            {type: 'callable'}
                        ]
                    },
                    namespaceScope,
                    false // TODO: Remove this concept as it is inconsistent with |null.
                );

                expect(typeFactory.createUnionType).to.have.been.calledOnce;
                expect(typeFactory.createUnionType).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.any,
                    [
                        sinon.match.same(callableType)
                    ]
                );
            });
        });
    });
});
