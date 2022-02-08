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
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ReturnTypeProvider = require('../../../src/Function/ReturnTypeProvider'),
    SpecTypeProvider = require('../../../src/Type/SpecTypeProvider'),
    TypeInterface = require('../../../src/Type/TypeInterface');

describe('ReturnTypeProvider', function () {
    var namespaceScope,
        provider,
        specTypeProvider;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        specTypeProvider = sinon.createStubInstance(SpecTypeProvider);

        provider = new ReturnTypeProvider(specTypeProvider);
    });

    describe('createReturnType()', function () {
        it('should create the type via the SpecTypeProvider', function () {
            var type = sinon.createStubInstance(TypeInterface);
            specTypeProvider.createType
                .withArgs({my: 'return spec'}, sinon.match.same(namespaceScope))
                .returns(type);

            expect(provider.createReturnType({my: 'return spec'}, namespaceScope))
                .to.equal(type);
        });
    });
});
