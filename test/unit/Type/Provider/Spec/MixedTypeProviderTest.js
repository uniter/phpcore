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
    MixedType = require('../../../../../src/Type/MixedType'),
    MixedTypeProvider = require('../../../../../src/Type/Provider/Spec/MixedTypeProvider'),
    NamespaceScope = require('../../../../../src/NamespaceScope').sync(),
    TypeFactory = require('../../../../../src/Type/TypeFactory');

describe('MixedTypeProvider', function () {
    var namespaceScope,
        provider,
        typeFactory;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        typeFactory = sinon.createStubInstance(TypeFactory);

        provider = new MixedTypeProvider(typeFactory);
    });

    describe('createType()', function () {
        it('should be able to create a mixed type', function () {
            var mixedType = sinon.createStubInstance(MixedType);
            typeFactory.createMixedType.returns(mixedType);

            expect(
                // NB: Type is omitted for a mixed type.
                provider.createType({}, namespaceScope, false)
            ).to.equal(mixedType);
        });
    });
});
