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
    Namespace = require('../../src/Namespace').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    StringValue = require('../../src/Value/String').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('NamespaceScope', function () {
    beforeEach(function () {
        this.globalNamespace = sinon.createStubInstance(Namespace);
        this.namespace = sinon.createStubInstance(Namespace);
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.valueFactory.createString.restore();
        sinon.stub(this.valueFactory, 'createString', function (string) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.getNative.returns(string);
            return stringValue;
        });

        this.scope = new NamespaceScope(this.globalNamespace, this.valueFactory, this.namespace);
    });

    describe('getNamespaceName()', function () {
        it('should return the name of the namespace', function () {
            this.namespace.getName.returns('My\\Namespace');

            expect(this.scope.getNamespaceName().getNative()).to.equal('My\\Namespace');
        });
    });
});
