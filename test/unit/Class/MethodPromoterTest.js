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
    FunctionFactory = require('../../../src/FunctionFactory').sync(),
    FunctionSpec = require('../../../src/Function/FunctionSpec'),
    FunctionSpecFactory = require('../../../src/Function/FunctionSpecFactory'),
    MethodPromoter = require('../../../src/Class/MethodPromoter'),
    NamespaceScope = require('../../../src/NamespaceScope').sync();

describe('MethodPromoter', function () {
    var callStack,
        functionFactory,
        functionSpecFactory,
        promoter;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        functionFactory = sinon.createStubInstance(FunctionFactory);
        functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);

        callStack.getLastFilePath.returns('/path/to/my_module.php');

        promoter = new MethodPromoter(
            callStack,
            functionFactory,
            functionSpecFactory
        );
    });

    describe('promote()', function () {
        var classObject,
            functionSpec,
            namespaceScope,
            parameter1SpecData,
            parameter2SpecData,
            returnTypeSpecData,
            sharedMethodData,
            unwrappedMethod,
            wrappedMethod;

        beforeEach(function () {
            classObject = sinon.createStubInstance(Class);
            functionSpec = sinon.createStubInstance(FunctionSpec);
            namespaceScope = sinon.createStubInstance(NamespaceScope);
            parameter1SpecData = {type: 'array'};
            parameter2SpecData = {type: 'callable'};
            returnTypeSpecData = {type: 'void'};
            sharedMethodData = {};
            unwrappedMethod = sinon.stub();
            wrappedMethod = sinon.stub();

            functionSpecFactory.createMethodSpec
                .withArgs(
                    sinon.match.same(namespaceScope),
                    sinon.match.same(classObject),
                    'myMethod',
                    [sinon.match.same(parameter1SpecData), sinon.match.same(parameter2SpecData)],
                    sinon.match.same(unwrappedMethod),
                    returnTypeSpecData,
                    false,
                    '/path/to/my_module.php',
                    123
                )
                .returns(functionSpec);

            functionFactory.create
                .withArgs(
                    sinon.match.same(namespaceScope),
                    sinon.match.same(classObject),
                    null,
                    null,
                    sinon.match.same(functionSpec)
                )
                .returns(wrappedMethod);
        });

        it('should return the wrapped method from FunctionFactory when static', function () {
            var result = promoter.promote(
                'myMethod',
                {
                    args: [parameter1SpecData, parameter2SpecData],
                    isStatic: true,
                    line: 123,
                    method: unwrappedMethod,
                    ref: false,
                    ret: returnTypeSpecData
                },
                classObject,
                namespaceScope,
                sharedMethodData
            );

            expect(result).to.equal(wrappedMethod);
            expect(result.data).to.equal(sharedMethodData);
            expect(result.isStatic).to.be.true;
        });

        it('should return the wrapped method from FunctionFactory when instance', function () {
            var result = promoter.promote(
                'myMethod',
                {
                    args: [parameter1SpecData, parameter2SpecData],
                    isStatic: false,
                    line: 123,
                    method: unwrappedMethod,
                    ref: false,
                    ret: returnTypeSpecData
                },
                classObject,
                namespaceScope,
                sharedMethodData
            );

            expect(result).to.equal(wrappedMethod);
            expect(result.data).to.equal(sharedMethodData);
            expect(result.isStatic).to.be.false;
        });

        it('should return the wrapped method from FunctionFactory when minimal definition is given', function () {
            var result;
            functionSpecFactory.createMethodSpec.resetBehavior();
            functionSpecFactory.createMethodSpec
                .withArgs(
                    sinon.match.same(namespaceScope),
                    sinon.match.same(classObject),
                    'myMethod',
                    [],
                    sinon.match.same(unwrappedMethod),
                    null,
                    false,
                    '/path/to/my_module.php',
                    null
                )
                .returns(functionSpec);

            result = promoter.promote(
                'myMethod',
                {
                    method: unwrappedMethod
                },
                classObject,
                namespaceScope,
                sharedMethodData
            );

            expect(result).to.equal(wrappedMethod);
            expect(result.data).to.equal(sharedMethodData);
            expect(result.isStatic).to.be.undefined;
        });
    });
});
