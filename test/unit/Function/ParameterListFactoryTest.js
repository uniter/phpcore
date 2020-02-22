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
    FunctionContextInterface = require('../../../src/Function/FunctionContextInterface'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    Parameter = require('../../../src/Function/Parameter'),
    ParameterFactory = require('../../../src/Function/ParameterFactory'),
    ParameterListFactory = require('../../../src/Function/ParameterListFactory'),
    ParameterTypeFactory = require('../../../src/Function/ParameterTypeFactory'),
    TypeInterface = require('../../../src/Type/TypeInterface'),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('ParameterListFactory', function () {
    var callStack,
        factory,
        namespaceScope,
        parameterFactory,
        parameterTypeFactory,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        parameterFactory = sinon.createStubInstance(ParameterFactory);
        parameterTypeFactory = sinon.createStubInstance(ParameterTypeFactory);
        valueFactory = new ValueFactory();

        factory = new ParameterListFactory(parameterFactory, parameterTypeFactory);
    });

    describe('createParameterList()', function () {
        var firstParameterType,
            functionContext,
            parameter1,
            parameter2,
            secondParameterDefaultValueProvider,
            secondParameterType;

        beforeEach(function () {
            functionContext = sinon.createStubInstance(FunctionContextInterface);
            firstParameterType = sinon.createStubInstance(TypeInterface);
            parameter1 = sinon.createStubInstance(Parameter);
            parameter2 = sinon.createStubInstance(Parameter);
            secondParameterDefaultValueProvider = sinon.stub().returns(valueFactory.createString('my default value'));
            secondParameterType = sinon.createStubInstance(TypeInterface);

            parameterFactory.createParameter
                .withArgs(
                    'firstParam',
                    0,
                    sinon.match.same(firstParameterType),
                    sinon.match.same(functionContext),
                    false,
                    null,
                    '/path/to/my/module.php',
                    123
                )
                .returns(parameter1);
            parameterFactory.createParameter
                .withArgs(
                    'secondParam',
                    1,
                    sinon.match.same(secondParameterType),
                    sinon.match.same(functionContext),
                    true,
                    sinon.match.same(secondParameterDefaultValueProvider),
                    '/path/to/my/module.php',
                    123
                )
                .returns(parameter2);
        });

        it('should return a correctly constructed array of Parameters when none are omitted', function () {
            var parameters,
                parametersSpecData = [
                    {
                        name: 'firstParam',
                        ref: false // Whether the parameter is passed by-reference
                    },
                    {
                        name: 'secondParam',
                        ref: true,
                        value: secondParameterDefaultValueProvider
                    }
                ];

            parameterTypeFactory.createParameterType
                .withArgs(
                    parametersSpecData[0],
                    sinon.match.same(namespaceScope)
                )
                .returns(firstParameterType);
            parameterTypeFactory.createParameterType
                .withArgs(
                    parametersSpecData[1],
                    sinon.match.same(namespaceScope)
                )
                .returns(secondParameterType);

            parameters = factory.createParameterList(
                functionContext,
                parametersSpecData,
                namespaceScope,
                '/path/to/my/module.php',
                123
            );

            expect(parameters).to.have.length(2);
            expect(parameters[0]).to.equal(parameter1);
            expect(parameters[1]).to.equal(parameter2);
        });

        it('should return a correctly constructed array of Parameters when one is omitted', function () {
            var parameters,
                parametersSpecData = [
                    // Omit the first parameter - this could happen if the parameter has no type
                    // or default value, to reduce bundle size, at the expense of breaking the ability
                    // to fetch the parameter's name via reflection
                    null,
                    {
                        name: 'secondParam',
                        ref: true,
                        value: secondParameterDefaultValueProvider
                    }
                ];

            parameterTypeFactory.createParameterType
                .withArgs(
                    parametersSpecData[1],
                    sinon.match.same(namespaceScope)
                )
                .returns(secondParameterType);

            parameters = factory.createParameterList(
                functionContext,
                parametersSpecData,
                namespaceScope,
                '/path/to/my/module.php',
                123
            );

            expect(parameters).to.have.length(2);
            expect(parameters[0]).to.be.null;
            expect(parameters[1]).to.equal(parameter2);
        });
    });
});
