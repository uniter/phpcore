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
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync(),
    Variable = require('../../../src/Variable').sync(),
    VariableReference = require('../../../src/Reference/Variable');

describe('ElementReference', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = new ValueFactory();
        this.arrayValue = sinon.createStubInstance(ArrayValue);
        this.keyValue = this.factory.createString('my_element');
        this.value = sinon.createStubInstance(Value);

        this.value.getForAssignment.returns(this.value);
        this.value.getNative.returns('the value of my element');
        this.value.getType.returns('string');

        this.element = new ElementReference(
            this.factory,
            this.callStack,
            this.arrayValue,
            this.keyValue,
            this.value
        );
    });

    describe('concatWith()', function () {
        it('should append the given value to the element\'s value and assign it back to the element', function () {
            this.element.setValue(this.factory.createString('hello'));

            this.element.concatWith(this.factory.createString(' world'));

            expect(this.element.getNative()).to.equal('hello world');
        });
    });

    describe('decrementBy()', function () {
        it('should subtract the given value from the element\'s value and assign it back to the element', function () {
            this.element.setValue(this.factory.createInteger(20));

            this.element.decrementBy(this.factory.createInteger(4));

            expect(this.element.getNative()).to.equal(16);
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the element\'s value', function () {
            this.element.setValue(this.factory.createString('my native value'));

            expect(this.element.getNative()).to.equal('my native value');
        });
    });

    describe('getPair()', function () {
        it('should return a KeyValuePair when the element has a value', function () {
            var pair = this.element.getPair();

            expect(pair).to.be.an.instanceOf(KeyValuePair);
            expect(pair.getKey()).to.equal(this.keyValue);
            expect(pair.getValue()).to.equal(this.value);
        });

        it('should return a KeyReferencePair when the element is a reference', function () {
            var pair,
                reference = sinon.createStubInstance(VariableReference);
            this.element.setReference(reference);

            pair = this.element.getPair();

            expect(pair).to.be.an.instanceOf(KeyReferencePair);
            expect(pair.getKey()).to.equal(this.keyValue);
            expect(pair.getReference()).to.equal(reference);
        });

        it('should allow the key to be overridden when specified', function () {
            var overrideKey = this.factory.createInteger(21),
                pair = this.element.getPair(overrideKey);

            expect(pair).to.be.an.instanceOf(KeyValuePair);
            expect(pair.getKey()).to.equal(overrideKey);
            expect(pair.getValue()).to.equal(this.value);
        });

        it('should throw an error when the element is not defined', function () {
            expect(function () {
                var element = new ElementReference(
                    this.factory,
                    this.callStack,
                    this.arrayValue,
                    this.keyValue
                );

                element.getPair();
            }.bind(this)).to.throw('Element is not defined');
        });
    });

    describe('getValueReference()', function () {
        it('should return the value when the element has a value', function () {
            expect(this.element.getValueReference()).to.equal(this.value);
        });

        it('should return a KeyReferencePair when the element is a reference', function () {
            var reference = sinon.createStubInstance(VariableReference);
            this.element.setReference(reference);

            expect(this.element.getValueReference()).to.equal(reference);
        });

        it('should return null when the element is not defined', function () {
            var element = new ElementReference(
                this.factory,
                this.callStack,
                this.arrayValue,
                this.keyValue
            );

            expect(element.getValueReference()).to.be.null;
        });
    });

    describe('incrementBy()', function () {
        it('should add the given value to the element\'s value and assign it back to the element', function () {
            this.element.setValue(this.factory.createInteger(20));

            this.element.incrementBy(this.factory.createInteger(4));

            expect(this.element.getNative()).to.equal(24);
        });
    });

    describe('isEmpty()', function () {
        it('should return false for an unset element', function () {
            this.element.unset();

            expect(this.element.isEmpty()).to.be.false;
        });

        it('should return true when the element has a value that is empty', function () {
            this.value.isEmpty.returns(true);

            expect(this.element.isEmpty()).to.be.true;
        });

        it('should return false when the element has a value that is not empty', function () {
            this.value.isEmpty.returns(false);

            expect(this.element.isEmpty()).to.be.false;
        });

        it('should return true when the element has a reference to a value that is empty', function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(this.value);
            this.value.isEmpty.returns(true);
            this.element.setReference(reference);

            expect(this.element.isEmpty()).to.be.true;
        });

        it('should return false when the element has a reference to a value that is not empty', function () {
            var reference = sinon.createStubInstance(Variable);
            reference.getValue.returns(this.value);
            this.value.isEmpty.returns(false);
            this.element.setReference(reference);

            expect(this.element.isEmpty()).to.be.false;
        });
    });

    describe('isSet()', function () {
        it('should return true if the element\'s value is set', function () {
            this.value.isSet.returns(true);

            expect(this.element.isSet()).to.be.true;
        });

        it('should return false if the element\'s value is not set', function () {
            this.value.isSet.returns(false);

            expect(this.element.isSet()).to.be.false;
        });
    });

    describe('setReference()', function () {
        it('should define the element in its array', function () {
            var reference = sinon.createStubInstance(Variable);

            this.element.setReference(reference);

            expect(this.arrayValue.defineElement).to.have.been.calledOnce;
            expect(this.arrayValue.defineElement).to.have.been.calledWith(sinon.match.same(this.element));
        });

        it('should return the element reference', function () {
            var reference = sinon.createStubInstance(Variable);

            expect(this.element.setReference(reference)).to.equal(reference);
        });
    });

    describe('setValue()', function () {
        describe('when the element is not a reference', function () {
            it('should define the element in its array', function () {
                var newValue = this.factory.createString('my new value');

                this.element.setValue(newValue);

                expect(this.arrayValue.defineElement).to.have.been.calledOnce;
                expect(this.arrayValue.defineElement).to.have.been.calledWith(sinon.match.same(this.element));
            });

            it('should return the value assigned', function () {
                var newValue = this.factory.createString('my new value');

                expect(this.element.setValue(newValue)).to.equal(newValue);
            });
        });

        describe('when the element is a reference', function () {
            beforeEach(function () {
                this.reference = sinon.createStubInstance(Variable);
                this.element.setReference(this.reference);
            });

            it('should define the element in its array', function () {
                var newValue = this.factory.createString('my new value');

                this.element.setValue(newValue);

                expect(this.arrayValue.defineElement).to.have.been.calledOnce;
                expect(this.arrayValue.defineElement).to.have.been.calledWith(sinon.match.same(this.element));
            });

            it('should return the value assigned', function () {
                var newValue = this.factory.createString('my new value');

                expect(this.element.setValue(newValue)).to.equal(newValue);
            });
        });

        describe('when this element is the first one to be defined', function () {
            beforeEach(function () {
                this.arrayValue.getLength.returns(0);
            });

            it('should change the array pointer to point to this element', function () {
                var newValue = this.factory.createString('my new value');

                this.element.setValue(newValue);

                expect(this.arrayValue.pointToElement).to.have.been.calledOnce;
                expect(this.arrayValue.pointToElement).to.have.been.calledWith(sinon.match.same(this.element));
            });
        });

        describe('when this element is the second one to be defined', function () {
            beforeEach(function () {
                this.arrayValue.getLength.returns(1);
            });

            it('should not change the array pointer', function () {
                var newValue = this.factory.createString('my new value');

                this.element.setValue(newValue);

                expect(this.arrayValue.pointToElement).not.to.have.been.called;
            });
        });
    });

    describe('unset()', function () {
        it('should leave the element no longer set', function () {
            this.element.unset();

            expect(this.element.isSet()).to.be.false;
        });
    });
});
