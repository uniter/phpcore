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

        this.functionFactory.create.restore();
        sinon.stub(this.functionFactory, 'create', function (namespace, currentClass, currentScope, func, name) {
            var wrapperFunc = sinon.stub();
            wrapperFunc.testArgs = {
                namespace: namespace,
                currentClass: currentClass,
                currentScope: currentScope,
                func: func,
                name: name
            };
            return wrapperFunc;
        });

        this.namespaceFactory.create.restore();
        sinon.stub(this.namespaceFactory, 'create', function (parentNamespace, name) {
            var subNamespace = sinon.createStubInstance(Namespace);
            subNamespace.children = {};
            subNamespace.testArgs = {
                parentNamespace: parentNamespace,
                name: name
            };
            return subNamespace;
        });

        this.createNamespace = function (namespaceName) {
            this.namespace = new Namespace(
                this.callStack,
                this.valueFactory,
                this.namespaceFactory,
                this.functionFactory,
                this.classAutoloader,
                this.parentNamespace,
                namespaceName || ''
            );
        }.bind(this);
    });

    describe('getDescendant', function () {
        it('should fetch descendant namespaces case-insensitively', function () {
            var descendantNamespace;
            this.createNamespace('MyNamespace');

            descendantNamespace = this.namespace.getDescendant('My\\Namespace\\Path');

            expect(this.namespace.getDescendant('mY\\NameSPACE\\PaTh')).to.equal(descendantNamespace);
        });
    });

    describe('getFunction()', function () {
        beforeEach(function () {
            this.function = sinon.stub();
            this.createNamespace('MyNamespace');
        });

        it('should simply return a native function if specified', function () {
            this.namespace.defineFunction('myFunction', this.function);

            expect(this.namespace.getFunction(this.function)).to.equal(this.function);
        });

        it('should retrieve the function with correct case', function () {
            this.namespace.defineFunction('myFunction', this.function);

            expect(this.namespace.getFunction('myFunction').testArgs.func).to.equal(this.function);
        });

        it('should retrieve the function case-insensitively', function () {
            this.namespace.defineFunction('myFunction', this.function);

            expect(this.namespace.getFunction('MYFUNctioN').testArgs.func).to.equal(this.function);
        });

        it('should fall back to the global namespace if the function does not exist in this one', function () {
            var theFunction = sinon.stub();
            this.parentNamespace.functions = {
                thefunction: theFunction
            };
            this.parentNamespace.name = '';
            this.parentNamespace.getGlobal.returns(this.parentNamespace);

            expect(this.namespace.getFunction('THEFunCTion')).to.equal(theFunction);
        });

        it('should allow functions in this namespace to override those in the global one', function () {
            var functionInGlobalSpace = sinon.stub(),
                functionInThisSpace = sinon.stub();
            this.parentNamespace.functions = {
                thefunction: functionInGlobalSpace
            };
            this.parentNamespace.name = '';
            this.parentNamespace.getGlobal.returns(this.parentNamespace);
            this.namespace.defineFunction('theFunction', functionInThisSpace);

            expect(this.namespace.getFunction('theFunction').testArgs.func).to.equal(functionInThisSpace);
        });
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

    describe('getOwnFunction()', function () {
        beforeEach(function () {
            this.function = sinon.stub();
            this.createNamespace('MyNamespace');
        });

        it('should retrieve the function with correct case', function () {
            this.namespace.defineFunction('myFunction', this.function);

            expect(this.namespace.getOwnFunction('myFunction').testArgs.func).to.equal(this.function);
        });

        it('should retrieve the function case-insensitively', function () {
            this.namespace.defineFunction('myFunction', this.function);

            expect(this.namespace.getOwnFunction('MYFUNctioN').testArgs.func).to.equal(this.function);
        });

        it('should not fall back to the global namespace if the function does not exist in this one', function () {
            var theFunction = sinon.stub();
            this.parentNamespace.functions = {
                thefunction: theFunction
            };
            this.parentNamespace.name = '';
            this.parentNamespace.getGlobal.returns(this.parentNamespace);

            expect(this.namespace.getOwnFunction('thefunction')).to.be.null;
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
