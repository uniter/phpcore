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
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    Flow = require('../../../src/Control/Flow'),
    FunctionSpecFactory = require('../../../src/Function/FunctionSpecFactory'),
    FutureFactory = require('../../../src/Control/FutureFactory'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    Parameter = require('../../../src/Function/Parameter'),
    ParameterListFactory = require('../../../src/Function/ParameterListFactory'),
    ReferenceFactory = require('../../../src/ReferenceFactory').sync(),
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot'),
    ReturnTypeProvider = require('../../../src/Function/ReturnTypeProvider'),
    Trait = require('../../../src/OOP/Trait/Trait'),
    Translator = phpCommon.Translator,
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
        referenceFactory,
        returnTypeProvider,
        translator,
        typeFactory,
        valueFactory,
        ClosureContext,
        FunctionContext,
        FunctionSpec,
        InvalidOverloadedFunctionSpec,
        MethodContext,
        OverloadedFunctionSpec;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        flow = sinon.createStubInstance(Flow);
        futureFactory = sinon.createStubInstance(FutureFactory);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        parameterListFactory = sinon.createStubInstance(ParameterListFactory);
        referenceFactory = sinon.createStubInstance(ReferenceFactory);
        returnTypeProvider = sinon.createStubInstance(ReturnTypeProvider);
        translator = sinon.createStubInstance(Translator);
        typeFactory = sinon.createStubInstance(TypeFactory);
        valueFactory = sinon.createStubInstance(ValueFactory);
        ClosureContext = sinon.stub();
        FunctionContext = sinon.stub();
        FunctionSpec = sinon.stub();
        InvalidOverloadedFunctionSpec = sinon.stub();
        MethodContext = sinon.stub();
        OverloadedFunctionSpec = sinon.stub();

        factory = new FunctionSpecFactory(
            FunctionSpec,
            FunctionContext,
            MethodContext,
            ClosureContext,
            OverloadedFunctionSpec,
            InvalidOverloadedFunctionSpec,
            callStack,
            translator,
            parameterListFactory,
            returnTypeProvider,
            valueFactory,
            referenceFactory,
            futureFactory,
            flow
        );
    });

    describe('createAliasFunctionSpec()', function () {
        var func,
            functionContext,
            functionSpec,
            parameter1,
            parameter1Alias,
            parameter2,
            parameter2Alias,
            returnType;

        beforeEach(function () {
            func = sinon.stub();
            functionContext = sinon.createStubInstance(FunctionContext);
            functionSpec = sinon.createStubInstance(FunctionSpec);
            parameter1 = sinon.createStubInstance(Parameter);
            parameter1Alias = sinon.createStubInstance(Parameter);
            parameter2 = sinon.createStubInstance(Parameter);
            parameter2Alias = sinon.createStubInstance(Parameter);
            returnType = sinon.createStubInstance(TypeInterface);

            parameter1.createAlias
                .withArgs(sinon.match.same(functionContext))
                .returns(parameter1Alias);
            parameter2.createAlias
                .withArgs(sinon.match.same(functionContext))
                .returns(parameter2Alias);

            FunctionContext
                .withArgs(sinon.match.same(namespaceScope), 'myFunction')
                .returns(functionContext);
            FunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(translator),
                    sinon.match.same(valueFactory),
                    sinon.match.same(referenceFactory),
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(factory),
                    sinon.match.same(functionContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1Alias), sinon.match.same(parameter2Alias)],
                    sinon.match.same(func),
                    sinon.match.same(returnType),
                    true,
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);
        });

        it('should return a correctly constructed FunctionSpec when all parameters are present', function () {
            expect(factory.createAliasFunctionSpec(
                namespaceScope,
                'myFunction',
                [parameter1, parameter2],
                func,
                returnType,
                true,
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });

        it('should return a correctly constructed FunctionSpec when one parameter is optimised away', function () {
            FunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(translator),
                    sinon.match.same(valueFactory),
                    sinon.match.same(referenceFactory),
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(factory),
                    sinon.match.same(functionContext),
                    sinon.match.same(namespaceScope),
                    [null, sinon.match.same(parameter2Alias)],
                    sinon.match.same(func),
                    sinon.match.same(returnType),
                    true,
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);

            expect(factory.createAliasFunctionSpec(
                namespaceScope,
                'myFunction',
                [null, parameter2],
                func,
                returnType,
                true,
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });
    });

    describe('createClosureSpec()', function () {
        var closureContext,
            func,
            functionSpec,
            parameter1,
            parameter2,
            parametersSpecData,
            referenceBinding,
            returnType,
            returnTypeSpecData,
            valueBinding;

        beforeEach(function () {
            closureContext = sinon.createStubInstance(ClosureContext);
            func = sinon.stub();
            functionSpec = sinon.createStubInstance(FunctionSpec);
            parameter1 = sinon.createStubInstance(Parameter);
            parameter2 = sinon.createStubInstance(Parameter);
            referenceBinding = sinon.createStubInstance(ReferenceSlot);
            returnType = sinon.createStubInstance(TypeInterface);
            returnTypeSpecData = {type: 'array'};
            valueBinding = valueFactory.createString('my value');

            returnTypeProvider.createReturnType
                .withArgs(returnTypeSpecData, sinon.match.same(namespaceScope))
                .returns(returnType);

            parametersSpecData = [
                {
                    name: 'firstParam',
                    ref: false // Whether the parameter is passed by-reference.
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

        it('should return a correctly constructed FunctionSpec when there is a current class and object', function () {
            const classObject = sinon.createStubInstance(Class),
                enclosingObject = sinon.createStubInstance(ObjectValue),
                traitObject = sinon.createStubInstance(Trait);
            ClosureContext
                .withArgs(
                    sinon.match.same(namespaceScope),
                    sinon.match.same(classObject),
                    sinon.match.same(traitObject),
                    sinon.match.same(enclosingObject),
                    {'myRefBinding': sinon.match.same(referenceBinding)},
                    {'myValueBinding': sinon.match.same(valueBinding)}
                )
                .returns(closureContext);
            FunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(translator),
                    sinon.match.same(valueFactory),
                    sinon.match.same(referenceFactory),
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(factory),
                    sinon.match.same(closureContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    sinon.match.same(func),
                    sinon.match.same(returnType),
                    false,
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);

            expect(factory.createClosureSpec(
                namespaceScope,
                classObject,
                traitObject,
                enclosingObject,
                parametersSpecData,
                func,
                returnTypeSpecData,
                false,
                {'myRefBinding': referenceBinding},
                {'myValueBinding': valueBinding},
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });

        it('should return a correctly constructed FunctionSpec when there is a current class but no object', function () {
            const classObject = sinon.createStubInstance(Class),
                traitObject = sinon.createStubInstance(Trait);
            ClosureContext
                .withArgs(
                    sinon.match.same(namespaceScope),
                    sinon.match.same(classObject),
                    sinon.match.same(traitObject),
                    null,
                    {'myRefBinding': sinon.match.same(referenceBinding)},
                    {'myValueBinding': sinon.match.same(valueBinding)}
                )
                .returns(closureContext);
            FunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(translator),
                    sinon.match.same(valueFactory),
                    sinon.match.same(referenceFactory),
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(factory),
                    sinon.match.same(closureContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    sinon.match.same(func),
                    sinon.match.same(returnType),
                    false,
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);

            expect(factory.createClosureSpec(
                namespaceScope,
                classObject,
                traitObject,
                null,
                parametersSpecData,
                func,
                returnTypeSpecData,
                false,
                {'myRefBinding': referenceBinding},
                {'myValueBinding': valueBinding},
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });

        it('should return a correctly constructed FunctionSpec when there is no current class or object', function () {
            ClosureContext
                .withArgs(
                    sinon.match.same(namespaceScope),
                    null,
                    null,
                    null,
                    {'myRefBinding': sinon.match.same(referenceBinding)},
                    {'myValueBinding': sinon.match.same(valueBinding)}
                )
                .returns(closureContext);
            FunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(translator),
                    sinon.match.same(valueFactory),
                    sinon.match.same(referenceFactory),
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(factory),
                    sinon.match.same(closureContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    sinon.match.same(func),
                    sinon.match.same(returnType),
                    true,
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);

            expect(factory.createClosureSpec(
                namespaceScope,
                null,
                null,
                null,
                parametersSpecData,
                func,
                returnTypeSpecData,
                true,
                {'myRefBinding': referenceBinding},
                {'myValueBinding': valueBinding},
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });
    });

    describe('createFunctionSpec()', function () {
        var func,
            functionContext,
            functionSpec,
            parameter1,
            parameter2,
            parametersSpecData,
            returnType,
            returnTypeSpecData;

        beforeEach(function () {
            func = sinon.stub();
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
                    ref: false // Whether the parameter is passed by-reference.
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
                    sinon.match.same(translator),
                    sinon.match.same(valueFactory),
                    sinon.match.same(referenceFactory),
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(factory),
                    sinon.match.same(functionContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    sinon.match.same(func),
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
                func,
                returnTypeSpecData,
                false,
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });
    });

    describe('createInvalidOverloadedFunctionSpec()', function () {
        it('should return a correctly constructed InvalidOverloadedFunctionSpec', function () {
            var invalidSpec = sinon.createStubInstance(InvalidOverloadedFunctionSpec),
                overloadedFunctionSpec = sinon.createStubInstance(OverloadedFunctionSpec);
            InvalidOverloadedFunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(translator),
                    sinon.match.same(flow),
                    sinon.match.same(overloadedFunctionSpec),
                    21
                )
                .returns(invalidSpec);

            expect(factory.createInvalidOverloadedFunctionSpec(overloadedFunctionSpec, 21)).to.equal(invalidSpec);
        });
    });

    describe('createMethodSpec()', function () {
        var classObject,
            func,
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
            func = sinon.stub();
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
        });

        it('should return a correctly constructed FunctionSpec', function () {
            const traitObject = null;
            MethodContext
                .withArgs(
                    sinon.match.same(classObject),
                    sinon.match.same(traitObject),
                    'myMethod'
                )
                .returns(methodContext);
            FunctionSpec
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(translator),
                    sinon.match.same(valueFactory),
                    sinon.match.same(referenceFactory),
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(factory),
                    sinon.match.same(methodContext),
                    sinon.match.same(namespaceScope),
                    [sinon.match.same(parameter1), sinon.match.same(parameter2)],
                    sinon.match.same(func),
                    sinon.match.same(returnType),
                    true,
                    '/path/to/my/module.php',
                    123
                )
                .returns(functionSpec);

            expect(factory.createMethodSpec(
                namespaceScope,
                classObject,
                traitObject,
                'myMethod',
                parametersSpecData,
                func,
                returnTypeSpecData,
                true,
                '/path/to/my/module.php',
                123
            )).to.equal(functionSpec);
        });
    });

    describe('createOverloadedFunctionSpec()', function () {
        it('should return a correctly constructed OverloadedFunctionSpec', function () {
            var overloadedFunctionSpec = sinon.createStubInstance(OverloadedFunctionSpec),
                variantFunctionSpec1 = sinon.createStubInstance(FunctionSpec),
                variantFunctionSpec2 = sinon.createStubInstance(FunctionSpec);
            OverloadedFunctionSpec
                .withArgs(
                    sinon.match.same(factory),
                    sinon.match.same(namespaceScope),
                    'myFunc',
                    {
                        3: sinon.match.same(variantFunctionSpec1),
                        6: sinon.match.same(variantFunctionSpec2)
                    },
                    2,
                    7
                )
                .returns(overloadedFunctionSpec);

            expect(
                factory.createOverloadedFunctionSpec(
                    'myFunc',
                    {
                        3: variantFunctionSpec1,
                        6: variantFunctionSpec2
                    },
                    2,
                    7,
                    namespaceScope
                )
            ).to.equal(overloadedFunctionSpec);
        });
    });
});
