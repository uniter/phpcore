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
    NamespaceScope = require('../../../../../src/NamespaceScope').sync(),
    ScalarType = require('../../../../../src/Type/ScalarType'),
    ScalarTypeProvider = require('../../../../../src/Type/Provider/Spec/ScalarTypeProvider'),
    TypeFactory = require('../../../../../src/Type/TypeFactory');

describe('ScalarTypeProvider', function () {
    var namespaceScope,
        provider,
        typeFactory;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        typeFactory = sinon.createStubInstance(TypeFactory);

        provider = new ScalarTypeProvider(typeFactory);
    });

    describe('createType()', function () {
        it('should be able to create a nullable "scalar" type', function () {
            var scalarType = sinon.createStubInstance(ScalarType);
            typeFactory.createScalarType
                .withArgs('float', true)
                .returns(scalarType);

            expect(
                provider.createType(
                    {
                        type: 'scalar',
                        scalarType: 'float'
                    },
                    namespaceScope,
                    true
                )
            ).to.equal(scalarType);
        });

        it('should be able to create a non-nullable "scalar" type', function () {
            var scalarType = sinon.createStubInstance(ScalarType);
            typeFactory.createScalarType
                .withArgs('float', false)
                .returns(scalarType);

            expect(
                provider.createType(
                    {
                        type: 'scalar',
                        scalarType: 'float'
                    },
                    namespaceScope,
                    false
                )
            ).to.equal(scalarType);
        });
    });
});
