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
    ClassDefinition = require('../../../../src/Class/Definition/ClassDefinition'),
    CallInstrumentation = require('../../../../src/Instrumentation/CallInstrumentation'),
    Class = require('../../../../src/Class').sync(),
    Namespace = require('../../../../src/Namespace').sync(),
    NamespaceScope = require('../../../../src/NamespaceScope').sync(),
    ValueCoercer = require('../../../../src/FFI/Value/ValueCoercer');

describe('ClassDefinition', function () {
    var definition,
        instrumentation,
        interface1,
        interface2,
        InternalClass,
        methodCaller,
        methods,
        namespace,
        namespaceScope,
        rootInternalPrototype,
        superClass,
        valueCoercer;

    beforeEach(function () {
        instrumentation = sinon.createStubInstance(CallInstrumentation);
        interface1 = sinon.createStubInstance(Class);
        interface2 = sinon.createStubInstance(Class);
        InternalClass = sinon.stub();
        rootInternalPrototype = InternalClass.prototype;
        methodCaller = sinon.stub();
        methods = {};
        namespace = sinon.createStubInstance(Namespace);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        superClass = sinon.createStubInstance(Class);
        valueCoercer = sinon.createStubInstance(ValueCoercer);

        namespace.getPrefix.returns('My\\Stuff\\');

        definition = new ClassDefinition(
            'MyClass',
            namespace,
            namespaceScope,
            superClass,
            [interface1, interface2],
            {},
            '__construct',
            InternalClass,
            {},
            methods,
            rootInternalPrototype,
            {},
            {},
            valueCoercer,
            methodCaller,
            instrumentation
        );
    });

    describe('getName()', function () {
        it('should return a correctly constructed Fully-Qualified Class Name', function () {
            expect(definition.getName()).to.equal('My\\Stuff\\MyClass');
        });
    });

    describe('hasDestructor()', function () {
        it('should return true when the class defines a __destruct() method', function () {
            methods.__destruct = sinon.stub();

            expect(definition.hasDestructor()).to.be.true;
        });

        it('should return false when the class does not define a __destruct() method', function () {
            expect(definition.hasDestructor()).to.be.false;
        });
    });
});
