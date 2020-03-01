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
    ArrayIterator = require('../../../src/Iterator/ArrayIterator'),
    ArrayValue = require('../../../src/Value/Array').sync(),
    ElementReference = require('../../../src/Reference/Element'),
    Reference = require('../../../src/Reference/Reference'),
    Value = require('../../../src/Value').sync();

describe('ArrayIterator', function () {
    beforeEach(function () {
        this.arrayOrObjectValue = sinon.createStubInstance(ArrayValue);

        this.arrayIterator = new ArrayIterator(this.arrayOrObjectValue);
    });

    describe('advance()', function () {
        it('should progress the iterator on to point at the next element', function () {
            var thirdElement = sinon.createStubInstance(ElementReference),
                thirdElementValue = sinon.createStubInstance(Value);
            thirdElement.getValue.returns(thirdElementValue);
            this.arrayOrObjectValue.getElementByIndex.withArgs(2).returns(thirdElement);

            this.arrayIterator.advance();
            this.arrayIterator.advance();

            expect(this.arrayIterator.getCurrentElementValue()).to.equal(thirdElementValue);
        });
    });

    describe('getCurrentElementReference()', function () {
        it('should fetch a reference to the current element', function () {
            var firstElement = sinon.createStubInstance(ElementReference),
                firstElementReference = sinon.createStubInstance(Reference);
            firstElement.getReference.returns(firstElementReference);
            this.arrayOrObjectValue.getElementByIndex.withArgs(0).returns(firstElement);

            expect(this.arrayIterator.getCurrentElementReference()).to.equal(firstElementReference);
        });
    });

    describe('getCurrentElementValue()', function () {
        it('should fetch the value of the current element', function () {
            var firstElement = sinon.createStubInstance(ElementReference),
                firstElementValue = sinon.createStubInstance(Value);
            firstElement.getValue.returns(firstElementValue);
            this.arrayOrObjectValue.getElementByIndex.withArgs(0).returns(firstElement);

            expect(this.arrayIterator.getCurrentElementValue()).to.equal(firstElementValue);
        });
    });

    describe('getCurrentKey()', function () {
        it('should fetch the value of the current element', function () {
            var firstElementKey = sinon.createStubInstance(Value);
            this.arrayOrObjectValue.getKeyByIndex.withArgs(0).returns(firstElementKey);

            expect(this.arrayIterator.getCurrentKey()).to.equal(firstElementKey);
        });
    });

    describe('getIteratedValue()', function () {
        it('should fetch the value that this iterator iterates over', function () {
            expect(this.arrayIterator.getIteratedValue()).to.equal(this.arrayOrObjectValue);
        });
    });

    describe('isNotFinished()', function () {
        it('should return true when the iterator has not yet reached the end', function () {
            this.arrayOrObjectValue.getLength.returns(3);
            this.arrayIterator.advance();

            expect(this.arrayIterator.isNotFinished()).to.be.true;
        });

        it('should return false when the iterator has reached the end', function () {
            this.arrayOrObjectValue.getLength.returns(3);
            this.arrayIterator.advance();
            this.arrayIterator.advance();
            this.arrayIterator.advance();

            expect(this.arrayIterator.isNotFinished()).to.be.false;
        });
    });
});
