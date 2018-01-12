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
    NullValue = require('../../src/Value/Null').sync(),
    StringValue = require('../../src/Value/String').sync(),
    ValueFactory = require('../../src/ValueFactory').sync(),
    Variable = require('../../src/Variable').sync(),
    VariableReference = require('../../src/Reference/Variable');

describe('Variable', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.valueFactory = sinon.createStubInstance(ValueFactory);
        this.valueFactory.createNull.restore();
        sinon.stub(this.valueFactory, 'createNull', function () {
            var nullValue = sinon.createStubInstance(NullValue);
            nullValue.getNative.returns(null);
            return nullValue;
        });
        this.valueFactory.createString.restore();
        sinon.stub(this.valueFactory, 'createString', function (nativeValue) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.concat.restore();
            sinon.stub(stringValue, 'concat', function (rightValue) {
                return this.valueFactory.createString(nativeValue + rightValue.getNative());
            }.bind(this));
            stringValue.getForAssignment.returns(stringValue);
            stringValue.getNative.returns(nativeValue);
            return stringValue;
        }.bind(this));

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
            var value = this.valueFactory.createString('');
            value.isEmpty.returns(true);
            this.variable.setValue(value);

            expect(this.variable.isEmpty()).to.be.true;
        });

        it('should return false when the variable is set to a non-empty value', function () {
            var value = this.valueFactory.createString('hello');
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
