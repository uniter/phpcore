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
    ClassDefiner = require('../../src/OOP/Class/ClassDefiner'),
    Flow = require('../../src/Control/Flow'),
    FunctionFactory = require('../../src/FunctionFactory').sync(),
    FunctionSpecFactory = require('../../src/Function/FunctionSpecFactory'),
    NamespaceFactory = require('../../src/NamespaceFactory'),
    OverloadedFunctionDefiner = require('../../src/Function/Overloaded/OverloadedFunctionDefiner'),
    TraitDefiner = require('../../src/OOP/Trait/TraitDefiner'),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('NamespaceFactory', function () {
    var callStack,
        classAutoloader,
        classDefiner,
        factory,
        flow,
        functionFactory,
        functionSpecFactory,
        Namespace,
        overloadedFunctionDefiner,
        traitDefiner,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        classAutoloader = sinon.createStubInstance(ClassAutoloader);
        classDefiner = sinon.createStubInstance(ClassDefiner);
        flow = sinon.createStubInstance(Flow);
        functionFactory = sinon.createStubInstance(FunctionFactory);
        functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);
        Namespace = sinon.stub();
        overloadedFunctionDefiner = sinon.createStubInstance(OverloadedFunctionDefiner);
        traitDefiner = sinon.createStubInstance(TraitDefiner);
        valueFactory = sinon.createStubInstance(ValueFactory);

        factory = new NamespaceFactory(
            Namespace,
            callStack,
            flow,
            functionFactory,
            functionSpecFactory,
            overloadedFunctionDefiner,
            valueFactory,
            classAutoloader,
            classDefiner,
            traitDefiner
        );
    });

    describe('create()', function () {
        var callCreate,
            name,
            parentNamespace;

        beforeEach(function () {
            name = 'MyNamespace';
            parentNamespace = sinon.createStubInstance(Namespace);
            callCreate = function () {
                return factory.create(parentNamespace, name);
            };
        });

        it('should return an instance of Namespace', function () {
            expect(callCreate()).to.be.an.instanceOf(Namespace);
        });

        it('should create one namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledOnce;
        });

        it('should pass the CallStack to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(sinon.match.same(callStack));
        });

        it('should pass Flow to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(flow)
            );
        });

        it('should pass the ValueFactory to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(valueFactory)
            );
        });

        it('should pass the NamespaceFactory to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(factory)
            );
        });

        it('should pass the FunctionFactory to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(functionFactory)
            );
        });

        it('should pass the FunctionSpecFactory to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(functionSpecFactory)
            );
        });

        it('should pass the OverloadedFunctionDefiner to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(overloadedFunctionDefiner)
            );
        });

        it('should pass the ClassAutoloader to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(classAutoloader)
            );
        });

        it('should pass the ClassDefiner to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(classDefiner)
            );
        });

        it('should pass the TraitDefiner to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(traitDefiner)
            );
        });

        it('should pass the parent namespace to the namespace when specified', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(parentNamespace)
            );
        });

        it('should pass null as the parent namespace when not specified', function () {
            parentNamespace = null;

            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
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

        it('should pass the name to the namespace when specified', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
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
            name = '';

            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
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
