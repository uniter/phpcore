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
    NullType = require('../../../../../src/Type/NullType'),
    NullTypeProvider = require('../../../../../src/Type/Provider/Spec/NullTypeProvider'),
    TypeFactory = require('../../../../../src/Type/TypeFactory');

describe('NullTypeProvider', function () {
    var namespaceScope,
        provider,
        typeFactory;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        typeFactory = sinon.createStubInstance(TypeFactory);

        provider = new NullTypeProvider(typeFactory);
    });

    describe('createType()', function () {
        it('should be able to create a "null" type', function () {
            var nullType = sinon.createStubInstance(NullType);
            typeFactory.createNullType
                .returns(nullType);

            expect(
                provider.createType({type: 'null'}, namespaceScope, true)
            ).to.equal(nullType);
        });
    });
});
