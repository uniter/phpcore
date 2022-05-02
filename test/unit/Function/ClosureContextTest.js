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
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    Class = require('../../../src/Class').sync(),
    ClosureContext = require('../../../src/Function/ClosureContext'),
    Exception = phpCommon.Exception,
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot'),
    Value = require('../../../src/Value').sync();

describe('ClosureContext', function () {
    var classObject,
        context,
        enclosingObject,
        namespaceScope,
        referenceBinding,
        valueBinding;

    beforeEach(function () {
        classObject = sinon.createStubInstance(Class);
        enclosingObject = sinon.createStubInstance(ObjectValue);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        referenceBinding = sinon.createStubInstance(ReferenceSlot);
        valueBinding = sinon.createStubInstance(Value);

        classObject.getName.returns('Your\\Lib\\YourNamespace\\YourClass');
        namespaceScope.getNamespacePrefix.returns('My\\Lib\\MyNamespace\\');

        context = new ClosureContext(
            namespaceScope,
            classObject,
            enclosingObject,
            {
                'myRefBinding': referenceBinding
            },
            {
                'myValueBinding': valueBinding
            }
        );
    });

    describe('getName()', function () {
        it('should return the correct string including the namespace prefix but not the class', function () {
            expect(context.getName()).to.equal('My\\Lib\\MyNamespace\\{closure}');
        });
    });

    describe('getReferenceBinding()', function () {
        it('should return a valid reference binding', function () {
            expect(context.getReferenceBinding('myRefBinding')).to.equal(referenceBinding);
        });

        it('should throw when given a non-existent reference binding', function () {
            expect(function () {
                context.getReferenceBinding('invalidRefBinding');
            }).to.throw(
                Exception,
                'ClosureContext.getReferenceBinding() :: Closure has no reference binding for $invalidRefBinding'
            );
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

    describe('getValueBinding()', function () {
        it('should return a valid value binding', function () {
            expect(context.getValueBinding('myValueBinding')).to.equal(valueBinding);
        });

        it('should throw when given a non-existent value binding', function () {
            expect(function () {
                context.getValueBinding('invalidValueBinding');
            }).to.throw(
                Exception,
                'ClosureContext.getValueBinding() :: Closure has no value binding for $invalidValueBinding'
            );
        });
    });
});
