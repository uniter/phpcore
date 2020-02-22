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
    ValueFactory = require('../../../src/ValueFactory').sync(),
    Variable = require('../../../src/Variable').sync(),
    VariableReference = require('../../../src/Reference/Variable');

describe('VariableReference', function () {
    beforeEach(function () {
        this.factory = new ValueFactory();
        this.variable = sinon.createStubInstance(Variable);
        this.variable.getValue.returns(this.factory.createString('my variable\'s value'));

        this.variable.setValue.callsFake(function (value) {
            this.variable.getValue.returns(value);
        }.bind(this));

        this.reference = new VariableReference(this.variable);
    });

    describe('concatWith()', function () {
        it('should append the given value to the variable\'s value and assign it back to the variable', function () {
            this.reference.setValue(this.factory.createString('value for my variable'));

            this.reference.concatWith(this.factory.createString(' with world on the end'));

            expect(this.reference.getNative()).to.equal('value for my variable with world on the end');
        });
    });

    describe('decrementBy()', function () {
        it('should subtract the given value from the variable\'s value and assign it back to the variable', function () {
            this.reference.setValue(this.factory.createInteger(20));

            this.reference.decrementBy(this.factory.createInteger(4));

            expect(this.reference.getNative()).to.equal(16);
        });
    });

    describe('divideBy()', function () {
        it('should divide the variable\'s value by the given value and assign it back to the variable', function () {
            this.reference.setValue(this.factory.createInteger(20));

            this.reference.divideBy(this.factory.createInteger(4));

            expect(this.reference.getNative()).to.equal(5);
        });
    });

    describe('getForAssignment()', function () {
        it('should return the value of the variabe', function () {
            var result = sinon.createStubInstance(Value);
            this.variable.getValue.returns(result);

            expect(this.reference.getForAssignment()).to.equal(result);
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the referenced variable', function () {
            var variableValue = sinon.createStubInstance(Value);
            variableValue.getNative.returns('the native value of my var');
            this.variable.getValue.returns(variableValue);

            expect(this.reference.getNative()).to.equal('the native value of my var');
        });
    });

    describe('getValue()', function () {
        it('should return the value of the variabe', function () {
            var result = sinon.createStubInstance(Value);
            this.variable.getValue.returns(result);

            expect(this.reference.getValue()).to.equal(result);
        });
    });

    describe('incrementBy()', function () {
        it('should add the given value to the variable\'s value and assign it back to the variable', function () {
            this.reference.setValue(this.factory.createInteger(20));

            this.reference.incrementBy(this.factory.createInteger(4));

            expect(this.reference.getNative()).to.equal(24);
        });
    });

    describe('multiplyBy()', function () {
        it('should multiply the variable\'s value by the given value and assign it back to the variable', function () {
            this.reference.setValue(this.factory.createInteger(20));

            this.reference.multiplyBy(this.factory.createInteger(4));

            expect(this.reference.getNative()).to.equal(80);
        });
    });

    describe('postDecrement()', function () {
        beforeEach(function () {
            this.originalValue = sinon.createStubInstance(Value);
            this.decrementedValue = sinon.createStubInstance(Value);
            this.variable.getValue.returns(this.originalValue);
            this.originalValue.decrement.returns(this.decrementedValue);
        });

        it('should assign the decremented value to the referenced variable', function () {
            this.reference.postDecrement();

            expect(this.variable.setValue).to.have.been.calledOnce;
            expect(this.variable.setValue).to.have.been.calledWith(sinon.match.same(this.decrementedValue));
        });

        it('should return the original value', function () {
            expect(this.reference.postDecrement()).to.equal(this.originalValue);
        });
    });

    describe('postIncrement()', function () {
        beforeEach(function () {
            this.originalValue = sinon.createStubInstance(Value);
            this.incrementedValue = sinon.createStubInstance(Value);
            this.variable.getValue.returns(this.originalValue);
            this.originalValue.increment.returns(this.incrementedValue);
        });

        it('should assign the incremented value to the referenced variable', function () {
            this.reference.postIncrement();

            expect(this.variable.setValue).to.have.been.calledOnce;
            expect(this.variable.setValue).to.have.been.calledWith(sinon.match.same(this.incrementedValue));
        });

        it('should return the original value', function () {
            expect(this.reference.postIncrement()).to.equal(this.originalValue);
        });
    });

    describe('preDecrement()', function () {
        beforeEach(function () {
            this.originalValue = sinon.createStubInstance(Value);
            this.decrementedValue = sinon.createStubInstance(Value);
            this.variable.getValue.returns(this.originalValue);
            this.originalValue.decrement.returns(this.decrementedValue);
        });

        it('should assign the decremented value to the referenced variable', function () {
            this.reference.preDecrement();

            expect(this.variable.setValue).to.have.been.calledOnce;
            expect(this.variable.setValue).to.have.been.calledWith(sinon.match.same(this.decrementedValue));
        });

        it('should return the decremented value', function () {
            expect(this.reference.preDecrement()).to.equal(this.decrementedValue);
        });
    });

    describe('preIncrement()', function () {
        beforeEach(function () {
            this.originalValue = sinon.createStubInstance(Value);
            this.incrementedValue = sinon.createStubInstance(Value);
            this.variable.getValue.returns(this.originalValue);
            this.originalValue.increment.returns(this.incrementedValue);
        });

        it('should assign the incremented value to the referenced variable', function () {
            this.reference.preIncrement();

            expect(this.variable.setValue).to.have.been.calledOnce;
            expect(this.variable.setValue).to.have.been.calledWith(sinon.match.same(this.incrementedValue));
        });

        it('should return the incremented value', function () {
            expect(this.reference.preIncrement()).to.equal(this.incrementedValue);
        });
    });

    describe('setValue()', function () {
        it('should set the value of the variable to the new value', function () {
            var newValue = sinon.createStubInstance(Value);

            this.reference.setValue(newValue);

            expect(this.variable.setValue).to.have.been.calledOnce;
            expect(this.variable.setValue).to.have.been.calledWith(sinon.match.same(newValue));
        });

        it('should return the new value', function () {
            var newValue = sinon.createStubInstance(Value);

            expect(this.reference.setValue(newValue)).to.equal(newValue);
        });
    });
});
