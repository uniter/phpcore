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
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    ArrayValue = require('../../../src/Value/Array').sync(),
    BooleanValue = require('../../../src/Value/Boolean').sync(),
    CallStack = require('../../../src/CallStack'),
    ElementReference = require('../../../src/Reference/Element'),
    FloatValue = require('../../../src/Value/Float').sync(),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    KeyValuePair = require('../../../src/KeyValuePair'),
    NullValue = require('../../../src/Value/Null').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPFatalError = phpCommon.PHPFatalError,
    PropertyReference = require('../../../src/Reference/Property'),
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Array', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = sinon.createStubInstance(ValueFactory);
        this.factory.createBoolean.restore();
        sinon.stub(this.factory, 'createBoolean', function (nativeValue) {
            var booleanValue = sinon.createStubInstance(BooleanValue);
            booleanValue.coerceToKey.returns(booleanValue);
            booleanValue.getForAssignment.returns(booleanValue);
            booleanValue.getNative.returns(nativeValue);
            return booleanValue;
        }.bind(this));
        this.factory.createFloat.restore();
        sinon.stub(this.factory, 'createFloat', function (nativeValue) {
            var floatValue = sinon.createStubInstance(FloatValue);
            floatValue.coerceToKey.returns(floatValue);
            floatValue.getForAssignment.returns(floatValue);
            floatValue.getNative.returns(nativeValue);
            return floatValue;
        }.bind(this));
        this.factory.createInteger.restore();
        sinon.stub(this.factory, 'createInteger', function (nativeValue) {
            var integerValue = sinon.createStubInstance(IntegerValue);
            integerValue.coerceToKey.returns(integerValue);
            integerValue.getForAssignment.returns(integerValue);
            integerValue.getNative.returns(nativeValue);
            return integerValue;
        }.bind(this));
        this.factory.createNull.restore();
        sinon.stub(this.factory, 'createNull', function () {
            var nullValue = sinon.createStubInstance(NullValue);
            nullValue.coerceToKey.returns(nullValue);
            nullValue.getForAssignment.returns(nullValue);
            nullValue.getNative.returns(null);
            return nullValue;
        }.bind(this));
        this.factory.createObject.restore();
        sinon.stub(this.factory, 'createObject', function (nativeValue) {
            var objectValue = sinon.createStubInstance(ObjectValue);
            objectValue.coerceToKey.returns(objectValue);
            objectValue.getForAssignment.returns(objectValue);
            objectValue.getNative.returns(nativeValue);
            return objectValue;
        }.bind(this));
        this.factory.createString.restore();
        sinon.stub(this.factory, 'createString', function (nativeValue) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.coerceToKey.returns(stringValue);
            stringValue.getForAssignment.returns(stringValue);
            stringValue.getNative.returns(nativeValue);
            stringValue.isEqualTo.restore();
            sinon.stub(stringValue, 'isEqualTo', function (otherValue) {
                return this.factory.createBoolean(otherValue.getNative() === nativeValue);
            }.bind(this));
            return stringValue;
        }.bind(this));

        this.createKeyValuePair = function (key, value) {
            var keyValuePair = sinon.createStubInstance(KeyValuePair);
            keyValuePair.getKey.returns(key);
            keyValuePair.getValue.returns(value);
            return keyValuePair;
        };

        this.element1 = this.createKeyValuePair(
            this.factory.createString('firstEl'),
            this.factory.createString('value of first el')
        );
        this.element2 = this.createKeyValuePair(
            this.factory.createString('secondEl'),
            this.factory.createString('value of second el')
        );

        this.value = new ArrayValue(this.factory, this.callStack, [
            this.element1,
            this.element2
        ]);
    });

    describe('addToArray() - adding an array to another array', function () {
        beforeEach(function () {
            this.leftElement1 = this.createKeyValuePair(
                this.factory.createString('firstEl'),
                this.factory.createString('value of left first el')
            );
            this.leftElement2 = this.createKeyValuePair(
                this.factory.createString('leftSecondEl'),
                this.factory.createString('value of left second el')
            );

            this.leftValue = new ArrayValue(this.factory, this.callStack, [
                this.leftElement1,
                this.leftElement2
            ]);
        });

        it('should return an array', function () {
            expect(this.value.addToArray(this.leftValue)).to.be.an.instanceOf(ArrayValue);
        });

        it('should return a different array to the left operand', function () {
            expect(this.value.addToArray(this.leftValue)).not.to.equal(this.leftValue);
        });

        it('should prefer elements from left array over elements from right array', function () {
            var result = this.value.addToArray(this.leftValue);

            expect(result.getNative().firstEl).to.equal('value of left first el');
            expect(result.getNative().secondEl).to.equal('value of second el');
            expect(result.getNative().leftSecondEl).to.equal('value of left second el');
        });
    });

    describe('addToBoolean() - adding an array to a boolean', function () {
        it('should throw an "Unsupported operand" error', function () {
            var booleanValue = this.factory.createBoolean(true);

            expect(function () {
                this.value.addToBoolean(booleanValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('addToFloat() - adding an array to a float', function () {
        it('should throw an "Unsupported operand" error', function () {
            var floatValue = this.factory.createFloat(1.2);

            expect(function () {
                this.value.addToFloat(floatValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('addToInteger() - adding an array to an integer', function () {
        it('should throw an "Unsupported operand" error', function () {
            var integerValue = this.factory.createInteger(4);

            expect(function () {
                this.value.addToInteger(integerValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('addToNull() - adding an array to null', function () {
        it('should throw an "Unsupported operand" error', function () {
            var nullValue = this.factory.createNull();

            expect(function () {
                this.value.addToNull(nullValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('addToObject() - adding an array to an object', function () {
        it('should hand off to ObjectValue.addToArray(...)', function () {
            var objectValue = this.factory.createObject(),
                result = {};
            objectValue.addToArray.withArgs(this.value).returns(result);

            expect(this.value.addToObject(objectValue)).to.equal(result);
        });
    });

    describe('addToString() - adding an array to a string', function () {
        it('should throw an "Unsupported operand" error', function () {
            var stringValue = this.factory.createString('My string value');

            expect(function () {
                this.value.addToString(stringValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('coerceToObject()', function () {
        beforeEach(function () {
            this.nativeStdClassObject = {};
            this.stdClassObject = sinon.createStubInstance(ObjectValue);
            this.factory.createStdClassObject.returns(this.stdClassObject);

            this.stdClassObject.getInstancePropertyByName.restore();
            sinon.stub(this.stdClassObject, 'getInstancePropertyByName', function (nameValue) {
                var propertyRef = sinon.createStubInstance(PropertyReference);

                propertyRef.setValue.restore();
                sinon.stub(propertyRef, 'setValue', function (value) {
                    this.nativeStdClassObject[nameValue.getNative()] = value.getNative();
                }.bind(this));

                return propertyRef;
            }.bind(this));
        });

        it('should return an ObjectValue wrapping the created stdClass instance', function () {
            var coercedValue = this.value.coerceToObject();

            expect(coercedValue).to.equal(this.stdClassObject);
        });

        it('should store the array elements as properties of the stdClass object', function () {
            this.value.coerceToObject();

            expect(this.nativeStdClassObject.firstEl).to.equal('value of first el');
            expect(this.nativeStdClassObject.secondEl).to.equal('value of second el');
        });
    });

    describe('divide()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var rightValue = sinon.createStubInstance(Value);

            expect(function () {
                this.value.divide(rightValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('divideByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createArray([]);

            expect(function () {
                this.value.divideByArray(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('divideByBoolean()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createBoolean(true);

            expect(function () {
                this.value.divideByBoolean(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('divideByFloat()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createFloat(1.2);

            expect(function () {
                this.value.divideByFloat(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('divideByInteger()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createInteger(4);

            expect(function () {
                this.value.divideByInteger(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('divideByNull()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createNull();

            expect(function () {
                this.value.divideByNull(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('divideByObject()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createObject({});

            expect(function () {
                this.value.divideByObject(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('divideByString()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createString('my string value');

            expect(function () {
                this.value.divideByString(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('getNative()', function () {
        it('should unwrap to a native array when the array has no non-numeric keys', function () {
            var result;
            this.element1.getKey.returns(this.factory.createString('1'));
            this.element2.getKey.returns(this.factory.createString('0'));
            this.value = new ArrayValue(this.factory, this.callStack, [
                this.element1,
                this.element2
            ]);

            result = this.value.getNative();

            expect(result).to.be.an('array');
            expect(result).to.deep.equal(['value of second el', 'value of first el']);
        });

        it('should unwrap to a plain object when the array has a non-numeric key', function () {
            var result;
            this.element1.getKey.returns(this.factory.createString('nonNumeric'));
            this.element2.getKey.returns(this.factory.createString('7'));
            this.value = new ArrayValue(this.factory, this.callStack, [
                this.element1,
                this.element2
            ]);

            result = this.value.getNative();

            expect(result).to.be.an('object');
            expect(result).not.to.be.an('array');
            expect(result).to.deep.equal({
                nonNumeric: 'value of first el',
                7: 'value of second el'
            });
        });

        it('should unwrap to a native array when the array is empty', function () {
            var result;
            this.value = new ArrayValue(this.factory, this.callStack, []);

            result = this.value.getNative();

            expect(result).to.be.an('array');
            expect(result).to.have.length(0);
        });

    });

    describe('getPushElement()', function () {
        it('should return an ElementReference', function () {
            expect(this.value.getPushElement()).to.be.an.instanceOf(ElementReference);
        });
    });

    describe('isAnInstanceOf()', function () {
        it('should hand off to the right-hand operand to determine the result', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.isTheClassOfArray.withArgs(this.value).returns(result);

            expect(this.value.isAnInstanceOf(rightOperand)).to.equal(result);
        });
    });

    describe('isTheClassOfArray()', function () {
        it('should raise a fatal error', function () {
            var classValue = sinon.createStubInstance(ArrayValue);

            expect(function () {
                this.value.isTheClassOfArray(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isTheClassOfBoolean()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createBoolean(true);

            expect(function () {
                this.value.isTheClassOfBoolean(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isTheClassOfFloat()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createFloat(22.4);

            expect(function () {
                this.value.isTheClassOfFloat(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isTheClassOfInteger()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createInteger(21);

            expect(function () {
                this.value.isTheClassOfInteger(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isTheClassOfNull()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createNull();

            expect(function () {
                this.value.isTheClassOfNull(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isTheClassOfObject()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createObject({});

            expect(function () {
                this.value.isTheClassOfObject(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('isTheClassOfString()', function () {
        it('should raise a fatal error', function () {
            var classValue = this.factory.createString('a string');

            expect(function () {
                this.value.isTheClassOfString(classValue);
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
        });
    });

    describe('pointToElement()', function () {
        it('should set the pointer to the index of the key in the array', function () {
            var element = sinon.createStubInstance(ElementReference);
            element.getKey.returns(this.factory.createString('secondEl'));

            this.value.pointToElement(element);

            expect(this.value.getPointer()).to.equal(1);
        });
    });

    describe('pushElement()', function () {
        it('should add the element to the array', function () {
            var element = sinon.createStubInstance(ElementReference);
            element.getKey.returns(this.factory.createInteger(21));
            element.getValue.returns(this.factory.createString('a value'));

            this.value.pushElement(element);

            expect(this.value.getNative()[21]).to.equal('a value');
        });

        it('should return an IntegerValue with the pushed element\'s key', function () {
            var element = sinon.createStubInstance(ElementReference),
                result;
            element.getKey.returns(this.factory.createInteger(21));
            element.getValue.returns(this.factory.createString('a value'));

            result = this.value.pushElement(element);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(2); // 0 and 1 already taken by existing elements
        });
    });
});
