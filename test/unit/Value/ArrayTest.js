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
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    ElementProvider = require('../../../src/Reference/Element/ElementProvider'),
    ElementReference = require('../../../src/Reference/Element'),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    KeyReferencePair = require('../../../src/KeyReferencePair'),
    KeyValuePair = require('../../../src/KeyValuePair'),
    MethodSpec = require('../../../src/MethodSpec'),
    Namespace = require('../../../src/Namespace').sync(),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PropertyReference = require('../../../src/Reference/Property'),
    Reference = require('../../../src/Reference/Reference'),
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Array', function () {
    var callStack,
        createKeyReferencePair,
        createKeyValuePair,
        createValue,
        element1,
        element2,
        elements,
        elementKey1,
        elementKey2,
        elementProvider,
        elementValue1,
        elementValue2,
        factory,
        globalNamespace,
        namespaceScope,
        value;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        elementProvider = new ElementProvider();
        factory = new ValueFactory();
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        globalNamespace = sinon.createStubInstance(Namespace);
        namespaceScope.getGlobalNamespace.returns(globalNamespace);

        createKeyValuePair = function (key, value) {
            var keyValuePair = sinon.createStubInstance(KeyValuePair);
            keyValuePair.getKey.returns(key);
            keyValuePair.getValue.returns(value);
            return keyValuePair;
        };
        createKeyReferencePair = function (key, reference) {
            var keyReferencePair = sinon.createStubInstance(KeyReferencePair);
            keyReferencePair.getKey.returns(key);
            keyReferencePair.getReference.returns(reference);
            return keyReferencePair;
        };

        elementKey1 = factory.createString('firstEl');
        elementValue1 = factory.createString('value of first el');
        element1 = createKeyValuePair(
            elementKey1,
            elementValue1
        );
        elementKey2 = factory.createString('secondEl');
        elementValue2 = factory.createString('value of second el');
        element2 = createKeyValuePair(
            elementKey2,
            elementValue2
        );
        elements = [
            element1,
            element2
        ];

        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        createValue = function (valueFactory) {
            value = new ArrayValue(
                valueFactory || factory,
                callStack,
                elements,
                null,
                elementProvider
            );
        };
        createValue();
    });

    describe('addToArray() - adding an array to another array', function () {
        var leftElement1,
            leftElement2,
            leftValue;

        beforeEach(function () {
            leftElement1 = createKeyValuePair(
                factory.createString('firstEl'),
                factory.createString('value of left first el')
            );
            leftElement2 = createKeyValuePair(
                factory.createString('leftSecondEl'),
                factory.createString('value of left second el')
            );

            leftValue = new ArrayValue(factory, callStack, [
                leftElement1,
                leftElement2
            ], null, elementProvider);
        });

        it('should return an array', function () {
            expect(value.addToArray(leftValue)).to.be.an.instanceOf(ArrayValue);
        });

        it('should return a different array to the left operand', function () {
            expect(value.addToArray(leftValue)).not.to.equal(leftValue);
        });

        it('should prefer elements from left array over elements from right array', function () {
            var result = value.addToArray(leftValue);

            expect(result.getNative().firstEl).to.equal('value of left first el');
            expect(result.getNative().secondEl).to.equal('value of second el');
            expect(result.getNative().leftSecondEl).to.equal('value of left second el');
        });
    });

    describe('addToBoolean() - adding an array to a boolean', function () {
        it('should throw an "Unsupported operand" error', function () {
            var booleanValue = factory.createBoolean(true);

            expect(function () {
                value.addToBoolean(booleanValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('addToFloat() - adding an array to a float', function () {
        it('should throw an "Unsupported operand" error', function () {
            var floatValue = factory.createFloat(1.2);

            expect(function () {
                value.addToFloat(floatValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('addToInteger() - adding an array to an integer', function () {
        it('should throw an "Unsupported operand" error', function () {
            var integerValue = factory.createInteger(4);

            expect(function () {
                value.addToInteger(integerValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('addToNull() - adding an array to null', function () {
        it('should throw an "Unsupported operand" error', function () {
            var nullValue = factory.createNull();

            expect(function () {
                value.addToNull(nullValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('addToObject() - adding an array to an object', function () {
        it('should hand off to ObjectValue.addToArray(...)', function () {
            var objectValue = sinon.createStubInstance(ObjectValue),
                result = {};
            objectValue.addToArray.withArgs(value).returns(result);

            expect(value.addToObject(objectValue)).to.equal(result);
        });
    });

    describe('addToString() - adding an array to a string', function () {
        it('should throw an "Unsupported operand" error', function () {
            var stringValue = factory.createString('My string value');

            expect(function () {
                value.addToString(stringValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('call()', function () {
        it('should throw when array is empty', function () {
            elements.length = 0;
            createValue();

            expect(function () {
                value.call([], namespaceScope);
            }).to.throw(
                'Fake PHP Fatal error for #core.function_name_must_be_string with {}'
            );
        });

        it('should throw when array has only one element', function () {
            elements.length = 0;
            elements.push(factory.createInteger(21));
            createValue();

            expect(function () {
                value.call([], namespaceScope);
            }).to.throw(
                'Fake PHP Fatal error for #core.function_name_must_be_string with {}'
            );
        });

        describe('for a static method call', function () {
            var classNameValue;

            beforeEach(function () {
                classNameValue = sinon.createStubInstance(StringValue);
                classNameValue.getNative.returns('My\\Space\\MyClass');
                classNameValue.getType.returns('string');
                elements.length = 0;
                elements.push(classNameValue);
                elements.push(factory.createString('myStaticMethod'));
                createValue();
            });

            it('should ask the StringValue to call the method once', function () {
                value.call([], namespaceScope);

                expect(classNameValue.callStaticMethod).to.have.been.calledOnce;
                expect(classNameValue.callStaticMethod.args[0][0]).to.be.an.instanceOf(StringValue);
                expect(classNameValue.callStaticMethod.args[0][0].getNative()).to.equal('myStaticMethod');
            });

            it('should pass the args along', function () {
                value.call(
                    [
                        factory.createString('first arg'),
                        factory.createString('second arg')
                    ],
                    namespaceScope
                );

                expect(classNameValue.callStaticMethod).to.have.been.calledOnce;
                expect(classNameValue.callStaticMethod.args[0][1]).to.have.length(2);
                expect(classNameValue.callStaticMethod.args[0][1][0]).to.be.an.instanceOf(StringValue);
                expect(classNameValue.callStaticMethod.args[0][1][0].getNative()).to.equal('first arg');
                expect(classNameValue.callStaticMethod.args[0][1][1]).to.be.an.instanceOf(StringValue);
                expect(classNameValue.callStaticMethod.args[0][1][1].getNative()).to.equal('second arg');
            });

            it('should pass the NamespaceScope along', function () {
                value.call(
                    [
                        factory.createString('first arg'),
                        factory.createString('second arg')
                    ],
                    namespaceScope
                );

                expect(classNameValue.callStaticMethod).to.have.been.calledOnce;
                expect(classNameValue.callStaticMethod).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(namespaceScope)
                );
            });
        });

        describe('for an instance method call', function () {
            var objectValue;

            beforeEach(function () {
                objectValue = sinon.createStubInstance(ObjectValue);
                elements.length = 0;
                elements.push(objectValue);
                elements.push(factory.createString('myInstanceMethod'));
                createValue();
            });

            it('should ask the StringValue to call the method once', function () {
                value.call([], namespaceScope);

                expect(objectValue.callMethod).to.have.been.calledOnce;
                expect(objectValue.callMethod.args[0][0]).to.equal('myInstanceMethod');
            });

            it('should pass the args along', function () {
                value.call(
                    [
                        factory.createString('first arg'),
                        factory.createString('second arg')
                    ],
                    namespaceScope
                );

                expect(objectValue.callMethod).to.have.been.calledOnce;
                expect(objectValue.callMethod.args[0][1]).to.have.length(2);
                expect(objectValue.callMethod.args[0][1][0]).to.be.an.instanceOf(StringValue);
                expect(objectValue.callMethod.args[0][1][0].getNative()).to.equal('first arg');
                expect(objectValue.callMethod.args[0][1][1]).to.be.an.instanceOf(StringValue);
                expect(objectValue.callMethod.args[0][1][1].getNative()).to.equal('second arg');
            });

            it('should pass the NamespaceScope along', function () {
                value.call(
                    [
                        factory.createString('first arg'),
                        factory.createString('second arg')
                    ],
                    namespaceScope
                );

                expect(objectValue.callMethod).to.have.been.calledOnce;
                expect(objectValue.callMethod).to.have.been.calledWith(
                    sinon.match.any,
                    sinon.match.any,
                    sinon.match.same(namespaceScope)
                );
            });
        });
    });

    describe('callMethod()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                value.callMethod('myMethod', [factory.createString('my arg')]);
            }).to.throw(
                'Fake PHP Fatal error for #core.non_object_method_call with {"name":"myMethod","type":"array"}'
            );
        });
    });

    describe('callStaticMethod()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                value.callStaticMethod(
                    factory.createString('myMethod'),
                    [factory.createString('my arg')]
                );
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('clone()', function () {
        it('should raise an error', function () {
            expect(function () {
                value.clone();
            }).to.throw(
                'Fake PHP Fatal error for #core.method_called_on_non_object with {"method":"__clone"}'
            );
        });
    });

    describe('coerceToNativeError()', function () {
        it('should throw an error as this is invalid', function () {
            expect(function () {
                value.coerceToNativeError();
            }).to.throw(
                'Only instances of Throwable may be thrown: tried to throw a(n) array'
            );
        });
    });

    describe('coerceToObject()', function () {
        var nativeStdClassObject,
            stdClassObject;

        beforeEach(function () {
            nativeStdClassObject = {};
            stdClassObject = sinon.createStubInstance(ObjectValue);
            sinon.stub(factory, 'createStdClassObject').returns(stdClassObject);

            stdClassObject.getInstancePropertyByName.callsFake(function (nameValue) {
                var propertyRef = sinon.createStubInstance(PropertyReference);

                propertyRef.setValue.callsFake(function (value) {
                    nativeStdClassObject[nameValue.getNative()] = value.getNative();
                });

                return propertyRef;
            });
        });

        it('should return an ObjectValue wrapping the created stdClass instance', function () {
            var coercedValue = value.coerceToObject();

            expect(coercedValue).to.equal(stdClassObject);
        });

        it('should store the array elements as properties of the stdClass object', function () {
            value.coerceToObject();

            expect(nativeStdClassObject.firstEl).to.equal('value of first el');
            expect(nativeStdClassObject.secondEl).to.equal('value of second el');
        });
    });

    describe('divide()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var rightValue = sinon.createStubInstance(Value);

            expect(function () {
                value.divide(rightValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('divideByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createArray([]);

            expect(function () {
                value.divideByArray(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('divideByBoolean()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createBoolean(true);

            expect(function () {
                value.divideByBoolean(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('divideByFloat()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createFloat(1.2);

            expect(function () {
                value.divideByFloat(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('divideByInteger()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createInteger(4);

            expect(function () {
                value.divideByInteger(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('divideByNonArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createInteger(21);

            expect(function () {
                value.divideByNonArray(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('divideByNull()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createNull();

            expect(function () {
                value.divideByNull(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('divideByObject()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createObject({});

            expect(function () {
                value.divideByObject(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('divideByString()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createString('my string value');

            expect(function () {
                value.divideByString(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('formatAsString()', function () {
        it('should just return "Array"', function () {
            expect(value.formatAsString()).to.equal('Array');
        });
    });

    describe('getConstantByName()', function () {
        it('should throw a "Class name must be a valid object or a string" error', function () {
            expect(function () {
                value.getConstantByName('MY_CONST', namespaceScope);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('getDisplayType()', function () {
        it('should return the value type', function () {
            expect(value.getDisplayType()).to.equal('array');
        });
    });

    describe('getElementByKey()', function () {
        var element3,
            element4,
            elementKey3,
            elementKey4,
            elementValue3,
            elementValue4;

        beforeEach(function () {
            elements.length = 0;
            elementKey1 = factory.createString('length');
            elementValue1 = factory.createString('value of first el');
            element1 = createKeyValuePair(
                elementKey1,
                elementValue1
            );
            elements.push(element1);

            elementKey2 = factory.createString('_length');
            elementValue2 = factory.createString('value of second el');
            element2 = createKeyValuePair(
                elementKey2,
                elementValue2
            );
            elements.push(element2);

            elementKey3 = factory.createString('__length');
            elementValue3 = factory.createString('value of third el');
            element3 = createKeyValuePair(
                elementKey3,
                elementValue3
            );
            elements.push(element3);
            elementKey4 = factory.createString('my_key');
            elementValue4 = factory.createString('value of fourth el, my_key');
            element4 = createKeyValuePair(
                elementKey4,
                elementValue4
            );
            elements.push(element4);
            createValue();
        });

        it('should allow fetching an element with the key "my_key"', function () {
            var element = value.getElementByKey(factory.createString('my_key'));

            expect(element.getValue().getNative()).to.equal('value of fourth el, my_key');
        });

        it('should allow fetching an element with the key "length"', function () {
            var element = value.getElementByKey(factory.createString('length'));

            expect(element.getValue().getNative()).to.equal('value of first el');
        });

        // Check that the sanitisation does not then cause collisions when the underscore is already present
        it('should allow fetching an element with the key "_length"', function () {
            var element = value.getElementByKey(factory.createString('_length'));

            expect(element.getValue().getNative()).to.equal('value of second el');
        });

        // Check that the sanitisation does not then cause collisions when the underscore is already present
        it('should allow fetching an element with the key "__length"', function () {
            var element = value.getElementByKey(factory.createString('__length'));

            expect(element.getValue().getNative()).to.equal('value of third el');
        });
    });

    describe('getElementPairByKey()', function () {
        it('should return the pair for the specified element', function () {
            var pair = value.getElementPairByKey(factory.createString('firstEl'));

            expect(pair).to.be.an.instanceOf(KeyValuePair);
            expect(pair.getKey()).to.be.an.instanceOf(StringValue);
            expect(pair.getKey().getNative()).to.equal('firstEl');
            expect(pair.getValue()).to.be.an.instanceOf(StringValue);
            expect(pair.getValue().getNative()).to.equal('value of first el');
        });

        it('should allow the key for the pair to be overridden', function () {
            var pair = value.getElementPairByKey(
                factory.createString('firstEl'),
                factory.createInteger(21)
            );

            expect(pair).to.be.an.instanceOf(KeyValuePair);
            expect(pair.getKey()).to.be.an.instanceOf(IntegerValue);
            expect(pair.getKey().getNative()).to.equal(21);
            expect(pair.getValue()).to.be.an.instanceOf(StringValue);
            expect(pair.getValue().getNative()).to.equal('value of first el');
        });
    });

    describe('getForAssignment()', function () {
        it('should return a copy of the array', function () {
            var cloneValue = value.getForAssignment();

            expect(cloneValue).to.not.equal(value);
            expect(cloneValue.getNative()).to.deep.equal(value.getNative());
        });

        it('should perform a shallow copy of non-array descendants', function () {
            var cloneValue,
                elementKey3 = factory.createString('secondEl'),
                elementValue3 = sinon.createStubInstance(ObjectValue),
                element3 = createKeyValuePair(
                    elementKey3,
                    elementValue3
                );
            elementValue3.getForAssignment.returns(elementValue3);
            elements.push(element3);
            createValue();

            cloneValue = value.getForAssignment();

            expect(cloneValue.getElementByKey(elementKey3).getValue()).to.equal(elementValue3);
        });
    });

    describe('getIterator()', function () {
        it('should return an ArrayIterator for this array', function () {
            var iterator = value.getIterator();

            expect(iterator).to.be.an.instanceOf(ArrayIterator);
            expect(iterator.getIteratedValue()).to.equal(value);
        });
    });

    describe('getNative()', function () {
        it('should unwrap to a native array when the array has no non-numeric keys', function () {
            var result;
            element1.getKey.returns(factory.createString('1'));
            element2.getKey.returns(factory.createString('0'));
            value = new ArrayValue(factory, callStack, [
                element1,
                element2
            ], null, elementProvider);

            result = value.getNative();

            expect(result).to.be.an('array');
            expect(result).to.deep.equal(['value of second el', 'value of first el']);
        });

        it('should unwrap to a plain object when the array has a non-numeric key', function () {
            var result;
            element1.getKey.returns(factory.createString('nonNumeric'));
            element2.getKey.returns(factory.createString('7'));
            value = new ArrayValue(factory, callStack, [
                element1,
                element2
            ], null, elementProvider);

            result = value.getNative();

            expect(result).to.be.an('object');
            expect(result).not.to.be.an('array');
            expect(result).to.deep.equal({
                nonNumeric: 'value of first el',
                7: 'value of second el'
            });
        });

        it('should unwrap to a native array when the array is empty', function () {
            var result;
            value = new ArrayValue(factory, callStack, [], null, elementProvider);

            result = value.getNative();

            expect(result).to.be.an('array');
            expect(result).to.have.length(0);
        });
    });

    describe('getProxy()', function () {
        it('should unwrap to a native array when the array has no non-numeric keys', function () {
            var result;
            element1.getKey.returns(factory.createString('1'));
            element2.getKey.returns(factory.createString('0'));
            value = new ArrayValue(factory, callStack, [
                element1,
                element2
            ], null, elementProvider);

            result = value.getProxy();

            expect(result).to.be.an('array');
            expect(result).to.deep.equal(['value of second el', 'value of first el']);
        });

        it('should unwrap to a plain object when the array has a non-numeric key', function () {
            var result;
            element1.getKey.returns(factory.createString('nonNumeric'));
            element2.getKey.returns(factory.createString('7'));
            value = new ArrayValue(factory, callStack, [
                element1,
                element2
            ], null, elementProvider);

            result = value.getProxy();

            expect(result).to.be.an('object');
            expect(result).not.to.be.an('array');
            expect(result).to.deep.equal({
                nonNumeric: 'value of first el',
                7: 'value of second el'
            });
        });

        it('should unwrap to a native array when the array is empty', function () {
            var result;
            value = new ArrayValue(factory, callStack, [], null, elementProvider);

            result = value.getProxy();

            expect(result).to.be.an('array');
            expect(result).to.have.length(0);
        });
    });

    describe('getPushElement()', function () {
        it('should return an ElementReference', function () {
            expect(value.getPushElement()).to.be.an.instanceOf(ElementReference);
        });
    });

    describe('getReference()', function () {
        it('should throw an error', function () {
            expect(function () {
                value.getReference();
            }).to.throw('Cannot get a reference to a value');
        });
    });

    describe('getStaticPropertyByName()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                value.getStaticPropertyByName(factory.createString('myProp'), namespaceScope);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('getValueOrNull()', function () {
        it('should just return this value, as values are always classed as "defined"', function () {
            expect(value.getValueOrNull()).to.equal(value);
        });
    });

    describe('instantiate()', function () {
        it('should raise a fatal error', function () {
            expect(function () {
                value.instantiate();
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isAnInstanceOf()', function () {
        it('should hand off to the right-hand operand to determine the result', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.isTheClassOfArray.withArgs(value).returns(result);

            expect(value.isAnInstanceOf(rightOperand)).to.equal(result);
        });
    });

    describe('isCallable()', function () {
        it('should return true for a valid instance method name of a given object', function () {
            var classObject = sinon.createStubInstance(Class),
                methodSpec = sinon.createStubInstance(MethodSpec),
                objectValue = sinon.createStubInstance(ObjectValue);
            objectValue.getClass.returns(classObject);
            objectValue.getType.returns('object');
            classObject.getMethodSpec
                .withArgs('myStaticMethod')
                .returns(methodSpec);
            globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(true);
            globalNamespace.getClass
                .withArgs('My\\Fqcn')
                .returns(classObject);
            elements[0] = createKeyValuePair(
                elementKey2,
                objectValue
            );
            elements[1] = createKeyValuePair(
                elementKey2,
                factory.createString('myStaticMethod')
            );
            createValue();

            expect(value.isCallable(namespaceScope)).to.be.true;
        });

        it('should return true for a valid static method name of a given class', function () {
            var classObject = sinon.createStubInstance(Class),
                methodSpec = sinon.createStubInstance(MethodSpec);
            classObject.getMethodSpec
                .withArgs('myStaticMethod')
                .returns(methodSpec);
            globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(true);
            globalNamespace.getClass
                .withArgs('My\\Fqcn')
                .returns(classObject);
            elements[0] = createKeyValuePair(
                elementKey2,
                factory.createString('My\\Fqcn')
            );
            elements[1] = createKeyValuePair(
                elementKey2,
                factory.createString('myStaticMethod')
            );
            createValue();

            expect(value.isCallable(namespaceScope)).to.be.true;
        });

        it('should return false for an empty array', function () {
            elements.length = 0;
            createValue();

            expect(value.isCallable(namespaceScope)).to.be.false;
        });

        it('should return false for an array with one element', function () {
            elements.length = 1;
            createValue();

            expect(value.isCallable(namespaceScope)).to.be.false;
        });

        it('should return false for an array with a non-string second element', function () {
            elements[1] = createKeyValuePair(
                elementKey2,
                factory.createInteger(21)
            );

            expect(value.isCallable(namespaceScope)).to.be.false;
        });

        it('should return false for a non-existent class', function () {
            globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(false);
            elements[0] = createKeyValuePair(
                elementKey2,
                factory.createString('My\\NonExistentFqcn')
            );
            elements[1] = createKeyValuePair(
                elementKey2,
                factory.createString('myStaticMethod')
            );
            createValue();

            expect(value.isCallable(namespaceScope)).to.be.false;
        });

        it('should return false for a non-existent instance method', function () {
            var classObject = sinon.createStubInstance(Class),
                objectValue = sinon.createStubInstance(ObjectValue);
            objectValue.getClass.returns(classObject);
            objectValue.getType.returns('object');
            classObject.getMethodSpec
                .withArgs('myNonExistentStaticMethod')
                .returns(null);
            globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(true);
            globalNamespace.getClass
                .withArgs('My\\Fqcn')
                .returns(classObject);
            elements[0] = createKeyValuePair(
                elementKey2,
                objectValue
            );
            elements[1] = createKeyValuePair(
                elementKey2,
                factory.createString('myNonExistentStaticMethod')
            );
            createValue();

            expect(value.isCallable(namespaceScope)).to.be.false;
        });

        it('should return true for a non-existent static method', function () {
            var classObject = sinon.createStubInstance(Class);
            classObject.getMethodSpec
                .withArgs('myNonExistentStaticMethod')
                .returns(null);
            globalNamespace.hasClass
                .withArgs('My\\Fqcn')
                .returns(true);
            globalNamespace.getClass
                .withArgs('My\\Fqcn')
                .returns(classObject);
            elements[0] = createKeyValuePair(
                elementKey2,
                factory.createString('My\\Fqcn')
            );
            elements[1] = createKeyValuePair(
                elementKey2,
                factory.createString('myNonExistentStaticMethod')
            );
            createValue();

            expect(value.isCallable(namespaceScope)).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true when the array is empty', function () {
            elements.length = 0;
            createValue();

            expect(value.isEmpty()).to.be.true;
        });

        it('should return false when the array is not empty', function () {
            expect(value.isEmpty()).to.be.false;
        });
    });

    describe('isIterable()', function () {
        it('should return true', function () {
            expect(value.isIterable()).to.be.true;
        });
    });

    describe('isNumeric()', function () {
        it('should return false', function () {
            expect(value.isNumeric()).to.be.false;
        });
    });

    describe('isTheClassOfArray()', function () {
        it('should raise a fatal error', function () {
            var classValue = sinon.createStubInstance(ArrayValue);

            expect(function () {
                value.isTheClassOfArray(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfBoolean()', function () {
        it('should raise a fatal error', function () {
            var classValue = factory.createBoolean(true);

            expect(function () {
                value.isTheClassOfBoolean(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfFloat()', function () {
        it('should raise a fatal error', function () {
            var classValue = factory.createFloat(22.4);

            expect(function () {
                value.isTheClassOfFloat(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfInteger()', function () {
        it('should raise a fatal error', function () {
            var classValue = factory.createInteger(21);

            expect(function () {
                value.isTheClassOfInteger(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfNull()', function () {
        it('should raise a fatal error', function () {
            var classValue = factory.createNull();

            expect(function () {
                value.isTheClassOfNull(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfObject()', function () {
        it('should raise a fatal error', function () {
            var classValue = factory.createObject({});

            expect(function () {
                value.isTheClassOfObject(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('isTheClassOfString()', function () {
        it('should raise a fatal error', function () {
            var classValue = factory.createString('a string');

            expect(function () {
                value.isTheClassOfString(classValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.class_name_not_valid with {}'
            );
        });
    });

    describe('modulo()', function () {
        it('should always return 0 for an empty array, as it will always coerce to 0', function () {
            var result,
                rightValue = factory.createInteger(21);
            elements.length = 0;
            createValue();

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });

        it('should return 1 for a populated array when the remainder is 1', function () {
            var result,
                rightValue = factory.createInteger(2);
            createValue();

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });

        it('should return 0 for a populated array when there is no remainder', function () {
            var result,
                rightValue = factory.createInteger(1);
            elements.length = 1;
            createValue();

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });
    });

    describe('multiply()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var rightValue = sinon.createStubInstance(Value);

            expect(function () {
                value.multiply(rightValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('multiplyByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createArray([]);

            expect(function () {
                value.multiplyByArray(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('multiplyByBoolean()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createBoolean(true);

            expect(function () {
                value.multiplyByBoolean(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('multiplyByFloat()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createFloat(1.2);

            expect(function () {
                value.multiplyByFloat(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('multiplyByInteger()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createInteger(4);

            expect(function () {
                value.multiplyByInteger(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('multiplyByNull()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createNull();

            expect(function () {
                value.multiplyByNull(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('multiplyByObject()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createObject({});

            expect(function () {
                value.multiplyByObject(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('multiplyByString()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createString('my string value');

            expect(function () {
                value.multiplyByString(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('onesComplement()', function () {
        it('should throw an "Unsupported operand" error', function () {
            expect(function () {
                value.onesComplement();
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('pointToElement()', function () {
        it('should set the pointer to the index of the key in the array', function () {
            var element = sinon.createStubInstance(ElementReference);
            element.getKey.returns(factory.createString('secondEl'));

            value.pointToElement(element);

            expect(value.getPointer()).to.equal(1);
        });
    });

    describe('pop()', function () {
        it('should remove the last element from the array', function () {
            elements.unshift(createKeyValuePair(
                factory.createString('unshiftedEl'),
                factory.createString('value of unshifted el')
            ));
            createValue();

            value.pop();

            expect(value.getNative()).to.deep.equal({
                unshiftedEl: 'value of unshifted el',
                firstEl: 'value of first el'
                // secondEl should have been popped off
            });
        });

        it('should return the last element in the array', function () {
            var element = value.pop();

            expect(element).to.be.an.instanceOf(Value);
            expect(element.getNative()).to.equal('value of second el');
        });

        it('should return NULL when the array is empty', function () {
            var element;
            elements.length = 0;
            createValue();

            element = value.pop();

            expect(element).to.be.an.instanceOf(Value);
            expect(element.getType()).to.equal('null');
        });

        it('should reset the internal array pointer', function () {
            elements.push(
                createKeyValuePair(
                    factory.createString('another_key'),
                    factory.createString('another value')
                )
            );
            value.setPointer(2);

            value.pop();

            expect(value.getPointer()).to.equal(0);
        });
    });

    describe('push()', function () {
        it('should give the new element index 0 if the array was empty', function () {
            elements.length = 0;
            createValue();

            value.push(factory.createString('my new element'));

            expect(value.getNative()).to.deep.equal(['my new element']);
        });

        it('should number indexed elements separately from associative ones', function () {
            value.push(factory.createString('my new indexed element'));

            expect(value.getNative()).to.deep.equal({
                firstEl: 'value of first el',
                secondEl: 'value of second el',
                0: 'my new indexed element' // Use `0` and not `2`, even though some assoc. elements already exist
            });
        });
    });

    describe('pushElement()', function () {
        it('should give the new element index 0 if the array was empty', function () {
            var element = sinon.createStubInstance(ElementReference);
            element.getKey.returns(factory.createNull());
            element.getValue.returns(factory.createString('my new element'));
            element.setKey.callsFake(function (keyValue) {
                element.getKey.returns(keyValue);
            });
            elements.length = 0;
            createValue();

            value.pushElement(element);

            expect(value.getNative()).to.deep.equal(['my new element']);
        });

        it('should number indexed elements separately from associative ones', function () {
            var element = sinon.createStubInstance(ElementReference);
            element.getKey.returns(factory.createNull());
            element.getValue.returns(factory.createString('my new indexed element'));
            element.setKey.callsFake(function (keyValue) {
                element.getKey.returns(keyValue);
            });

            value.pushElement(element);

            expect(value.getNative()).to.deep.equal({
                firstEl: 'value of first el',
                secondEl: 'value of second el',
                0: 'my new indexed element' // Use `0` and not `2`, even though some assoc. elements already exist
            });
        });

        it('should return an IntegerValue with the pushed element\'s key', function () {
            var element1 = sinon.createStubInstance(ElementReference),
                element2 = sinon.createStubInstance(ElementReference),
                result;
            element1.getKey.returns(factory.createInteger(4));
            element2.getValue.returns(factory.createString('first indexed value'));
            element1.getValue.returns(factory.createString('second indexed value'));
            value.pushElement(element1);

            result = value.pushElement(element2);

            expect(result).to.be.an.instanceOf(IntegerValue);
            // 0 already taken by existing indexed element - but the 2 assoc. elements aren't counted
            expect(result.getNative()).to.equal(1);
        });
    });

    describe('shift()', function () {
        it('should return the first element of the array', function () {
            expect(value.shift()).to.equal(elementValue1);
        });

        it('should return null if the array is empty', function () {
            elements.length = 0;
            createValue();

            expect(value.shift().getNative()).to.be.null;
        });

        it('should remove the first element from the array', function () {
            value.shift();

            expect(value.getLength()).to.equal(1);
        });

        it('should reset the internal pointer to the start of the array', function () {
            value.setPointer(1);

            value.shift();

            expect(value.getPointer()).to.equal(0);
        });
    });

    describe('subtractFromNull() - subtracting an array from null', function () {
        it('should throw an "Unsupported operand" error', function () {
            expect(function () {
                value.subtractFromNull();
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('when created with a reference used for an element', function () {
        var element3,
            element3Reference;

        beforeEach(function () {
            element3Reference = sinon.createStubInstance(Reference);
            element3Reference.getValue.returns(factory.createInteger(21));
            element3 = createKeyReferencePair(
                factory.createString('thirdEl'),
                element3Reference
            );
        });

        it('should set the reference for the element', function () {
            value = new ArrayValue(factory, callStack, [
                element1,
                element2,
                element3
            ], null, elementProvider);

            expect(value.getElementByIndex(2).getValue().getNative()).to.equal(21);
        });
    });
});
