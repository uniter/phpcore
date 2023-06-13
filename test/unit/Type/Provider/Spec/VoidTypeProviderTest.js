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
    TypeFactory = require('../../../../../src/Type/TypeFactory'),
    VoidType = require('../../../../../src/Type/VoidType'),
    VoidTypeProvider = require('../../../../../src/Type/Provider/Spec/VoidTypeProvider');

describe('VoidTypeProvider', function () {
    var namespaceScope,
        provider,
        typeFactory;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        typeFactory = sinon.createStubInstance(TypeFactory);

        provider = new VoidTypeProvider(typeFactory);
    });

    describe('createType()', function () {
        it('should be able to create a "void" type', function () {
            var voidType = sinon.createStubInstance(VoidType);
            typeFactory.createVoidType
                .returns(voidType);

            expect(
                provider.createType({type: 'void'}, namespaceScope, true)
            ).to.equal(voidType);
        });
    });
});
