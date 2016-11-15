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
    Class = require('../../src/Class').sync(),
    ClosureFactory = require('../../src/ClosureFactory').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ReferenceFactory = require('../../src/ReferenceFactory').sync(),
    ScopeFactory = require('../../src/ScopeFactory'),
    SuperGlobalScope = require('../../src/SuperGlobalScope').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('ScopeFactory', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.closureFactory = sinon.createStubInstance(ClosureFactory);
        this.Scope = sinon.stub();
        this.globalScope = sinon.createStubInstance(this.Scope);
        this.referenceFactory = sinon.createStubInstance(ReferenceFactory);
        this.superGlobalScope = sinon.createStubInstance(SuperGlobalScope);
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.factory = new ScopeFactory(
            this.Scope,
            this.callStack,
            this.superGlobalScope,
            this.valueFactory,
            this.referenceFactory
        );
        this.factory.setClosureFactory(this.closureFactory);
        this.factory.setGlobalScope(this.globalScope);
    });

    describe('create()', function () {
        beforeEach(function () {
            this.name = 'MyNamespace';
            this.currentClass = sinon.createStubInstance(Class);
            this.currentFunction = sinon.stub();
            this.namespaceScope = sinon.createStubInstance(NamespaceScope);
            this.thisObject = sinon.createStubInstance(Value);
            this.callCreate = function () {
                return this.factory.create(
                    this.namespaceScope,
                    this.currentClass,
                    this.currentFunction,
                    this.thisObject
                );
            }.bind(this);
        });

        it('should return an instance of Scope', function () {
            expect(this.callCreate()).to.be.an.instanceOf(this.Scope);
        });

        it('should create one scope', function () {
            this.callCreate();

            expect(this.Scope).to.have.been.calledOnce;
        });

        it('should pass the CallStack to the scope', function () {
            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(sinon.match.same(this.callStack));
        });

        it('should pass the global scope to the scope', function () {
            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.globalScope)
            );
        });

        it('should pass the SuperGlobalScope to the scope', function () {
            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.superGlobalScope)
            );
        });

        it('should pass the ClosureFactory to the scope', function () {
            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.closureFactory)
            );
        });

        it('should pass the ValueFactory to the scope', function () {
            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.valueFactory)
            );
        });

        it('should pass the ReferenceFactory to the scope', function () {
            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.referenceFactory)
            );
        });

        it('should pass the NamespaceScope to the scope when specified', function () {
            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.namespaceScope)
            );
        });

        it('should pass null as the NamespaceScope to the scope when not specified', function () {
            this.namespaceScope = false;

            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });

        it('should pass the current class to the scope when specified', function () {
            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.currentClass)
            );
        });

        it('should pass null as the current class to the scope when not specified', function () {
            this.currentClass = null;

            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });

        it('should pass the current function to the scope when specified', function () {
            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.currentFunction)
            );
        });

        it('should pass null as the current function to the scope when not specified', function () {
            this.currentFunction = false;

            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });

        it('should pass the thisObject to the scope when specified', function () {
            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.thisObject)
            );
        });

        it('should pass null as the thisObject to the scope when not specified', function () {
            this.thisObject = false;

            this.callCreate();

            expect(this.Scope).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });
    });
});
