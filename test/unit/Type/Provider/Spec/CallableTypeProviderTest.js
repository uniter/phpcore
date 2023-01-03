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
    CallableTypeProvider = require('../../../../../src/Type/Provider/Spec/CallableTypeProvider'),
    NamespaceScope = require('../../../../../src/NamespaceScope').sync(),
    TypeFactory = require('../../../../../src/Type/TypeFactory');

describe('CallableTypeProvider', function () {
    var namespaceScope,
        provider,
        typeFactory;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        typeFactory = sinon.createStubInstance(TypeFactory);

        provider = new CallableTypeProvider(typeFactory);
    });

    describe('createType()', function () {
        it('should be able to create a nullable "callable" type', function () {
            var callableType = sinon.createStubInstance(CallableType);
            typeFactory.createCallableType
                .withArgs(sinon.match.same(namespaceScope), true)
                .returns(callableType);

            expect(
                provider.createType({type: 'callable'}, namespaceScope, true)
            ).to.equal(callableType);
        });

        it('should be able to create a non-nullable "callable" type', function () {
            var callableType = sinon.createStubInstance(CallableType);
            typeFactory.createCallableType
                .withArgs(sinon.match.same(namespaceScope), false)
                .returns(callableType);

            expect(
                provider.createType({type: 'callable'}, namespaceScope, false)
            ).to.equal(callableType);
        });
    });
});
