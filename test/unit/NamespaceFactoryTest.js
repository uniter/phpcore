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
    ExportRepository = require('../../src/FFI/Export/ExportRepository'),
    FFIFactory = require('../../src/FFI/FFIFactory'),
    FunctionFactory = require('../../src/FunctionFactory').sync(),
    FunctionSpecFactory = require('../../src/Function/FunctionSpecFactory'),
    NamespaceFactory = require('../../src/NamespaceFactory'),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('NamespaceFactory', function () {
    var callStack,
        classAutoloader,
        exportRepository,
        factory,
        ffiFactory,
        functionFactory,
        functionSpecFactory,
        Namespace,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        classAutoloader = sinon.createStubInstance(ClassAutoloader);
        exportRepository = sinon.createStubInstance(ExportRepository);
        ffiFactory = sinon.createStubInstance(FFIFactory);
        functionFactory = sinon.createStubInstance(FunctionFactory);
        functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);
        Namespace = sinon.stub();
        valueFactory = sinon.createStubInstance(ValueFactory);

        factory = new NamespaceFactory(
            Namespace,
            callStack,
            functionFactory,
            functionSpecFactory,
            valueFactory,
            classAutoloader,
            exportRepository,
            ffiFactory
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

        it('should pass the ValueFactory to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(valueFactory)
            );
        });

        it('should pass the NamespaceFactory to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
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
                sinon.match.same(functionSpecFactory)
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
                sinon.match.same(classAutoloader)
            );
        });

        it('should pass the ExportRepository to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(exportRepository)
            );
        });

        it('should pass the FFIFactory to the namespace', function () {
            callCreate();

            expect(Namespace).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.any,
                sinon.match.same(ffiFactory)
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
                ''
            );
        });
    });
});
