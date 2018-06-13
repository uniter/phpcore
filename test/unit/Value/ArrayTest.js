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
    ArrayIterator = require('../../../src/Iterator/ArrayIterator'),
    ArrayValue = require('../../../src/Value/Array').sync(),
    CallStack = require('../../../src/CallStack'),
    ElementReference = require('../../../src/Reference/Element'),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    KeyReferencePair = require('../../../src/KeyReferencePair'),
    KeyValuePair = require('../../../src/KeyValuePair'),
    Namespace = require('../../../src/Namespace').sync(),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPFatalError = phpCommon.PHPFatalError,
    PropertyReference = require('../../../src/Reference/Property'),
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync(),
    VariableReference = require('../../../src/Reference/Variable');

describe('Array', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = new ValueFactory();
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);
        this.globalNamespace = sinon.createStubInstance(Namespace);
        this.namespaceScope.getGlobalNamespace.returns(this.globalNamespace);

        this.createKeyValuePair = function (key, value) {
            var keyValuePair = sinon.createStubInstance(KeyValuePair);
            keyValuePair.getKey.returns(key);
            keyValuePair.getValue.returns(value);
            return keyValuePair;
        };
        this.createKeyReferencePair = function (key, reference) {
            var keyReferencePair = sinon.createStubInstance(KeyReferencePair);
            keyReferencePair.getKey.returns(key);
            keyReferencePair.getReference.returns(reference);
            return keyReferencePair;
        };

        this.elementKey1 = this.factory.createString('firstEl');
        this.elementValue1 = this.factory.createString('value of first el');
        this.element1 = this.createKeyValuePair(
            this.elementKey1,
            this.elementValue1
        );
        this.elementKey2 = this.factory.createString('secondEl');
        this.elementValue2 = this.factory.createString('value of second el');
        this.element2 = this.createKeyValuePair(
            this.elementKey2,
            this.elementValue2
        );
        this.elements = [
            this.element1,
            this.element2
        ];

        this.createValue = function (valueFactory) {
            this.value = new ArrayValue(valueFactory || this.factory, this.callStack, this.elements);
        }.bind(this);
        this.createValue();
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
            var objectValue = sinon.createStubInstance(ObjectValue),
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

    describe('call()', function () {
        it('should throw when array is empty', function () {
            this.elements.length = 0;
            this.createValue();

            expect(function () {
                this.value.call([], this.namespaceScope);
            }.bind(this)).to.throw(PHPFatalError, 'Function name must be a string');
        });

        it('should throw when array has only one element', function () {
            this.elements.length = 0;
            this.elements.push(this.factory.createInteger(21));
            this.createValue();

            expect(function () {
                this.value.call([], this.namespaceScope);
            }.bind(this)).to.throw(PHPFatalError, 'Function name must be a string');
        });

        describe('for a static method call', function () {
            beforeEach(function () {
                this.classNameValue = sinon.createStubInstance(StringValue);
                this.classNameValue.getNative.returns('My\\Space\\MyClass');
                this.classNameValue.getType.returns('string');
                this.elements.length = 0;
                this.elements.push(this.classNameValue);
                this.elements.push(this.factory.createString('myStaticMethod'));
                this.createValue();
            });

            it('should ask the StringValue to call the method once', function () {
                this.value.call([], this.namespaceScope);

                expect(this.classNameValue.callStaticMethod).to.have.been.calledOnce;
                expect(this.classNameValue.callStaticMethod.args[0][0]).to.be.an.instanceOf(StringValue);
                expect(this.classNameValue.callStaticMethod.args[0][0].getNative()).to.equal('myStaticMethod');
            });

            it('should pass the args along', function () {
                this.value.call(
                    [
                        this.factory.createString('first arg'),
                        this.factory.createString('second arg')
                    ],
                    this.namespaceScope
                );

                expect(this.classNameValue.callStaticMethod).to.have.been.calledOnce;
                expect(this.classNameValue.callStaticMethod.args[0][1]).to.have.length(2);
                expect(this.classNameValue.callStaticMethod.args[0][1][0]).to.be.an.instanceOf(StringValue);
                expect(this.classNameValue.callStaticMethod.args[0][1][0].getNative()).to.equal('first arg');
                expect(this.classNameValue.callStaticMethod.args[0][1][1]).to.be.an.instanceOf(StringValue);
                expect(this.classNameValue.callStaticMethod.args[0][1][1].getNative()).to.equal('second arg');
            });

            it('should pass the NamespaceScope along', function () {
                this.value.call(
                    [
                        this.factory.createString('first arg'),
                        this.factory.createString('second arg')
                    ],
                    this.namespaceScope
                );

                expect(this.classNameValue.callStaticMethod).to.have.been.calledOnce;
                expect(this.classNameValue.callStaticMethod).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(this.namespaceScope)
                );
            });
        });

        describe('for an instance method call', function () {
            beforeEach(function () {
                this.objectValue = sinon.createStubInstance(ObjectValue);
                this.elements.length = 0;
                this.elements.push(this.objectValue);
                this.elements.push(this.factory.createString('myInstanceMethod'));
                this.createValue();
            });

            it('should ask the StringValue to call the method once', function () {
                this.value.call([], this.namespaceScope);

                expect(this.objectValue.callMethod).to.have.been.calledOnce;
                expect(this.objectValue.callMethod.args[0][0]).to.equal('myInstanceMethod');
            });

            it('should pass the args along', function () {
                this.value.call(
                    [
                        this.factory.createString('first arg'),
                        this.factory.createString('second arg')
                    ],
                    this.namespaceScope
                );

                expect(this.objectValue.callMethod).to.have.been.calledOnce;
                expect(this.objectValue.callMethod.args[0][1]).to.have.length(2);
                expect(this.objectValue.callMethod.args[0][1][0]).to.be.an.instanceOf(StringValue);
                expect(this.objectValue.callMethod.args[0][1][0].getNative()).to.equal('first arg');
                expect(this.objectValue.callMethod.args[0][1][1]).to.be.an.instanceOf(StringValue);
                expect(this.objectValue.callMethod.args[0][1][1].getNative()).to.equal('second arg');
            });

            it('should pass the NamespaceScope along', function () {
                this.value.call(
                    [
                        this.factory.createString('first arg'),
                        this.factory.createString('second arg')
                    ],
                    this.namespaceScope
                );

                expect(this.objectValue.callMethod).to.have.been.calledOnce;
                expect(this.objectValue.callMethod).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(this.namespaceScope)
                );
            });
        });
    });

    describe('coerceToObject()', function () {
        beforeEach(function () {
            this.nativeStdClassObject = {};
            this.stdClassObject = sinon.createStubInstance(ObjectValue);
            sinon.stub(this.factory, 'createStdClassObject').returns(this.stdClassObject);

            this.stdClassObject.getInstancePropertyByName.callsFake(function (nameValue) {
                var propertyRef = sinon.createStubInstance(PropertyReference);

                propertyRef.setValue.callsFake(function (value) {
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

    describe('formatAsString()', function () {
        it('should just return "Array"', function () {
            expect(this.value.formatAsString()).to.equal('Array');
        });
    });

    describe('getElementByKey()', function () {
        beforeEach(function () {
            this.elements.length = 0;
            this.elementKey1 = this.factory.createString('length');
            this.elementValue1 = this.factory.createString('value of first el');
            this.element1 = this.createKeyValuePair(
                this.elementKey1,
                this.elementValue1
            );
            this.elements.push(this.element1);

            this.elementKey2 = this.factory.createString('_length');
            this.elementValue2 = this.factory.createString('value of second el');
            this.element2 = this.createKeyValuePair(
                this.elementKey2,
                this.elementValue2
            );
            this.elements.push(this.element2);

            this.elementKey3 = this.factory.createString('__length');
            this.elementValue3 = this.factory.createString('value of third el');
            this.element3 = this.createKeyValuePair(
                this.elementKey3,
                this.elementValue3
            );
            this.elements.push(this.element3);
            this.elementKey4 = this.factory.createString('my_key');
            this.elementValue4 = this.factory.createString('value of fourth el, my_key');
            this.element4 = this.createKeyValuePair(
                this.elementKey4,
                this.elementValue4
            );
            this.elements.push(this.element4);
            this.createValue();
        });

        it('should allow fetching an element with the key "my_key"', function () {
            var element = this.value.getElementByKey(this.factory.createString('my_key'));

            expect(element.getValue().getNative()).to.equal('value of fourth el, my_key');
        });

        it('should allow fetching an element with the key "length"', function () {
            var element = this.value.getElementByKey(this.factory.createString('length'));

            expect(element.getValue().getNative()).to.equal('value of first el');
        });

        // Check that the sanitisation does not then cause collisions when the underscore is already present
        it('should allow fetching an element with the key "_length"', function () {
            var element = this.value.getElementByKey(this.factory.createString('_length'));

            expect(element.getValue().getNative()).to.equal('value of second el');
        });

        // Check that the sanitisation does not then cause collisions when the underscore is already present
        it('should allow fetching an element with the key "__length"', function () {
            var element = this.value.getElementByKey(this.factory.createString('__length'));

            expect(element.getValue().getNative()).to.equal('value of third el');
        });
    });

    describe('getElementPairByKey()', function () {
        it('should return the pair for the specified element', function () {
            var pair = this.value.getElementPairByKey(this.factory.createString('firstEl'));

            expect(pair).to.be.an.instanceOf(KeyValuePair);
            expect(pair.getKey()).to.be.an.instanceOf(StringValue);
            expect(pair.getKey().getNative()).to.equal('firstEl');
            expect(pair.getValue()).to.be.an.instanceOf(StringValue);
            expect(pair.getValue().getNative()).to.equal('value of first el');
        });

        it('should allow the key for the pair to be overridden', function () {
            var pair = this.value.getElementPairByKey(
                this.factory.createString('firstEl'),
                this.factory.createInteger(21)
            );

            expect(pair).to.be.an.instanceOf(KeyValuePair);
            expect(pair.getKey()).to.be.an.instanceOf(IntegerValue);
            expect(pair.getKey().getNative()).to.equal(21);
            expect(pair.getValue()).to.be.an.instanceOf(StringValue);
            expect(pair.getValue().getNative()).to.equal('value of first el');
        });
    });

    describe('getIterator()', function () {
        it('should return an ArrayIterator for this array', function () {
            var iterator = this.value.getIterator();

            expect(iterator).to.be.an.instanceOf(ArrayIterator);
            expect(iterator.getIteratedValue()).to.equal(this.value);
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

    describe('getProxy()', function () {
        it('should unwrap to a native array when the array has no non-numeric keys', function () {
            var result;
            this.element1.getKey.returns(this.factory.createString('1'));
            this.element2.getKey.returns(this.factory.createString('0'));
            this.value = new ArrayValue(this.factory, this.callStack, [
                this.element1,
                this.element2
            ]);

            result = this.value.getProxy();

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

            result = this.value.getProxy();

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

            result = this.value.getProxy();

            expect(result).to.be.an('array');
            expect(result).to.have.length(0);
        });
    });

    describe('getPushElement()', function () {
        it('should return an ElementReference', function () {
            expect(this.value.getPushElement()).to.be.an.instanceOf(ElementReference);
        });
    });

    describe('instantiate()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                this.value.instantiate();
            }.bind(this)).to.throw(
                PHPFatalError,
                'Class name must be a valid object or a string'
            );
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

    describe('isEmpty()', function () {
        it('should return true when the array is empty', function () {
            this.elements.length = 0;
            this.createValue();

            expect(this.value.isEmpty()).to.be.true;
        });

        it('should return false when the array is not empty', function () {
            expect(this.value.isEmpty()).to.be.false;
        });
    });

    describe('isNumeric()', function () {
        it('should return false', function () {
            expect(this.value.isNumeric()).to.be.false;
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

    describe('modulo()', function () {
        it('should always return 0 for an empty array, as it will always coerce to 0', function () {
            var result,
                rightValue = this.factory.createInteger(21);
            this.elements.length = 0;
            this.createValue();

            result = this.value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });

        it('should return 1 for a populated array when the remainder is 1', function () {
            var result,
                rightValue = this.factory.createInteger(2);
            this.createValue();

            result = this.value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });

        it('should return 0 for a populated array when there is no remainder', function () {
            var result,
                rightValue = this.factory.createInteger(1);
            this.elements.length = 1;
            this.createValue();

            result = this.value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });
    });

    describe('multiply()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var rightValue = sinon.createStubInstance(Value);

            expect(function () {
                this.value.multiply(rightValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('multiplyByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createArray([]);

            expect(function () {
                this.value.multiplyByArray(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('multiplyByBoolean()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createBoolean(true);

            expect(function () {
                this.value.multiplyByBoolean(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('multiplyByFloat()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createFloat(1.2);

            expect(function () {
                this.value.multiplyByFloat(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('multiplyByInteger()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createInteger(4);

            expect(function () {
                this.value.multiplyByInteger(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('multiplyByNull()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createNull();

            expect(function () {
                this.value.multiplyByNull(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('multiplyByObject()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createObject({});

            expect(function () {
                this.value.multiplyByObject(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
        });
    });

    describe('multiplyByString()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createString('my string value');

            expect(function () {
                this.value.multiplyByString(leftValue);
            }.bind(this)).to.throw(PHPFatalError, 'Unsupported operand types');
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

    describe('pop()', function () {
        it('should remove the last element from the array', function () {
            this.elements.unshift(this.createKeyValuePair(
                this.factory.createString('unshiftedEl'),
                this.factory.createString('value of unshifted el')
            ));
            this.createValue();

            this.value.pop();

            expect(this.value.getNative()).to.deep.equal({
                unshiftedEl: 'value of unshifted el',
                firstEl: 'value of first el'
                // secondEl should have been popped off
            });
        });

        it('should return the last element in the array', function () {
            var element = this.value.pop();

            expect(element).to.be.an.instanceOf(Value);
            expect(element.getNative()).to.equal('value of second el');
        });

        it('should return NULL when the array is empty', function () {
            var element;
            this.elements.length = 0;
            this.createValue();

            element = this.value.pop();

            expect(element).to.be.an.instanceOf(Value);
            expect(element.getType()).to.equal('null');
        });

        it('should reset the internal array pointer', function () {
            this.elements.push(
                this.createKeyValuePair(
                    this.factory.createString('another_key'),
                    this.factory.createString('another value')
                )
            );
            this.value.setPointer(2);

            this.value.pop();

            expect(this.value.getPointer()).to.equal(0);
        });
    });

    describe('push()', function () {
        it('should give the new element index 0 if the array was empty', function () {
            this.elements.length = 0;
            this.createValue();

            this.value.push(this.factory.createString('my new element'));

            expect(this.value.getNative()).to.deep.equal(['my new element']);
        });

        it('should number indexed elements separately from associative ones', function () {
            this.value.push(this.factory.createString('my new indexed element'));

            expect(this.value.getNative()).to.deep.equal({
                firstEl: 'value of first el',
                secondEl: 'value of second el',
                0: 'my new indexed element' // Use `0` and not `2`, even though some assoc. elements already exist
            });
        });
    });

    describe('pushElement()', function () {
        it('should give the new element index 0 if the array was empty', function () {
            var element = sinon.createStubInstance(ElementReference);
            element.getKey.returns(this.factory.createNull());
            element.getValue.returns(this.factory.createString('my new element'));
            element.setKey.callsFake(function (keyValue) {
                element.getKey.returns(keyValue);
            });
            this.elements.length = 0;
            this.createValue();

            this.value.pushElement(element);

            expect(this.value.getNative()).to.deep.equal(['my new element']);
        });

        it('should number indexed elements separately from associative ones', function () {
            var element = sinon.createStubInstance(ElementReference);
            element.getKey.returns(this.factory.createNull());
            element.getValue.returns(this.factory.createString('my new indexed element'));
            element.setKey.callsFake(function (keyValue) {
                element.getKey.returns(keyValue);
            });

            this.value.pushElement(element);

            expect(this.value.getNative()).to.deep.equal({
                firstEl: 'value of first el',
                secondEl: 'value of second el',
                0: 'my new indexed element' // Use `0` and not `2`, even though some assoc. elements already exist
            });
        });

        it('should return an IntegerValue with the pushed element\'s key', function () {
            var element1 = sinon.createStubInstance(ElementReference),
                element2 = sinon.createStubInstance(ElementReference),
                result;
            element1.getKey.returns(this.factory.createInteger(4));
            element2.getValue.returns(this.factory.createString('first indexed value'));
            element1.getValue.returns(this.factory.createString('second indexed value'));
            this.value.pushElement(element1);

            result = this.value.pushElement(element2);

            expect(result).to.be.an.instanceOf(IntegerValue);
            // 0 already taken by existing indexed element - but the 2 assoc. elements aren't counted
            expect(result.getNative()).to.equal(1);
        });
    });

    describe('shift()', function () {
        it('should return the first element of the array', function () {
            expect(this.value.shift()).to.equal(this.elementValue1);
        });

        it('should return null if the array is empty', function () {
            this.elements.length = 0;
            this.createValue();

            expect(this.value.shift().getNative()).to.be.null;
        });

        it('should remove the first element from the array', function () {
            this.value.shift();

            expect(this.value.getLength()).to.equal(1);
        });

        it('should reset the internal pointer to the start of the array', function () {
            this.value.setPointer(1);

            this.value.shift();

            expect(this.value.getPointer()).to.equal(0);
        });
    });

    describe('when created with a reference used for an element', function () {
        beforeEach(function () {
            this.element3Reference = sinon.createStubInstance(VariableReference);
            this.element3Reference.getValue.returns(this.factory.createInteger(21));
            this.element3 = this.createKeyReferencePair(
                this.factory.createString('thirdEl'),
                this.element3Reference
            );
        });

        it('should set the reference for the element', function () {
            this.value = new ArrayValue(this.factory, this.callStack, [
                this.element1,
                this.element2,
                this.element3
            ]);

            expect(this.value.getElementByIndex(2).getValue().getNative()).to.equal(21);
        });
    });
});
