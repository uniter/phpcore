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
    OverloadedTypedFunction = require('../../../../src/Function/Overloaded/OverloadedTypedFunction'),
    TypedFunction = require('../../../../src/Function/TypedFunction');

describe('OverloadedTypedFunction', function () {
    var overloadedTypedFunction,
        typedFunction1,
        typedFunction2;

    beforeEach(function () {
        typedFunction1 = sinon.createStubInstance(TypedFunction);
        typedFunction2 = sinon.createStubInstance(TypedFunction);

        overloadedTypedFunction = new OverloadedTypedFunction([typedFunction1, typedFunction2]);
    });

    describe('getTypedFunctions()', function () {
        it('should return the variant TypedFunctions', function () {
            var typedFunctions = overloadedTypedFunction.getTypedFunctions();

            expect(typedFunctions).to.have.length(2);
            expect(typedFunctions[0]).to.equal(typedFunction1);
            expect(typedFunctions[1]).to.equal(typedFunction2);
        });
    });
});
