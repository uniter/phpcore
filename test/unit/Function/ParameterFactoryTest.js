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
    Flow = require('../../../src/Control/Flow'),
    FunctionContextInterface = require('../../../src/Function/FunctionContextInterface'),
    FutureFactory = require('../../../src/Control/FutureFactory'),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    Parameter = require('../../../src/Function/Parameter'),
    ParameterFactory = require('../../../src/Function/ParameterFactory'),
    Translator = phpCommon.Translator,
    TypeInterface = require('../../../src/Type/TypeInterface'),
    Userland = require('../../../src/Control/Userland');

describe('ParameterFactory', function () {
    var callStack,
        factory,
        FakeParameter,
        flow,
        futureFactory,
        namespaceScope,
        translator,
        userland;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        FakeParameter = sinon.stub();
        flow = sinon.createStubInstance(Flow);
        futureFactory = sinon.createStubInstance(FutureFactory);
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        translator = sinon.createStubInstance(Translator);
        userland = sinon.createStubInstance(Userland);

        factory = new ParameterFactory(
            FakeParameter,
            callStack,
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

        it('should return a correctly constructed Parameter', function () {
            var parameter = sinon.createStubInstance(Parameter);
            FakeParameter
                .withArgs(
                    sinon.match.same(callStack),
                    sinon.match.same(translator),
                    sinon.match.same(futureFactory),
                    sinon.match.same(flow),
                    sinon.match.same(userland),
                    'myParameter',
                    4,
                    sinon.match.same(typeObject),
                    context,
                    sinon.match.same(namespaceScope),
                    true,
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
                defaultValueProvider,
                '/path/to/my/module.php',
                21
            )).to.equal(parameter);
        });
    });
});
