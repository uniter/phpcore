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
    ArrayValue = require('../../src/Value/Array').sync(),
    ElementReference = require('../../src/Reference/Element'),
    IntegerValue = require('../../src/Value/Integer').sync(),
    List = require('../../src/List'),
    NullValue = require('../../src/Value/Null').sync(),
    Reference = require('../../src/Reference/Reference'),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('List', function () {
    beforeEach(function () {
        this.valueFactory = sinon.createStubInstance(ValueFactory);
        this.elements = [];

        this.list = new List(this.valueFactory, this.elements);
    });

    describe('setValue()', function () {
        it('should return the value assigned', function () {
            var value = sinon.createStubInstance(Value);

            expect(this.list.setValue(value)).to.equal(value);
        });

        it('should assign elements to references when an array is assigned', function () {
            var assignedValue = sinon.createStubInstance(ArrayValue),
                ref1 = sinon.createStubInstance(Reference),
                ref2 = sinon.createStubInstance(Reference),
                element1 = sinon.createStubInstance(ElementReference),
                element2 = sinon.createStubInstance(ElementReference),
                elementValue1 = sinon.createStubInstance(Value),
                elementValue2 = sinon.createStubInstance(Value);
            assignedValue.getType.returns('array');
            assignedValue.getElementByIndex.withArgs(0).returns(element1);
            assignedValue.getElementByIndex.withArgs(1).returns(element2);
            element1.getValue.returns(elementValue1);
            element2.getValue.returns(elementValue2);
            this.elements.push(ref1);
            this.elements.push(ref2);

            this.list.setValue(assignedValue);

            expect(ref1.setValue).to.have.been.calledOnce;
            expect(ref1.setValue).to.have.been.calledWith(elementValue1);
            expect(ref2.setValue).to.have.been.calledOnce;
            expect(ref2.setValue).to.have.been.calledWith(elementValue2);
        });

        it('should assign null to all references when an integer is assigned', function () {
            var assignedValue = sinon.createStubInstance(IntegerValue),
                ref1 = sinon.createStubInstance(Reference),
                ref2 = sinon.createStubInstance(Reference),
                nullValue = sinon.createStubInstance(NullValue);
            assignedValue.getType.returns('int');
            this.valueFactory.createNull.returns(nullValue);
            this.elements.push(ref1);
            this.elements.push(ref2);

            this.list.setValue(assignedValue);

            expect(ref1.setValue).to.have.been.calledOnce;
            expect(ref1.setValue).to.have.been.calledWith(nullValue);
            expect(ref2.setValue).to.have.been.calledOnce;
            expect(ref2.setValue).to.have.been.calledWith(nullValue);
        });
    });
});
