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
    ParameterTypeFactory = require('../../../src/Function/ParameterTypeFactory'),
    SpecTypeProvider = require('../../../src/Type/SpecTypeProvider'),
    TypeInterface = require('../../../src/Type/TypeInterface');

describe('ParameterTypeFactory', function () {
    var factory,
        namespaceScope,
        specTypeProvider;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        specTypeProvider = sinon.createStubInstance(SpecTypeProvider);

        factory = new ParameterTypeFactory(specTypeProvider);
    });

    describe('createParameterType()', function () {
        it('should create the type via the SpecTypeProvider', function () {
            var type = sinon.createStubInstance(TypeInterface);
            specTypeProvider.createType
                .withArgs({my: 'param spec'}, sinon.match.same(namespaceScope))
                .returns(type);

            expect(factory.createParameterType({my: 'param spec'}, namespaceScope))
                .to.equal(type);
        });
    });
});
