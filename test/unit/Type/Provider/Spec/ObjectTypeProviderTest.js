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
    ObjectType = require('../../../../../src/Type/ObjectType'),
    ObjectTypeProvider = require('../../../../../src/Type/Provider/Spec/ObjectTypeProvider'),
    TypeFactory = require('../../../../../src/Type/TypeFactory');

describe('ObjectTypeProvider', function () {
    var namespaceScope,
        provider,
        typeFactory;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        typeFactory = sinon.createStubInstance(TypeFactory);

        provider = new ObjectTypeProvider(typeFactory);
    });

    describe('createType()', function () {
        it('should be able to create a nullable "object" type', function () {
            var objectType = sinon.createStubInstance(ObjectType);
            typeFactory.createObjectType
                .withArgs(true)
                .returns(objectType);

            expect(
                provider.createType({type: 'object'}, namespaceScope, true)
            ).to.equal(objectType);
        });

        it('should be able to create a non-nullable "object" type', function () {
            var objectType = sinon.createStubInstance(ObjectType);
            typeFactory.createObjectType
                .withArgs(false)
                .returns(objectType);

            expect(
                provider.createType({type: 'object'}, namespaceScope, false)
            ).to.equal(objectType);
        });
    });
});
