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
    FunctionFactory = require('../../src/FunctionFactory').sync(),
    FunctionSpecFactory = require('../../src/Function/FunctionSpecFactory'),
    Namespace = require('../../src/Namespace').sync(),
    NamespaceFactory = require('../../src/NamespaceFactory'),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('NamespaceFactory', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.classAutoloader = sinon.createStubInstance(ClassAutoloader);
        this.functionFactory = sinon.createStubInstance(FunctionFactory);
        this.functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);
        this.Namespace = sinon.stub();
        this.valueFactory = sinon.createStubInstance(ValueFactory);

        this.factory = new NamespaceFactory(
            this.Namespace,
            this.callStack,
            this.functionFactory,
            this.functionSpecFactory,
            this.valueFactory,
            this.classAutoloader
        );
    });

    describe('create()', function () {
        beforeEach(function () {
            this.name = 'MyNamespace';
            this.parentNamespace = sinon.createStubInstance(Namespace);
            this.callCreate = function () {
                return this.factory.create(this.parentNamespace, this.name);
            }.bind(this);
        });

        it('should return an instance of Namespace', function () {
            expect(this.callCreate()).to.be.an.instanceOf(this.Namespace);
        });

        it('should create one namespace', function () {
            this.callCreate();

            expect(this.Namespace).to.have.been.calledOnce;
        });

        it('should pass the CallStack to the namespace', function () {
            this.callCreate();

            expect(this.Namespace).to.have.been.calledWith(sinon.match.same(this.callStack));
        });

        it('should pass the ValueFactory to the namespace', function () {
            this.callCreate();

            expect(this.Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.valueFactory)
            );
        });

        it('should pass the NamespaceFactory to the namespace', function () {
            this.callCreate();

            expect(this.Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.factory)
            );
        });

        it('should pass the FunctionFactory to the namespace', function () {
            this.callCreate();

            expect(this.Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.functionFactory)
            );
        });

        it('should pass the FunctionSpecFactory to the namespace', function () {
            this.callCreate();

            expect(this.Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.functionSpecFactory)
            );
        });

        it('should pass the ClassAutoloader to the namespace', function () {
            this.callCreate();

            expect(this.Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.classAutoloader)
            );
        });

        it('should pass the parent namespace to the namespace when specified', function () {
            this.callCreate();

            expect(this.Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(this.parentNamespace)
            );
        });

        it('should pass null as the parent namespace when not specified', function () {
            this.parentNamespace = null;

            this.callCreate();

            expect(this.Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                null
            );
        });

        it('should pass the name to the namespace when specified', function () {
            this.callCreate();

            expect(this.Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                'MyNamespace'
            );
        });

        it('should pass the empty string as the name when not specified', function () {
            this.name = '';

            this.callCreate();

            expect(this.Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                ''
            );
        });
    });
});
