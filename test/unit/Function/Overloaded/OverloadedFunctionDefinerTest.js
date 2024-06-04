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
    Exception = phpCommon.Exception,
    FunctionFactory = require('../../../../src/FunctionFactory').sync(),
    FunctionSpec = require('../../../../src/Function/FunctionSpec'),
    FunctionSpecFactory = require('../../../../src/Function/FunctionSpecFactory'),
    NamespaceScope = require('../../../../src/NamespaceScope').sync(),
    OverloadedFunctionDefiner = require('../../../../src/Function/Overloaded/OverloadedFunctionDefiner'),
    OverloadedFunctionSpec = require('../../../../src/Function/Overloaded/OverloadedFunctionSpec'),
    OverloadedFunctionVariant = require('../../../../src/Function/Overloaded/OverloadedFunctionVariant'),
    Signature = require('../../../../src/Function/Signature/Signature');

describe('OverloadedFunctionDefiner', function () {
    var functionFactory,
        functionSpecFactory,
        definer,
        namespaceScope;

    beforeEach(function () {
        functionFactory = sinon.createStubInstance(FunctionFactory);
        functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);
        namespaceScope = sinon.createStubInstance(NamespaceScope);

        definer = new OverloadedFunctionDefiner(
            functionSpecFactory,
            functionFactory
        );
    });

    describe('defineFunction()', function () {
        var functionSpec1,
            functionSpec2,
            overloadedFunctionSpec,
            signature1,
            signature2,
            variant1,
            variant2,
            variantFunc1,
            variantFunc2,
            wrappedFunction;

        beforeEach(function () {
            functionSpec1 = sinon.createStubInstance(FunctionSpec);
            functionSpec2 = sinon.createStubInstance(FunctionSpec);
            overloadedFunctionSpec = sinon.createStubInstance(OverloadedFunctionSpec);
            signature1 = sinon.createStubInstance(Signature);
            signature2 = sinon.createStubInstance(Signature);
            variant1 = sinon.createStubInstance(OverloadedFunctionVariant);
            variant2 = sinon.createStubInstance(OverloadedFunctionVariant);
            variantFunc1 = sinon.stub();
            variantFunc2 = sinon.stub();
            wrappedFunction = sinon.stub();

            signature1.getParameterCount.returns(2);
            signature1.getParametersSpecData.returns([{name: 'param_a'}, {name: 'param_b'}]);
            signature1.getReturnTypeSpecData.returns({type: 'bool'});
            signature1.isReturnByReference.returns(false);
            signature2.getParameterCount.returns(3);
            signature2.getParametersSpecData.returns([{name: 'param_c'}, {name: 'param_d'}, {name: 'param_e'}]);
            signature2.getReturnTypeSpecData.returns({type: 'int'});
            signature2.isReturnByReference.returns(true);
            variant1.getFunction.returns(variantFunc1);
            variant1.getSignature.returns(signature1);
            variant2.getFunction.returns(variantFunc2);
            variant2.getSignature.returns(signature2);
            functionSpecFactory.createFunctionSpec
                .withArgs(
                    sinon.match.same(namespaceScope),
                    'myFunction',
                    [{name: 'param_a'}, {name: 'param_b'}],
                    sinon.match.same(variantFunc1),
                    {type: 'bool'},
                    false,
                    null,
                    null
                )
                .returns(functionSpec1);
            functionSpecFactory.createFunctionSpec
                .withArgs(
                    sinon.match.same(namespaceScope),
                    'myFunction',
                    [{name: 'param_c'}, {name: 'param_d'}, {name: 'param_e'}],
                    sinon.match.same(variantFunc2),
                    {type: 'int'},
                    true,
                    null,
                    null
                )
                .returns(functionSpec2);
            functionSpecFactory.createOverloadedFunctionSpec
                .withArgs(
                    'myFunction',
                    sinon.match({
                        2: sinon.match.same(functionSpec1),
                        3: sinon.match.same(functionSpec2)
                    }),
                    2,
                    3
                )
                .returns(overloadedFunctionSpec);

            functionFactory.create
                .withArgs(
                    sinon.match.same(namespaceScope),
                    null,
                    null,
                    null,
                    sinon.match.same(overloadedFunctionSpec)
                )
                .returns(wrappedFunction);
        });

        it('should return the wrapped overloaded function', function () {
            var result = definer.defineFunction(
                'myFunction',
                [variant1, variant2],
                namespaceScope
            );

            expect(result).to.equal(wrappedFunction);
        });

        it('should throw when no variants are defined', function () {
            expect(function () {
                definer.defineFunction(
                    'myFunction',
                    [],
                    namespaceScope
                );
            }).to.throw(
                Exception,
                'Overloaded function "myFunction" must define at least 2 variants, 0 defined'
            );
        });

        it('should throw when only one variant is defined', function () {
            expect(function () {
                definer.defineFunction(
                    'myFunction',
                    [variant1],
                    namespaceScope
                );
            }).to.throw(
                Exception,
                'Overloaded function "myFunction" must define at least 2 variants, 1 defined'
            );
        });
    });
});
