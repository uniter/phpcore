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
    tools = require('../tools'),
    CallStack = require('../../../src/CallStack'),
    Flow = require('../../../src/Control/Flow'),
    FunctionContextInterface = require('../../../src/Function/FunctionContextInterface'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    Parameter = require('../../../src/Function/Parameter'),
    ParameterFactory = require('../../../src/Function/ParameterFactory'),
    TypeInterface = require('../../../src/Type/TypeInterface');

describe('ParameterFactory', function () {
    var callStack,
        factory,
        FakeParameter,
        flow,
        futureFactory,
        namespaceScope,
        state,
        translator,
        userland,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        FakeParameter = sinon.stub();
        flow = sinon.createStubInstance(Flow);
        futureFactory = state.getFutureFactory();
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        translator = state.getTranslator();
        userland = state.getUserland();
        valueFactory = state.getValueFactory();

        factory = new ParameterFactory(
            FakeParameter,
            callStack,
            valueFactory,
            translator,
            futureFactory,
            flow,
            userland
        );
    });

    describe('createParameter()', function () {
        var context,
            defaultValueProvider,
            typeObject;

        beforeEach(function () {
            context = sinon.createStubInstance(FunctionContextInterface);
            defaultValueProvider = sinon.stub();
            typeObject = sinon.createStubInstance(TypeInterface);
        });

        it('should return a correctly constructed positional Parameter', function () {
            var parameter = sinon.createStubInstance(Parameter);
            FakeParameter
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(valueFactory),
                    sinon.match.same(translator),
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(userland),
                    sinon.match.same(factory),
                    'myParameter',
                    4,
                    sinon.match.same(typeObject),
                    context,
                    sinon.match.same(namespaceScope),
                    true,
                    false,
                    sinon.match.same(defaultValueProvider),
                    '/path/to/my/module.php',
                    21
                )
                .returns(parameter);

            expect(factory.createParameter(
                'myParameter',
                4,
                typeObject,
                context,
                namespaceScope,
                true,
                false,
                defaultValueProvider,
                '/path/to/my/module.php',
                21
            )).to.equal(parameter);
        });

        it('should return a correctly constructed variadic Parameter', function () {
            var parameter = sinon.createStubInstance(Parameter);
            FakeParameter
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(valueFactory),
                    sinon.match.same(translator),
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(userland),
                    sinon.match.same(factory),
                    'myParameter',
                    4,
                    sinon.match.same(typeObject),
                    context,
                    sinon.match.same(namespaceScope),
                    false,
                    true,
                    null,
                    '/path/to/my/module.php',
                    101
                )
                .returns(parameter);

            expect(factory.createParameter(
                'myParameter',
                4,
                typeObject,
                context,
                namespaceScope,
                false,
                true,
                null,
                '/path/to/my/module.php',
                101
            )).to.equal(parameter);
        });
    });
});
