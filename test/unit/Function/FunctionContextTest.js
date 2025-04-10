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
    FunctionContext = require('../../../src/Function/FunctionContext'),
    NamespaceScope = require('../../../src/NamespaceScope').sync();

describe('FunctionContext', function () {
    var context,
        namespaceScope;

    beforeEach(function () {
        namespaceScope = sinon.createStubInstance(NamespaceScope);

        namespaceScope.getNamespacePrefix.returns('My\\Lib\\MyNamespace\\');

        context = new FunctionContext(namespaceScope, 'myFunction');
    });

    describe('getName()', function () {
        it('should return the correct string including the namespace prefix', function () {
            expect(context.getName()).to.equal('My\\Lib\\MyNamespace\\myFunction');
        });
    });

    describe('getTraceFrameName()', function () {
        it('should return the correct string including the namespace prefix', function () {
            // NB: This is intentionally identical to the result of .getName()
            expect(context.getTraceFrameName()).to.equal('My\\Lib\\MyNamespace\\myFunction');
        });
    });

    describe('getTrait()', function () {
        it('should return null', function () {
            expect(context.getTrait()).to.be.null;
        });
    });

    describe('getUnprefixedName()', function () {
        it('should return the correct string including the namespace prefix', function () {
            // NB: This is also intentionally identical to the result of .getName()
            expect(context.getUnprefixedName()).to.equal('My\\Lib\\MyNamespace\\myFunction');
        });
    });
});
