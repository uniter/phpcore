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
    Class = require('../../../src/Class').sync(),
    ClosureContext = require('../../../src/Function/ClosureContext'),
    NamespaceScope = require('../../../src/NamespaceScope').sync();

describe('ClosureContext', function () {
    beforeEach(function () {
        this.classObject = sinon.createStubInstance(Class);
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);

        this.classObject.getName.returns('Your\\Lib\\YourNamespace\\YourClass');
        this.namespaceScope.getNamespacePrefix.returns('My\\Lib\\MyNamespace\\');

        this.context = new ClosureContext(this.namespaceScope, this.classObject);
    });

    describe('getName()', function () {
        it('should return the correct string including the namespace prefix but not the class', function () {
            expect(this.context.getName()).to.equal('My\\Lib\\MyNamespace\\{closure}');
        });
    });

    describe('getTraceFrameName()', function () {
        it('should return the correct string including the class and namespace when there is a current class', function () {
            expect(this.context.getTraceFrameName()).to.equal(
                'Your\\Lib\\YourNamespace\\YourClass::My\\Lib\\MyNamespace\\{closure}'
            );
        });

        it('should return the correct string including the namespace prefix when there is no current class', function () {
            var context = new ClosureContext(this.namespaceScope, null);

            expect(context.getTraceFrameName()).to.equal('My\\Lib\\MyNamespace\\{closure}');
        });
    });

    describe('getUnprefixedName()', function () {
        it('should return the correct string including the namespace prefix but not the class', function () {
            expect(this.context.getUnprefixedName()).to.equal('My\\Lib\\MyNamespace\\{closure}');
        });
    });
});
