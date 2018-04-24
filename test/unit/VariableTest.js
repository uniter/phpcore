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
    CallStack = require('../../src/CallStack'),
    StringValue = require('../../src/Value/String').sync(),
    ValueFactory = require('../../src/ValueFactory').sync(),
    Variable = require('../../src/Variable').sync(),
    VariableReference = require('../../src/Reference/Variable');

describe('Variable', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.valueFactory = new ValueFactory();

        this.variable = new Variable(this.callStack, this.valueFactory, 'myVar');
    });

    describe('concatWith()', function () {
        it('should concatenate a string onto the end of an existing string', function () {
            this.variable.setValue(this.valueFactory.createString('hello'));
            
            this.variable.concatWith(this.valueFactory.createString('world'));
            
            expect(this.variable.getValue()).to.be.an.instanceOf(StringValue);
            expect(this.variable.getValue().getNative()).to.equal('helloworld');
        });
    });

    describe('getName()', function () {
        it('should return the name of the variable', function () {
            expect(this.variable.getName()).to.equal('myVar');
        });
    });

    describe('isEmpty()', function () {
        it('should return true when the variable is unset', function () {
            this.variable.unset();

            expect(this.variable.isEmpty()).to.be.true;
        });

        it('should return true when the variable is set to an empty value', function () {
            var value = sinon.createStubInstance(StringValue);
            value.getForAssignment.returns(value);
            value.isEmpty.returns(true);
            this.variable.setValue(value);

            expect(this.variable.isEmpty()).to.be.true;
        });

        it('should return false when the variable is set to a non-empty value', function () {
            var value = sinon.createStubInstance(StringValue);
            value.getForAssignment.returns(value);
            value.isEmpty.returns(false);
            this.variable.setValue(value);

            expect(this.variable.isEmpty()).to.be.false;
        });
    });

    describe('setReference()', function () {
        it('should return the variable', function () {
            var reference = sinon.createStubInstance(VariableReference);

            expect(this.variable.setReference(reference)).to.equal(this.variable);
        });
    });
});
