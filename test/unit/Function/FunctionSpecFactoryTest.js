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
    Flow = require('../../../src/Control/Flow'),
    FunctionSpecFactory = require('../../../src/Function/FunctionSpecFactory'),
    FutureFactory = require('../../../src/Control/FutureFactory'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    Parameter = require('../../../src/Function/Parameter'),
    ParameterListFactory = require('../../../src/Function/ParameterListFactory'),
    ReturnTypeProvider = require('../../../src/Function/ReturnTypeProvider'),
    TypeFactory = require('../../../src/Type/TypeFactory'),
    TypeInterface = require('../../../src/Type/TypeInterface'),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('FunctionSpecFactory', function () {
    var callStack,
        factory,
        flow,
        futureFactory,
        namespaceScope,
        parameterListFactory,
        returnTypeProvider,
        typeFactory,
        valueFactory,
        ClosureContext,
        FunctionContext,
        FunctionSpec,
        MethodContext;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        flow = sinon.createStubInstance(Flow);
        futureFactory = sinon.createStubInstance(FutureFactory);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        parameterListFactory = sinon.createStubInstance(ParameterListFactory);
        returnTypeProvider = sinon.createStubInstance(ReturnTypeProvider);
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
            returnTypeProvider,
            valueFactory,
            futureFactory,
            flow
        );
    });

    describe('createAliasFunctionSpec()', function () {
        var functionContext,
            functionSpec,
            parameter1,
            parameter2,
            returnType;

        beforeEach(function () {
            functionContext = sinon.createStubInstance(FunctionContext);
            functionSpec = sinon.createStubInstance(FunctionSpec);
            parameter1 = sinon.createStubInstance(Parameter);
            parameter2 = sinon.createStubInstance(Parameter);
            returnType = sinon.createStubInstance(TypeInterface);

            FunctionContext
                .withArgs(sinon.match.same(namespaceScope), 'myFunction')
                .returns(functionContext);
            FunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(valueFactory),
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(functionContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    sinon.match.same(returnType),
                    true,
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
                returnType,
                true,
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
            parametersSpecData,
            returnType,
            returnTypeSpecData;

        beforeEach(function () {
            closureContext = sinon.createStubInstance(ClosureContext);
            functionSpec = sinon.createStubInstance(FunctionSpec);
            parameter1 = sinon.createStubInstance(Parameter);
            parameter2 = sinon.createStubInstance(Parameter);
            returnType = sinon.createStubInstance(TypeInterface);
            returnTypeSpecData = {type: 'array'};

            returnTypeProvider.createReturnType
                .withArgs(returnTypeSpecData, sinon.match.same(namespaceScope))
                .returns(returnType);

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
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(closureContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    sinon.match.same(returnType),
                    false,
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);

            expect(factory.createClosureSpec(
                namespaceScope,
                classObject,
                parametersSpecData,
                returnTypeSpecData,
                false,
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
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(closureContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    sinon.match.same(returnType),
                    true,
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);

            expect(factory.createClosureSpec(
                namespaceScope,
                null,
                parametersSpecData,
                returnTypeSpecData,
                true,
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
            parametersSpecData,
            returnType,
            returnTypeSpecData;

        beforeEach(function () {
            functionContext = sinon.createStubInstance(FunctionContext);
            functionSpec = sinon.createStubInstance(FunctionSpec);
            parameter1 = sinon.createStubInstance(Parameter);
            parameter2 = sinon.createStubInstance(Parameter);
            returnType = sinon.createStubInstance(TypeInterface);
            returnTypeSpecData = {type: 'array'};

            returnTypeProvider.createReturnType
                .withArgs(returnTypeSpecData, sinon.match.same(namespaceScope))
                .returns(returnType);

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
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(functionContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    sinon.match.same(returnType),
                    false,
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
                returnTypeSpecData,
                false,
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
            parametersSpecData,
            returnType,
            returnTypeSpecData;

        beforeEach(function () {
            classObject = sinon.createStubInstance(Class);
            methodContext = sinon.createStubInstance(MethodContext);
            functionSpec = sinon.createStubInstance(FunctionSpec);
            parameter1 = sinon.createStubInstance(Parameter);
            parameter2 = sinon.createStubInstance(Parameter);
            returnType = sinon.createStubInstance(TypeInterface);
            returnTypeSpecData = {type: 'array'};

            returnTypeProvider.createReturnType
                .withArgs(returnTypeSpecData, sinon.match.same(namespaceScope))
                .returns(returnType);

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
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(methodContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    sinon.match.same(returnType),
                    true,
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
                returnTypeSpecData,
                true,
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });
    });
});
