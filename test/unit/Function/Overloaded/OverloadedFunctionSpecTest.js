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
    FunctionSpec = require('../../../../src/Function/FunctionSpec'),
    FunctionSpecFactory = require('../../../../src/Function/FunctionSpecFactory'),
    InvalidOverloadedFunctionSpec = require('../../../../src/Function/Overloaded/InvalidOverloadedFunctionSpec'),
    OverloadedFunctionSpec = require('../../../../src/Function/Overloaded/OverloadedFunctionSpec');

describe('OverloadedFunctionSpec', function () {
    var functionSpec,
        functionSpecFactory,
        variantFunctionSpec1,
        variantFunctionSpec2;

    beforeEach(function () {
        functionSpecFactory = sinon.createStubInstance(FunctionSpecFactory);
        variantFunctionSpec1 = sinon.createStubInstance(FunctionSpec);
        variantFunctionSpec2 = sinon.createStubInstance(FunctionSpec);

        functionSpec = new OverloadedFunctionSpec(
            functionSpecFactory,
            'myFunction',
            {
                3: variantFunctionSpec1,
                5: variantFunctionSpec2
            },
            3,
            5
        );
    });

    describe('getFunctionName()', function () {
        it('should return the function\'s name', function () {
            expect(functionSpec.getFunctionName()).to.equal('myFunction');
        });
    });

    describe('getFunctionTraceFrameName()', function () {
        it('should return the function\'s name', function () {
            expect(functionSpec.getFunctionTraceFrameName()).to.equal('myFunction');
        });
    });

    describe('getMaximumParameterCount()', function () {
        it('should return the parameter count of the variant with the highest count', function () {
            expect(functionSpec.getMaximumParameterCount()).to.equal(5);
        });
    });

    describe('getMinimumParameterCount()', function () {
        it('should return the parameter count of the variant with the lowest count', function () {
            expect(functionSpec.getMinimumParameterCount()).to.equal(3);
        });
    });

    describe('getName()', function () {
        it('should return the function\'s name', function () {
            expect(functionSpec.getName()).to.equal('myFunction');
        });
    });

    describe('getUnprefixedFunctionName()', function () {
        it('should return the function\'s name', function () {
            expect(functionSpec.getUnprefixedFunctionName()).to.equal('myFunction');
        });
    });

    describe('resolveFunctionSpec()', function () {
        it('should return the overload variant\'s FunctionSpec when one is defined for the given count', function () {
            expect(functionSpec.resolveFunctionSpec(3)).to.equal(variantFunctionSpec1);
        });

        it('should return an InvalidOverloadedFunctionSpec when no variant is defined for the given count', function () {
            var invalidOverloadedFunctionSpec = sinon.createStubInstance(InvalidOverloadedFunctionSpec);
            functionSpecFactory.createInvalidOverloadedFunctionSpec
                .withArgs(
                    sinon.match.same(functionSpec),
                    4
                )
                .returns(invalidOverloadedFunctionSpec);

            expect(functionSpec.resolveFunctionSpec(4)).to.equal(invalidOverloadedFunctionSpec);
        });
    });
});
