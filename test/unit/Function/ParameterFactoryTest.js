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
    FunctionContextInterface = require('../../../src/Function/FunctionContextInterface'),
    Parameter = require('../../../src/Function/Parameter'),
    ParameterFactory = require('../../../src/Function/ParameterFactory'),
    Translator = phpCommon.Translator,
    TypeInterface = require('../../../src/Type/TypeInterface');

describe('ParameterFactory', function () {
    var callStack,
        factory,
        FakeParameter,
        translator;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        FakeParameter = sinon.stub();
        translator = sinon.createStubInstance(Translator);

        factory = new ParameterFactory(FakeParameter, callStack, translator);
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
                    'myParameter',
                    4,
                    sinon.match.same(typeObject),
                    context,
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
                true,
                defaultValueProvider,
                '/path/to/my/module.php',
                21
            )).to.equal(parameter);
        });
    });
});
