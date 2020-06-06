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
    ArrayValue = require('../../../src/Value/Array').sync(),
    CallStack = require('../../../src/CallStack'),
    ElementReference = require('../../../src/Reference/Element'),
    KeyReferencePair = require('../../../src/KeyReferencePair'),
    KeyValuePair = require('../../../src/KeyValuePair'),
    Reference = require('../../../src/Reference/Reference'),
    ReferenceSlot = require('../../../src/Reference/ReferenceSlot'),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync(),
    Variable = require('../../../src/Variable').sync();

describe('ElementReference', function () {
    var arrayValue,
        callStack,
        element,
        keyValue,
        value,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        valueFactory = new ValueFactory();
        arrayValue = sinon.createStubInstance(ArrayValue);
        keyValue = valueFactory.createString('my_element');
        value = sinon.createStubInstance(Value);

        value.formatAsString.returns('\'the value of my...\'');
        value.getForAssignment.returns(value);
        value.getNative.returns('the value of my element');
        value.getType.returns('string');

        element = new ElementReference(
            valueFactory,
            callStack,
            arrayValue,
            keyValue,
            value
        );
    });

    describe('concatWith()', function () {
        it('should append the given value to the element\'s value and assign it back to the element', function () {
            element.setValue(valueFactory.createString('hello'));

            element.concatWith(valueFactory.createString(' world'));

            expect(element.getNative()).to.equal('hello world');
        });
    });

    describe('decrementBy()', function () {
        it('should subtract the given value from the element\'s value and assign it back to the element', function () {
            element.setValue(valueFactory.createInteger(20));

            element.decrementBy(valueFactory.createInteger(4));

            expect(element.getNative()).to.equal(16);
        });
    });

    describe('divideBy()', function () {
        it('should divide the element\'s value by the given value and assign it back to the element', function () {
            element.setValue(valueFactory.createInteger(10));

            element.divideBy(valueFactory.createInteger(2));

            expect(element.getNative()).to.equal(5);
        });
    });

    describe('formatAsString()', function () {
        it('should return "NULL" for an unset element', function () {
            element.unset();

            expect(element.formatAsString()).to.equal('NULL');
        });

        it('should return the correct string when the element has a value that is empty', function () {
            value.isEmpty.returns(true);

            expect(element.formatAsString()).to.equal('\'the value of my...\'');
        });

        it('should return the correct string when the element has a value that is not empty', function () {
            value.isEmpty.returns(false);

            expect(element.formatAsString()).to.equal('\'the value of my...\'');
        });

        it('should return the correct string when the element has a reference to a value that is empty', function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(value);
            value.isEmpty.returns(true);
            element.setReference(reference);

            expect(element.formatAsString()).to.equal('\'the value of my...\'');
        });

        it('should return the correct string when the element has a reference to a value that is not empty', function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(value);
            value.isEmpty.returns(false);
            element.setReference(reference);

            expect(element.formatAsString()).to.equal('\'the value of my...\'');
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the element\'s value', function () {
            element.setValue(valueFactory.createString('my native value'));

            expect(element.getNative()).to.equal('my native value');
        });
    });

    describe('getPairForAssignment()', function () {
        it('should return a KeyValuePair when the element has a value, with value fetched for assignment', function () {
            var pair,
                valueForAssignment = sinon.createStubInstance(Value);
            value.getForAssignment.returns(valueForAssignment);

            pair = element.getPairForAssignment();

            expect(pair).to.be.an.instanceOf(KeyValuePair);
            expect(pair.getKey()).to.equal(keyValue);
            expect(pair.getValue()).to.equal(valueForAssignment);
        });

        it('should return a KeyReferencePair when the element is a reference', function () {
            var pair,
                reference = sinon.createStubInstance(Reference);
            element.setReference(reference);

            pair = element.getPairForAssignment();

            expect(pair).to.be.an.instanceOf(KeyReferencePair);
            expect(pair.getKey()).to.equal(keyValue);
            expect(pair.getReference()).to.equal(reference);
        });

        it('should allow the key to be overridden when specified', function () {
            var overrideKey = valueFactory.createInteger(21),
                pair = element.getPairForAssignment(overrideKey);

            expect(pair).to.be.an.instanceOf(KeyValuePair);
            expect(pair.getKey()).to.equal(overrideKey);
            expect(pair.getValue()).to.equal(value);
        });

        it('should throw an error when the element is not defined', function () {
            expect(function () {
                var element = new ElementReference(
                    valueFactory,
                    callStack,
                    arrayValue,
                    keyValue
                );

                element.getPairForAssignment();
            }).to.throw('Element is not defined');
        });
    });

    describe('getReference()', function () {
        it('should return the existing reference if the element already has one assigned (may not be a ReferenceSlot)', function () {
            var reference = sinon.createStubInstance(Reference);
            element.setReference(reference);

            expect(element.getReference()).to.equal(reference);
        });

        it('should return the existing reference on subsequent calls (ensure no ReferenceSlot is created)', function () {
            var reference = sinon.createStubInstance(Reference);
            element.setReference(reference);

            element.getReference(); // First call
            expect(element.getReference()).to.equal(reference);
        });

        it('should assign a ReferenceSlot to the element if it was undefined', function () {
            var referenceSlot = element.getReference();

            expect(referenceSlot).to.be.an.instanceOf(ReferenceSlot);
        });

        it('should return the same ReferenceSlot on subsequent calls', function () {
            var referenceSlot = element.getReference();

            expect(element.getReference()).to.equal(referenceSlot); // Call again
        });

        it('should assign any existing value of the element to the new ReferenceSlot', function () {
            var existingValue = valueFactory.createString('my existing value'),
                referenceSlot;
            element.setValue(existingValue);

            referenceSlot = element.getReference();

            expect(referenceSlot.getValue()).to.equal(existingValue);
        });

        it('should subsequently inherit its value from future values of the ReferenceSlot', function () {
            var referenceSlot = element.getReference(),
                value = valueFactory.createString('my new value');
            referenceSlot.setValue(value);

            expect(element.getValue()).to.equal(value);
        });
    });

    describe('getValueOrNull()', function () {
        it('should return the value when the element is defined with a value', function () {
            var value = valueFactory.createString('my value');
            element.setValue(value);

            expect(element.getValueOrNull()).to.equal(value);
        });

        it('should return the value of the reference when the element is defined with a reference', function () {
            var reference = sinon.createStubInstance(Reference),
                value = valueFactory.createString('my val from reference');
            reference.getValue.returns(value);
            element.setReference(reference);

            expect(element.getValueOrNull()).to.equal(value);
        });

        it('should return a NullValue when the element is not defined', function () {
            element.unset();

            expect(element.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('getValueReference()', function () {
        it('should return the value when the element has a value', function () {
            expect(element.getValueReference()).to.equal(value);
        });

        it('should return a KeyReferencePair when the element is a reference', function () {
            var reference = sinon.createStubInstance(Reference);
            element.setReference(reference);

            expect(element.getValueReference()).to.equal(reference);
        });

        it('should return null when the element is not defined', function () {
            var element = new ElementReference(
                valueFactory,
                callStack,
                arrayValue,
                keyValue
            );

            expect(element.getValueReference()).to.be.null;
        });
    });

    describe('incrementBy()', function () {
        it('should add the given value to the element\'s value and assign it back to the element', function () {
            element.setValue(valueFactory.createInteger(20));

            element.incrementBy(valueFactory.createInteger(4));

            expect(element.getNative()).to.equal(24);
        });
    });

    describe('isDefined()', function () {
        it('should return false for an unset element', function () {
            element.unset();

            expect(element.isDefined()).to.be.false;
        });

        it('should return true when the element has a value that is empty', function () {
            value.isEmpty.returns(true);

            expect(element.isDefined()).to.be.true;
        });

        it('should return true when the element has a value that is not empty', function () {
            value.isEmpty.returns(false);

            expect(element.isDefined()).to.be.true;
        });

        it('should return true when the element has a reference to a value that is empty', function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(value);
            value.isEmpty.returns(true);
            element.setReference(reference);

            expect(element.isDefined()).to.be.true;
        });

        it('should return true when the element has a reference to a value that is not empty', function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(value);
            value.isEmpty.returns(false);
            element.setReference(reference);

            expect(element.isDefined()).to.be.true;
        });
    });

    describe('isEmpty()', function () {
        it('should return true for an unset element', function () {
            element.unset();

            expect(element.isEmpty()).to.be.true;
        });

        it('should return true when the element has a value that is empty', function () {
            value.isEmpty.returns(true);

            expect(element.isEmpty()).to.be.true;
        });

        it('should return false when the element has a value that is not empty', function () {
            value.isEmpty.returns(false);

            expect(element.isEmpty()).to.be.false;
        });

        it('should return true when the element has a reference to a value that is empty', function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(value);
            value.isEmpty.returns(true);
            element.setReference(reference);

            expect(element.isEmpty()).to.be.true;
        });

        it('should return false when the element has a reference to a value that is not empty', function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(value);
            value.isEmpty.returns(false);
            element.setReference(reference);

            expect(element.isEmpty()).to.be.false;
        });
    });

    describe('isSet()', function () {
        it('should return true if the element\'s value is set', function () {
            value.isSet.returns(true);

            expect(element.isSet()).to.be.true;
        });

        it('should return false if the element\'s value is not set', function () {
            value.isSet.returns(false);

            expect(element.isSet()).to.be.false;
        });
    });

    describe('multiplyBy()', function () {
        it('should multiply the element\'s value by the given value and assign it back to the element', function () {
            element.setValue(valueFactory.createInteger(10));

            element.multiplyBy(valueFactory.createInteger(2));

            expect(element.getNative()).to.equal(20);
        });
    });

    describe('setKey()', function () {
        it('should change the key of the element when an integer is given (indexed element)', function () {
            element.setKey(valueFactory.createInteger(21));

            expect(element.getKey().getNative()).to.equal(21);
        });

        it('should change the key of the element when a string is given (associative element)', function () {
            element.setKey(valueFactory.createString('my_key'));

            expect(element.getKey().getNative()).to.equal('my_key');
        });
    });

    describe('setReference()', function () {
        it('should define the element in its array', function () {
            var reference = sinon.createStubInstance(Variable);

            element.setReference(reference);

            expect(arrayValue.defineElement).to.have.been.calledOnce;
            expect(arrayValue.defineElement).to.have.been.calledWith(sinon.match.same(element));
        });

        it('should return the element reference', function () {
            var reference = sinon.createStubInstance(Variable);

            expect(element.setReference(reference)).to.equal(reference);
        });
    });

    describe('setValue()', function () {
        describe('when the element is not a reference', function () {
            it('should define the element in its array', function () {
                var newValue = valueFactory.createString('my new value');

                element.setValue(newValue);

                expect(arrayValue.defineElement).to.have.been.calledOnce;
                expect(arrayValue.defineElement).to.have.been.calledWith(sinon.match.same(element));
            });

            it('should return the value assigned', function () {
                var newValue = valueFactory.createString('my new value');

                expect(element.setValue(newValue)).to.equal(newValue);
            });
        });

        describe('when the element is a reference', function () {
            var reference;

            beforeEach(function () {
                reference = sinon.createStubInstance(Variable);
                element.setReference(reference);
            });

            it('should define the element in its array', function () {
                var newValue = valueFactory.createString('my new value');

                element.setValue(newValue);

                expect(arrayValue.defineElement).to.have.been.calledOnce;
                expect(arrayValue.defineElement).to.have.been.calledWith(sinon.match.same(element));
            });

            it('should return the value assigned', function () {
                var newValue = valueFactory.createString('my new value');

                expect(element.setValue(newValue)).to.equal(newValue);
            });
        });

        describe('when this element is the first one to be defined', function () {
            beforeEach(function () {
                arrayValue.getLength.returns(0);
            });

            it('should change the array pointer to point to this element', function () {
                var newValue = valueFactory.createString('my new value');

                element.setValue(newValue);

                expect(arrayValue.pointToElement).to.have.been.calledOnce;
                expect(arrayValue.pointToElement).to.have.been.calledWith(sinon.match.same(element));
            });
        });

        describe('when this element is the second one to be defined', function () {
            beforeEach(function () {
                arrayValue.getLength.returns(1);
            });

            it('should not change the array pointer', function () {
                var newValue = valueFactory.createString('my new value');

                element.setValue(newValue);

                expect(arrayValue.pointToElement).not.to.have.been.called;
            });
        });
    });

    describe('unset()', function () {
        it('should leave the element no longer set', function () {
            element.unset();

            expect(element.isSet()).to.be.false;
        });
    });
});
