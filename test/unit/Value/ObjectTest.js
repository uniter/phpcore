/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    expect = require('chai').expect,
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    ArrayValue = require('../../../src/Value/Array').sync(),
    BooleanValue = require('../../../src/Value/Boolean').sync(),
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    FloatValue = require('../../../src/Value/Float').sync(),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    NullValue = require('../../../src/Value/Null').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    PHPFatalError = phpCommon.PHPFatalError,
    PropertyReference = require('../../../src/Reference/Property'),
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Object', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = sinon.createStubInstance(ValueFactory);
        this.factory.coerce.restore();
        sinon.stub(this.factory, 'coerce', function (nativeValue) {
            var value;
            if (nativeValue instanceof Value) {
                return nativeValue;
            }
            value = sinon.createStubInstance(Value);
            value.getNative.returns(nativeValue);
            return value;
        });
        this.factory.createArray.restore();
        sinon.stub(this.factory, 'createArray', function (nativeValue) {
            var arrayValue = sinon.createStubInstance(ArrayValue);
            arrayValue.getForAssignment.returns(arrayValue);
            arrayValue.getLength.returns(nativeValue.length);
            arrayValue.getNative.returns(nativeValue);
            return arrayValue;
        });
        this.factory.createBoolean.restore();
        sinon.stub(this.factory, 'createBoolean', function (nativeValue) {
            var booleanValue = sinon.createStubInstance(BooleanValue);
            booleanValue.getType.returns('boolean');
            booleanValue.coerceToKey.returns(booleanValue);
            booleanValue.coerceToNumber.restore();
            sinon.stub(booleanValue, 'coerceToNumber', function () {
                return this.factory.createInteger(nativeValue ? 1 : 0);
            }.bind(this));
            booleanValue.getForAssignment.returns(booleanValue);
            booleanValue.getNative.returns(nativeValue);
            return booleanValue;
        }.bind(this));
        this.factory.createFloat.restore();
        sinon.stub(this.factory, 'createFloat', function (nativeValue) {
            var floatValue = sinon.createStubInstance(FloatValue);
            floatValue.getType.returns('float');
            floatValue.coerceToKey.returns(floatValue);
            floatValue.coerceToNumber.returns(floatValue);
            floatValue.getForAssignment.returns(floatValue);
            floatValue.getNative.returns(nativeValue);
            return floatValue;
        }.bind(this));
        this.factory.createInteger.restore();
        sinon.stub(this.factory, 'createInteger', function (nativeValue) {
            var integerValue = sinon.createStubInstance(IntegerValue);
            integerValue.getType.returns('integer');
            integerValue.coerceToKey.returns(integerValue);
            integerValue.coerceToNumber.returns(integerValue);
            integerValue.getForAssignment.returns(integerValue);
            integerValue.getNative.returns(nativeValue);
            return integerValue;
        }.bind(this));
        this.factory.createNull.restore();
        sinon.stub(this.factory, 'createNull', function (nativeValue) {
            var nullValue = sinon.createStubInstance(NullValue);
            nullValue.getType.returns('null');
            nullValue.coerceToKey.returns(nullValue);
            nullValue.getForAssignment.returns(nullValue);
            nullValue.getNative.returns(nativeValue);
            return nullValue;
        }.bind(this));
        this.factory.createObject.restore();
        sinon.stub(this.factory, 'createObject', function (nativeValue, classObject) {
            var objectValue = sinon.createStubInstance(IntegerValue);
            objectValue.classObject = classObject;
            objectValue.getType.returns('object');
            objectValue.coerceToKey.returns(objectValue);
            objectValue.getForAssignment.returns(objectValue);
            objectValue.getNative.returns(nativeValue);
            return objectValue;
        }.bind(this));
        this.factory.createString.restore();
        sinon.stub(this.factory, 'createString', function (nativeValue) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.getType.returns('string');
            stringValue.coerceToKey.returns(stringValue);
            stringValue.getForAssignment.returns(stringValue);
            stringValue.getNative.returns(nativeValue);
            stringValue.isEqualTo.restore();
            sinon.stub(stringValue, 'isEqualTo', function (otherValue) {
                return this.factory.createBoolean(otherValue.getNative() === nativeValue);
            }.bind(this));
            return stringValue;
        }.bind(this));

        this.classObject = sinon.createStubInstance(Class);
        this.classObject.isAutoCoercionEnabled.returns(false);
        this.prop1 = this.factory.createString('the value of firstProp');
        this.prop2 = this.factory.createString('the value of secondProp');
        this.nativeObject = {
            firstProp: this.prop1,
            secondProp: this.prop2
        };
        this.objectID = 21;

        this.value = new ObjectValue(
            this.factory,
            this.callStack,
            this.nativeObject,
            this.classObject,
            this.objectID
        );
    });

    describe('callMethod()', function () {
        it('should ask the class to call the method and return its result', function () {
            var argValue = sinon.createStubInstance(Value),
                resultValue = sinon.createStubInstance(Value);
            this.classObject.callMethodForInstance.returns(resultValue);

            expect(this.value.callMethod('myMethod', [argValue])).to.equal(resultValue);
            expect(this.classObject.callMethodForInstance).to.have.been.calledOnce;
            expect(this.classObject.callMethodForInstance).to.have.been.calledWith(
                sinon.match.same(this.nativeObject),
                'myMethod',
                [sinon.match.same(argValue)],
                sinon.match.same(this.nativeObject),
                sinon.match.same(this.value)
            );
        });
    });

    describe('classIs()', function () {
        it('should return true when <class>.is(...) does', function () {
            this.classObject.is.withArgs('My\\Class\\Path').returns(true);

            expect(this.value.classIs('My\\Class\\Path')).to.be.true;
        });

        it('should return false when <class>.is(...) does', function () {
            this.classObject.is.withArgs('My\\Class\\Path').returns(false);

            expect(this.value.classIs('My\\Class\\Path')).to.be.false;
        });
    });

    describe('coerceToArray()', function () {
        it('should handle an empty object', function () {
            var objectValue = new ObjectValue(
                    this.factory,
                    this.callStack,
                    {},
                    this.classObject,
                    this.objectID
                ),
                arrayValue;

            arrayValue = objectValue.coerceToArray();

            expect(arrayValue.getLength()).to.equal(0);
        });

        it('should handle an object with native and PHP properties', function () {
            var arrayValue;
            this.value.getInstancePropertyByName(this.factory.createString('myNewProp'))
                .setValue(this.factory.createString('the value of the new prop'));

            arrayValue = this.value.coerceToArray();

            expect(arrayValue.getLength()).to.equal(3);
            expect(arrayValue.getNative()[0].getKey().getNative()).to.equal('firstProp');
            expect(arrayValue.getNative()[0].getValue().getNative()).to.equal('the value of firstProp');
            expect(arrayValue.getNative()[1].getKey().getNative()).to.equal('secondProp');
            expect(arrayValue.getNative()[1].getValue().getNative()).to.equal('the value of secondProp');
            expect(arrayValue.getNative()[2].getKey().getNative()).to.equal('myNewProp');
            expect(arrayValue.getNative()[2].getValue().getNative()).to.equal('the value of the new prop');
        });

        it('should handle an object with property named "length"', function () {
            var arrayValue;
            this.value.getInstancePropertyByName(this.factory.createString('length'))
                .setValue(this.factory.createInteger(321));

            arrayValue = this.value.coerceToArray();

            expect(arrayValue.getLength()).to.equal(3);
            expect(arrayValue.getNative()[2].getKey().getNative()).to.equal('length');
            expect(arrayValue.getNative()[2].getValue().getNative()).to.equal(321);
        });
    });

    describe('coerceToInteger()', function () {
        it('should raise a notice', function () {
            this.classObject.getName.returns('MyClass');
            this.value.coerceToInteger();

            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class MyClass could not be converted to int'
            );
        });

        it('should return int one', function () {
            var result = this.value.coerceToInteger();

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });
    });

    describe('coerceToNumber()', function () {
        it('should raise a notice', function () {
            this.classObject.getName.returns('MyClass');
            this.value.coerceToNumber();

            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class MyClass could not be converted to int'
            );
        });

        it('should return int one', function () {
            var result = this.value.coerceToNumber();

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });
    });

    describe('coerceToObject()', function () {
        it('should return the same object value', function () {
            var coercedValue = this.value.coerceToObject();

            expect(coercedValue).to.equal(this.value);
        });
    });

    describe('divide()', function () {
        it('should hand off to the right-hand operand to divide by this object', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.divideByObject.withArgs(this.value).returns(result);

            expect(this.value.divide(rightOperand)).to.equal(result);
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
        _.each([
            {
                left: true,
                expectedResultType: IntegerValue,
                expectedResult: 1
            },
            {
                left: false,
                expectedResultType: IntegerValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / <object>`', function () {
                beforeEach(function () {
                    this.leftValue = this.factory.createBoolean(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = this.value.divideByBoolean(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    this.classObject.getName.returns('MyClass');

                    this.value.divideByBoolean(this.leftValue);

                    expect(this.callStack.raiseError).to.have.been.calledOnce;
                    expect(this.callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyClass could not be converted to int'
                    );
                });
            });
        });
    });

    describe('divideByFloat()', function () {
        _.each([
            {
                left: 12.0,
                expectedResultType: FloatValue,
                expectedResult: 12.0
            },
            {
                left: 0.0,
                expectedResultType: FloatValue,
                expectedResult: 0.0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / <object>`', function () {
                beforeEach(function () {
                    this.leftValue = this.factory.createFloat(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = this.value.divideByFloat(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    this.classObject.getName.returns('MyObjClass');

                    this.value.divideByFloat(this.leftValue);

                    expect(this.callStack.raiseError).to.have.been.calledOnce;
                    expect(this.callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyObjClass could not be converted to int'
                    );
                });
            });
        });
    });

    describe('divideByInteger()', function () {
        _.each([
            {
                left: 100,
                expectedResultType: IntegerValue,
                expectedResult: 100
            },
            {
                left: 0,
                expectedResultType: IntegerValue,
                expectedResult: 0
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / <object>`', function () {
                beforeEach(function () {
                    this.leftValue = this.factory.createInteger(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = this.value.divideByInteger(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    this.classObject.getName.returns('MyClass');

                    this.value.divideByInteger(this.leftValue);

                    expect(this.callStack.raiseError).to.have.been.calledOnce;
                    expect(this.callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyClass could not be converted to int'
                    );
                });
            });
        });
    });

    describe('divideByNull()', function () {
        describe('for `null / <object>`', function () {
            beforeEach(function () {
                this.leftValue = sinon.createStubInstance(NullValue);
                this.leftValue.getNative.returns(null);

                this.coercedLeftValue = sinon.createStubInstance(IntegerValue);
                this.coercedLeftValue.getNative.returns(0);
                this.leftValue.coerceToNumber.returns(this.coercedLeftValue);
            });

            it('should return int(0)', function () {
                var result = this.value.divideByNull(this.leftValue);

                expect(result).to.be.an.instanceOf(IntegerValue);
                expect(result.getNative()).to.equal(0);
            });

            it('should raise a notice due to coercion of object to int', function () {
                this.classObject.getName.returns('MyClass');

                this.value.divideByNull(this.leftValue);

                expect(this.callStack.raiseError).to.have.been.calledOnce;
                expect(this.callStack.raiseError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'Object of class MyClass could not be converted to int'
                );
            });
        });
    });

    describe('divideByObject()', function () {
        beforeEach(function () {
            this.leftValue = sinon.createStubInstance(ObjectValue);
            this.leftValue.getNative.returns({});

            this.coercedLeftValue = sinon.createStubInstance(IntegerValue);
            this.coercedLeftValue.getNative.returns(1);
            this.leftValue.coerceToNumber.returns(this.coercedLeftValue);
        });

        it('should return int(1)', function () {
            var result = this.value.divideByObject(this.leftValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });

        it('should raise a notice due to coercion of object to int', function () {
            this.classObject.getName.returns('MyClass');

            this.value.divideByObject(this.leftValue);

            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class MyClass could not be converted to int'
            );
        });
    });

    describe('divideByString()', function () {
        _.each([
            {
                left: 'my string',
                coercedLeftClass: IntegerValue,
                coercedLeftType: 'integer',
                coercedLeft: 0,
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: '21', // Int string is coerced to int
                coercedLeftClass: IntegerValue,
                coercedLeftType: 'integer',
                coercedLeft: 21,
                expectedResultType: IntegerValue,
                expectedResult: 21
            },
            {
                left: '27.2', // Decimal string is coerced to float
                coercedLeftClass: FloatValue,
                coercedLeftType: 'float',
                coercedLeft: 27.2,
                expectedResultType: FloatValue,
                expectedResult: 27.2
            },
            {
                left: '25.4.7', // Decimal string prefix is coerced to float
                coercedLeftClass: FloatValue,
                coercedLeftType: 'float',
                coercedLeft: 25.4,
                expectedResultType: FloatValue,
                expectedResult: 25.4
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / <object>`', function () {
                beforeEach(function () {
                    this.leftValue = this.factory.createString(scenario.left);

                    this.coercedLeftValue = sinon.createStubInstance(scenario.coercedLeftClass);
                    this.coercedLeftValue.getType.returns(scenario.coercedLeftType);
                    this.coercedLeftValue.getNative.returns(scenario.coercedLeft);
                    this.leftValue.coerceToNumber.returns(this.coercedLeftValue);
                });

                it('should return the correct value', function () {
                    var result = this.value.divideByString(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    this.classObject.getName.returns('MyClass');

                    this.value.divideByString(this.leftValue);

                    expect(this.callStack.raiseError).to.have.been.calledOnce;
                    expect(this.callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyClass could not be converted to int'
                    );
                });
            });
        });
    });

    describe('getCallableName()', function () {
        it('should return the FQN when the object is a Closure', function () {
            this.classObject.is.withArgs('Closure').returns(true);
            this.classObject.is.returns(false);
            this.nativeObject.funcName = 'Fully\\Qualified\\Path\\To\\{closure}';

            expect(this.value.getCallableName()).to.equal('Fully\\Qualified\\Path\\To\\{closure}');
        });

        it('should return the FQN to the __invoke(...) method when the object is not a Closure', function () {
            this.classObject.getName.returns('Fully\\Qualified\\Path\\To\\MyClass');

            expect(this.value.getCallableName()).to.equal('Fully\\Qualified\\Path\\To\\MyClass::__invoke()');
        });
    });

    describe('getInstancePropertyNames()', function () {
        it('should include properties on the native object', function () {
            var names = this.value.getInstancePropertyNames();

            expect(names).to.have.length(2);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
        });

        it('should include properties added from PHP', function () {
            var names;
            this.value.getInstancePropertyByName(this.factory.createString('myNewProp'))
                .setValue(this.factory.createString('a value'));

            names = this.value.getInstancePropertyNames();

            expect(names).to.have.length(3);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
            expect(names[2].getNative()).to.equal('myNewProp');
        });

        it('should not include undefined properties', function () {
            var names;
            // Fetch property reference but do not assign a value or reference to keep it undefined
            this.value.getInstancePropertyByName(this.factory.createString('myNewProp'));

            names = this.value.getInstancePropertyNames();

            expect(names).to.have.length(2);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
        });

        it('should handle a property called "length" correctly', function () {
            var names;
            this.value.getInstancePropertyByName(this.factory.createString('length'))
                .setValue(this.factory.createInteger(127));

            names = this.value.getInstancePropertyNames();

            expect(names).to.have.length(3);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
            expect(names[2].getNative()).to.equal('length');
        });
    });

    describe('getNative()', function () {
        it('should coerce the thisObj passed to unwrapped Closures to an object', function () {
            var coercedThisObject = {},
                nativeFunction = sinon.stub(),
                nativeThisObject = {},
                unwrapped;
            this.classObject.getName.returns('Closure');
            this.factory.coerceObject.withArgs(sinon.match.same(nativeThisObject)).returns(coercedThisObject);
            this.value = new ObjectValue(
                this.factory,
                this.callStack,
                nativeFunction,
                this.classObject,
                this.objectID
            );

            unwrapped = this.value.getNative();
            expect(unwrapped).to.be.a('function');

            unwrapped.call(nativeThisObject);
            expect(nativeFunction).to.have.been.calledOnce;
            expect(nativeFunction).to.have.been.calledOn(coercedThisObject);
        });
    });

    describe('isAnInstanceOf()', function () {
        it('should hand off to the right-hand operand to determine the result', function () {
            var namespaceScope = sinon.createStubInstance(NamespaceScope),
                rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.isTheClassOfObject.withArgs(this.value, namespaceScope).returns(result);

            expect(this.value.isAnInstanceOf(rightOperand, namespaceScope)).to.equal(result);
        });
    });

    describe('isTheClassOfArray()', function () {
        it('should return bool(false)', function () {
            var classValue = sinon.createStubInstance(ArrayValue),
                result = this.value.isTheClassOfArray(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfBoolean()', function () {
        it('should return bool(false)', function () {
            var classValue = this.factory.createBoolean(true),
                result = this.value.isTheClassOfBoolean(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfFloat()', function () {
        it('should return bool(false)', function () {
            var classValue = this.factory.createFloat(21.2),
                result = this.value.isTheClassOfFloat(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfInteger()', function () {
        it('should return bool(false)', function () {
            var classValue = this.factory.createInteger(21),
                result = this.value.isTheClassOfInteger(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfNull()', function () {
        it('should return bool(false)', function () {
            var classValue = this.factory.createNull(),
                result = this.value.isTheClassOfNull(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfObject()', function () {
        it('should return bool(true) when the two objects have the same class', function () {
            var subjectObjectValue = this.factory.createObject({}, this.classObject),
                result = this.value.isTheClassOfObject(subjectObjectValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(true);
        });

        it('should return bool(true) when the subject object\'s class extends this object\'s class', function () {
            var subjectClassObject = sinon.createStubInstance(Class),
                subjectObjectValue = this.factory.createObject({}, subjectClassObject),
                result;
            subjectClassObject.extends.withArgs(sinon.match.same(this.classObject)).returns(true);
            this.classObject.extends.withArgs(sinon.match.same(subjectClassObject)).returns(false);

            result = this.value.isTheClassOfObject(subjectObjectValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(true);
        });

        it('should return bool(false) when this object\'s class extends the subject object\'s class', function () {
            var subjectClassObject = sinon.createStubInstance(Class),
                subjectObjectValue = this.factory.createObject({}, subjectClassObject),
                result;
            subjectClassObject.extends.withArgs(sinon.match.same(this.classObject)).returns(false);
            this.classObject.extends.withArgs(sinon.match.same(subjectClassObject)).returns(true);

            result = this.value.isTheClassOfObject(subjectObjectValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfString()', function () {
        it('should return bool(false)', function () {
            var classValue = this.factory.createString('my string'),
                result = this.value.isTheClassOfString(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('pointToProperty()', function () {
        it('should set the pointer to the index of the property when native', function () {
            var element = sinon.createStubInstance(PropertyReference);
            element.getKey.returns(this.factory.createString('secondProp'));

            this.value.pointToProperty(element);

            expect(this.value.getPointer()).to.equal(1);
        });

        it('should set the pointer to the index of the property when added from PHP', function () {
            var element = sinon.createStubInstance(PropertyReference);
            element.getKey.returns(this.factory.createString('myNewProp'));
            this.value.getInstancePropertyByName(this.factory.createString('myNewProp'))
                .setValue(this.factory.createString('a value'));

            this.value.pointToProperty(element);

            expect(this.value.getPointer()).to.equal(2);
        });
    });
});
