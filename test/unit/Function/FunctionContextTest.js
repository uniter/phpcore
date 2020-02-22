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
    beforeEach(function () {
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);

        this.namespaceScope.getNamespacePrefix.returns('My\\Lib\\MyNamespace\\');

        this.context = new FunctionContext(this.namespaceScope, 'myFunction');
    });

    describe('getName()', function () {
        it('should return the correct string including the namespace prefix', function () {
            expect(this.context.getName()).to.equal('My\\Lib\\MyNamespace\\myFunction');
        });
    });

    describe('getTraceFrameName()', function () {
        it('should return the correct string including the namespace prefix', function () {
            // NB: This is intentionally identical to the result of .getName()
            expect(this.context.getTraceFrameName()).to.equal('My\\Lib\\MyNamespace\\myFunction');
        });
    });

    describe('getUnprefixedName()', function () {
        it('should return the correct string including the namespace prefix', function () {
            // NB: This is also intentionally identical to the result of .getName()
            expect(this.context.getUnprefixedName()).to.equal('My\\Lib\\MyNamespace\\myFunction');
        });
    });
});
