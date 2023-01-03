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
    IterableType = require('../../../../../src/Type/IterableType'),
    IterableTypeProvider = require('../../../../../src/Type/Provider/Spec/IterableTypeProvider'),
    NamespaceScope = require('../../../../../src/NamespaceScope').sync(),
    TypeFactory = require('../../../../../src/Type/TypeFactory');

describe('IterableTypeProvider', function () {
    var namespaceScope,
        provider,
        typeFactory;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        typeFactory = sinon.createStubInstance(TypeFactory);

        provider = new IterableTypeProvider(typeFactory);
    });

    describe('createType()', function () {
        it('should be able to create a nullable "iterable" type', function () {
            var iterableType = sinon.createStubInstance(IterableType);
            typeFactory.createIterableType
                .withArgs(true)
                .returns(iterableType);

            expect(
                provider.createType({type: 'iterable'}, namespaceScope, true)
            ).to.equal(iterableType);
        });

        it('should be able to create a non-nullable "iterable" type', function () {
            var iterableType = sinon.createStubInstance(IterableType);
            typeFactory.createIterableType
                .withArgs(false)
                .returns(iterableType);

            expect(
                provider.createType({type: 'iterable'}, namespaceScope, false)
            ).to.equal(iterableType);
        });
    });
});
