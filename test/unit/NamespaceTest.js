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
    CallStack = require('../../src/CallStack'),
    ClassAutoloader = require('../../src/ClassAutoloader').sync(),
    FunctionFactory = require('../../src/FunctionFactory'),
    Namespace = require('../../src/Namespace').sync(),
    NamespaceFactory = require('../../src/NamespaceFactory'),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('Namespace', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.classAutoloader = sinon.createStubInstance(ClassAutoloader);
        this.functionFactory = sinon.createStubInstance(FunctionFactory);
        this.namespaceFactory = sinon.createStubInstance(NamespaceFactory);
        this.parentNamespace = sinon.createStubInstance(Namespace);
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.createNamespace = function (namespaceName) {
            this.namespace = new Namespace(
                this.callStack,
                this.valueFactory,
                this.namespaceFactory,
                this.functionFactory,
                this.classAutoloader,
                this.parentNamespace,
                namespaceName
            );
        }.bind(this);
    });

    describe('getName()', function () {
        it('should return the name of the namespace prefixed with the parent\'s name', function () {
            this.parentNamespace.getPrefix.returns('The\\Parent\\Of\\');
            this.createNamespace('MyNamespace');

            expect(this.namespace.getName()).to.equal('The\\Parent\\Of\\MyNamespace');
        });

        it('should return the empty string when namespace has no name', function () {
            this.createNamespace('');

            expect(this.namespace.getName()).to.equal('');
        });
    });

    describe('getPrefix()', function () {
        it('should return the full path of the namespace suffixed with a backslash', function () {
            this.parentNamespace.getPrefix.returns('The\\Parent\\Of\\');
            this.createNamespace('MyNamespace');

            expect(this.namespace.getPrefix()).to.equal('The\\Parent\\Of\\MyNamespace\\');
        });

        it('should return the empty string when namespace has no name', function () {
            this.createNamespace('');

            expect(this.namespace.getPrefix()).to.equal('');
        });
    });
});
