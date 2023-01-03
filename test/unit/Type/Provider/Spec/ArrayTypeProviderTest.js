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
    ArrayType = require('../../../../../src/Type/ArrayType'),
    ArrayTypeProvider = require('../../../../../src/Type/Provider/Spec/ArrayTypeProvider'),
    NamespaceScope = require('../../../../../src/NamespaceScope').sync(),
    TypeFactory = require('../../../../../src/Type/TypeFactory');

describe('ArrayTypeProvider', function () {
    var namespaceScope,
        provider,
        typeFactory;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        typeFactory = sinon.createStubInstance(TypeFactory);

        provider = new ArrayTypeProvider(typeFactory);
    });

    describe('createType()', function () {
        it('should be able to create a nullable "array" type', function () {
            var arrayType = sinon.createStubInstance(ArrayType);
            typeFactory.createArrayType
                .withArgs(true)
                .returns(arrayType);

            expect(
                provider.createType({type: 'array'}, namespaceScope, true)
            ).to.equal(arrayType);
        });

        it('should be able to create a non-nullable "array" type', function () {
            var arrayType = sinon.createStubInstance(ArrayType);
            typeFactory.createArrayType
                .withArgs(false)
                .returns(arrayType);

            expect(
                provider.createType({type: 'array'}, namespaceScope, false)
            ).to.equal(arrayType);
        });
    });
});
