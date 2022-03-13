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
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ObjectValue = require('../../../src/Value/Object').sync();

describe('ClosureContext', function () {
    var classObject,
        context,
        enclosingObject,
        namespaceScope;

    beforeEach(function () {
        classObject = sinon.createStubInstance(Class);
        enclosingObject = sinon.createStubInstance(ObjectValue);
        namespaceScope = sinon.createStubInstance(NamespaceScope);

        classObject.getName.returns('Your\\Lib\\YourNamespace\\YourClass');
        namespaceScope.getNamespacePrefix.returns('My\\Lib\\MyNamespace\\');

        context = new ClosureContext(namespaceScope, classObject, enclosingObject);
    });

    describe('getName()', function () {
        it('should return the correct string including the namespace prefix but not the class', function () {
            expect(context.getName()).to.equal('My\\Lib\\MyNamespace\\{closure}');
        });
    });

    describe('getTraceFrameName()', function () {
        it('should return the correct string including the class and namespace when there is a current class and object', function () {
            expect(context.getTraceFrameName()).to.equal(
                'Your\\Lib\\YourNamespace\\YourClass->My\\Lib\\MyNamespace\\{closure}'
            );
        });

        it('should return the correct string including the class and namespace when there is a current class but no object', function () {
            var context = new ClosureContext(namespaceScope, classObject, null);

            expect(context.getTraceFrameName()).to.equal(
                // Note that "::" is used as the delimiter rather than "->".
                'Your\\Lib\\YourNamespace\\YourClass::My\\Lib\\MyNamespace\\{closure}'
            );
        });

        it('should return the correct string including the namespace prefix when there is no current class', function () {
            var context = new ClosureContext(namespaceScope, null, null);

            expect(context.getTraceFrameName()).to.equal('My\\Lib\\MyNamespace\\{closure}');
        });
    });

    describe('getUnprefixedName()', function () {
        it('should return the correct string including the namespace prefix but not the class', function () {
            expect(context.getUnprefixedName()).to.equal('My\\Lib\\MyNamespace\\{closure}');
        });
    });
});
