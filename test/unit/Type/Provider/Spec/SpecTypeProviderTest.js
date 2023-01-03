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
    Exception = phpCommon.Exception,
    NamedTypeProviderInterface = require('../../../../../src/Type/Provider/Spec/NamedTypeProviderInterface'),
    NamespaceScope = require('../../../../../src/NamespaceScope').sync(),
    SpecTypeProvider = require('../../../../../src/Type/Provider/Spec/SpecTypeProvider'),
    TypeFactory = require('../../../../../src/Type/TypeFactory'),
    TypeInterface = require('../../../../../src/Type/TypeInterface');

describe('SpecTypeProvider', function () {
    var mixedNamedProvider,
        myTypeNamedProvider,
        namespaceScope,
        provider,
        typeFactory;

    beforeEach(function () {
        mixedNamedProvider = sinon.createStubInstance(NamedTypeProviderInterface);
        myTypeNamedProvider = sinon.createStubInstance(NamedTypeProviderInterface);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        typeFactory = sinon.createStubInstance(TypeFactory);

        mixedNamedProvider.getTypeName.returns('mixed');
        myTypeNamedProvider.getTypeName.returns('mytype');

        provider = new SpecTypeProvider(typeFactory);
        provider.addNamedProvider(mixedNamedProvider);
        provider.addNamedProvider(myTypeNamedProvider);
    });

    describe('createType()', function () {
        it('should create via the correct named provider when nullable', function () {
            var namedType = sinon.createStubInstance(TypeInterface);
            myTypeNamedProvider.createType
                .withArgs({type: 'mytype', nullable: true}, sinon.match.same(namespaceScope), true)
                .returns(namedType);

            expect(
                provider.createType({type: 'mytype', nullable: true}, namespaceScope)
            ).to.equal(namedType);
        });

        it('should create via the correct named provider when non-nullable', function () {
            var namedType = sinon.createStubInstance(TypeInterface);
            myTypeNamedProvider.createType
                .withArgs({type: 'mytype', nullable: false}, sinon.match.same(namespaceScope), false)
                .returns(namedType);

            expect(
                provider.createType({type: 'mytype', nullable: false}, namespaceScope)
            ).to.equal(namedType);
        });

        it('should create via the "mixed" named provider when type name is omitted', function () {
            var mixedType = sinon.createStubInstance(TypeInterface);
            mixedNamedProvider.createType
                .returns(mixedType);

            expect(
                provider.createType({nullable: false}, namespaceScope)
            ).to.equal(mixedType);
        });

        it('should throw when given an unsupported type name', function () {
            expect(function () {
                provider.createType(
                    {type: 'my_unsupported_type'},
                    namespaceScope
                );
            }).to.throw(
                Exception,
                'SpecTypeProvider.createType() :: No provider is registered for type "my_unsupported_type"'
            );
        });
    });
});
