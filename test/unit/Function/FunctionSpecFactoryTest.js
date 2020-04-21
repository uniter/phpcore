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
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    FunctionSpecFactory = require('../../../src/Function/FunctionSpecFactory'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    Parameter = require('../../../src/Function/Parameter'),
    ParameterListFactory = require('../../../src/Function/ParameterListFactory'),
    TypeFactory = require('../../../src/Type/TypeFactory'),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('FunctionSpecFactory', function () {
    var callStack,
        factory,
        namespaceScope,
        parameterListFactory,
        typeFactory,
        valueFactory,
        ClosureContext,
        FunctionContext,
        FunctionSpec,
        MethodContext;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        parameterListFactory = sinon.createStubInstance(ParameterListFactory);
        typeFactory = sinon.createStubInstance(TypeFactory);
        valueFactory = new ValueFactory();
        ClosureContext = sinon.stub();
        FunctionContext = sinon.stub();
        FunctionSpec = sinon.stub();
        MethodContext = sinon.stub();

        factory = new FunctionSpecFactory(
            FunctionSpec,
            FunctionContext,
            MethodContext,
            ClosureContext,
            callStack,
            parameterListFactory,
            valueFactory
        );
    });

    describe('createAliasFunctionSpec()', function () {
        var functionContext,
            functionSpec,
            parameter1,
            parameter2;

        beforeEach(function () {
            functionContext = sinon.createStubInstance(FunctionContext);
            functionSpec = sinon.createStubInstance(FunctionSpec);
            parameter1 = sinon.createStubInstance(Parameter);
            parameter2 = sinon.createStubInstance(Parameter);

            FunctionContext
                .withArgs(sinon.match.same(namespaceScope), 'myFunction')
                .returns(functionContext);
            FunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(valueFactory),
                    sinon.match.same(functionContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);
        });

        it('should return a correctly constructed FunctionSpec', function () {
            expect(factory.createAliasFunctionSpec(
                namespaceScope,
                'myFunction',
                [parameter1, parameter2],
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });
    });

    describe('createClosureSpec()', function () {
        var closureContext,
            functionSpec,
            parameter1,
            parameter2,
            parametersSpecData;

        beforeEach(function () {
            closureContext = sinon.createStubInstance(ClosureContext);
            functionSpec = sinon.createStubInstance(FunctionSpec);
            parameter1 = sinon.createStubInstance(Parameter);
            parameter2 = sinon.createStubInstance(Parameter);

            parametersSpecData = [
                {
                    name: 'firstParam',
                    ref: false // Whether the parameter is passed by-reference
                },
                {
                    name: 'secondParam',
                    ref: true
                }
            ];

            parameterListFactory.createParameterList
                .withArgs(
                    sinon.match.same(closureContext),
                    parametersSpecData,
                    sinon.match.same(namespaceScope),
                    '/path/to/my/module.php',
                    123
                )
                .returns([parameter1, parameter2]);
        });

        it('should return a correctly constructed FunctionSpec when there is a current class', function () {
            var classObject = sinon.createStubInstance(Class);
            ClosureContext
                .withArgs(sinon.match.same(namespaceScope), sinon.match.same(classObject))
                .returns(closureContext);
            FunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(valueFactory),
                    sinon.match.same(closureContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);

            expect(factory.createClosureSpec(
                namespaceScope,
                classObject,
                parametersSpecData,
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });

        it('should return a correctly constructed FunctionSpec when there is no current class', function () {
            ClosureContext
                .withArgs(sinon.match.same(namespaceScope), null)
                .returns(closureContext);
            FunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(valueFactory),
                    sinon.match.same(closureContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);

            expect(factory.createClosureSpec(
                namespaceScope,
                null,
                parametersSpecData,
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });
    });
    
    describe('createFunctionSpec()', function () {
        var functionContext,
            functionSpec,
            parameter1,
            parameter2,
            parametersSpecData;

        beforeEach(function () {
            functionContext = sinon.createStubInstance(FunctionContext);
            functionSpec = sinon.createStubInstance(FunctionSpec);
            parameter1 = sinon.createStubInstance(Parameter);
            parameter2 = sinon.createStubInstance(Parameter);

            parametersSpecData = [
                {
                    name: 'firstParam',
                    ref: false // Whether the parameter is passed by-reference
                },
                {
                    name: 'secondParam',
                    ref: true
                }
            ];

            parameterListFactory.createParameterList
                .withArgs(
                    sinon.match.same(functionContext),
                    parametersSpecData,
                    sinon.match.same(namespaceScope),
                    '/path/to/my/module.php',
                    123
                )
                .returns([parameter1, parameter2]);

            FunctionContext
                .withArgs(sinon.match.same(namespaceScope), 'myFunction')
                .returns(functionContext);
            FunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(valueFactory),
                    sinon.match.same(functionContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);
        });

        it('should return a correctly constructed FunctionSpec', function () {
            expect(factory.createFunctionSpec(
                namespaceScope,
                'myFunction',
                parametersSpecData,
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });
    });

    describe('createMethodSpec()', function () {
        var classObject,
            functionSpec,
            methodContext,
            parameter1,
            parameter2,
            parametersSpecData;

        beforeEach(function () {
            classObject = sinon.createStubInstance(Class);
            methodContext = sinon.createStubInstance(MethodContext);
            functionSpec = sinon.createStubInstance(FunctionSpec);
            parameter1 = sinon.createStubInstance(Parameter);
            parameter2 = sinon.createStubInstance(Parameter);

            parametersSpecData = [
                {
                    name: 'firstParam',
                    ref: false // Whether the parameter is passed by-reference
                },
                {
                    name: 'secondParam',
                    ref: true
                }
            ];

            parameterListFactory.createParameterList
                .withArgs(
                    sinon.match.same(methodContext),
                    parametersSpecData,
                    sinon.match.same(namespaceScope),
                    '/path/to/my/module.php',
                    123
                )
                .returns([parameter1, parameter2]);

            MethodContext
                .withArgs(sinon.match.same(classObject), 'myMethod')
                .returns(methodContext);
            FunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(valueFactory),
                    sinon.match.same(methodContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);
        });

        it('should return a correctly constructed FunctionSpec', function () {
            expect(factory.createMethodSpec(
                namespaceScope,
                classObject,
                'myMethod',
                parametersSpecData,
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });
    });
});
