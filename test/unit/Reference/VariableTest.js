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
    Value = require('../../../src/Value').sync(),
    Variable = require('../../../src/Variable').sync(),
    VariableReference = require('../../../src/Reference/Variable');

describe('VariableReference', function () {
    beforeEach(function () {
        this.variable = sinon.createStubInstance(Variable);

        this.property = new VariableReference(this.variable);
    });

    describe('getForAssignment()', function () {
        it('should return the value of the variabe', function () {
            var result = sinon.createStubInstance(Value);
            this.variable.getValue.returns(result);

            expect(this.property.getForAssignment()).to.equal(result);
        });
    });

    describe('getValue()', function () {
        it('should return the value of the variabe', function () {
            var result = sinon.createStubInstance(Value);
            this.variable.getValue.returns(result);

            expect(this.property.getValue()).to.equal(result);
        });
    });

    describe('setValue()', function () {
        it('should set the value of the variable to the new value', function () {
            var newValue = sinon.createStubInstance(Value);

            this.property.setValue(newValue);

            expect(this.variable.setValue).to.have.been.calledOnce;
            expect(this.variable.setValue).to.have.been.calledWith(sinon.match.same(newValue));
        });

        it('should return the new value', function () {
            var newValue = sinon.createStubInstance(Value);

            expect(this.property.setValue(newValue)).to.equal(newValue);
        });
    });
});
