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
    BarewordStringValue = require('../../../src/Value/BarewordString').sync(),
    BooleanValue = require('../../../src/Value/Boolean').sync(),
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    KeyValuePair = require('../../../src/KeyValuePair'),
    Namespace = require('../../../src/Namespace').sync(),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('BarewordString', function () {
    var callStack,
        createKeyValuePair,
        createValue,
        factory,
        namespaceScope,
        value;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        factory = new ValueFactory();
        namespaceScope = sinon.createStubInstance(NamespaceScope);

        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        createKeyValuePair = function (key, value) {
            var keyValuePair = sinon.createStubInstance(KeyValuePair);
            keyValuePair.getKey.returns(key);
            keyValuePair.getValue.returns(value);
            return keyValuePair;
        };

        createValue = function (nativeValue) {
            value = new BarewordStringValue(factory, callStack, nativeValue);
        };
    });

    describe('addToArray()', function () {
        it('should raise a fatal error', function () {
            createValue('mybarewordstring');

            expect(function () {
                value.addToArray(factory.createArray([]));
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('call()', function () {
        it('should call the function and return its result', function () {
            var argValue = sinon.createStubInstance(Value),
                result,
                resultValue = sinon.createStubInstance(Value),
                func = sinon.stub().returns(resultValue);
            namespaceScope.getFunction.withArgs('This\\SubSpace\\my_function').returns(func);
            createValue('This\\SubSpace\\my_function');

            result = value.call([argValue], namespaceScope);

            expect(result).to.equal(resultValue);
            expect(func).to.have.been.calledOnce;
            expect(func).to.have.been.calledOn(null);
            expect(func).to.have.been.calledWith(sinon.match.same(argValue));
        });
    });

    describe('callMethod()', function () {
        it('should throw, as instance methods cannot exist on non-objects', function () {
            createValue('something');

            expect(function () {
                value.callMethod('aMethod', [], namespaceScope);
            }).to.throw(
                'Fake PHP Fatal error for #core.non_object_method_call with {"name":"aMethod","type":"string"}'
            );
        });
    });

    describe('callStaticMethod()', function () {
        it('should ask the class to call the method and return its result when non-forwarding', function () {
            var argValue = sinon.createStubInstance(Value),
                classObject = sinon.createStubInstance(Class),
                methodNameValue = factory.createString('myMethod'),
                result,
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(resultValue);
            namespaceScope.getClass.withArgs('My\\Space\\MyClass').returns(classObject);
            createValue('My\\Space\\MyClass');

            result = value.callStaticMethod(methodNameValue, [argValue], namespaceScope, false);

            expect(result).to.equal(resultValue);
            expect(classObject.callMethod).to.have.been.calledOnce;
            expect(classObject.callMethod).to.have.been.calledWith(
                'myMethod',
                [sinon.match.same(argValue)],
                null,
                null,
                null,
                false
            );
        });

        it('should ask the class to call the method and return its result when forwarding', function () {
            var argValue = sinon.createStubInstance(Value),
                classObject = sinon.createStubInstance(Class),
                methodNameValue = factory.createString('myMethod'),
                result,
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(resultValue);
            namespaceScope.getClass.withArgs('My\\Space\\MyClass').returns(classObject);
            createValue('My\\Space\\MyClass');

            result = value.callStaticMethod(methodNameValue, [argValue], namespaceScope, true);

            expect(result).to.equal(resultValue);
            expect(classObject.callMethod).to.have.been.calledOnce;
            expect(classObject.callMethod).to.have.been.calledWith(
                'myMethod',
                [sinon.match.same(argValue)],
                null,
                null,
                null,
                true
            );
        });
    });

    describe('coerceToNativeError()', function () {
        it('should throw an error as this is invalid', function () {
            createValue('mybarewordstring');

            expect(function () {
                value.coerceToNativeError();
            }).to.throw(
                'Only instances of Throwable may be thrown: tried to throw a(n) string'
            );
        });
    });

    describe('divide()', function () {
        it('should hand off to the right-hand operand to divide by this string', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            createValue('mybarewordstring');
            rightOperand.divideByString.withArgs(value).returns(result);

            expect(value.divide(rightOperand)).to.equal(result);
        });
    });

    describe('divideByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = factory.createArray([]);
            createValue('mybarewordstring');

            expect(function () {
                value.divideByArray(leftValue);
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('getCallableName()', function () {
        var namespace;

        beforeEach(function () {
            namespace = sinon.createStubInstance(Namespace);
            namespace.getPrefix.returns('Full\\Path\\To\\Mine\\');
            namespaceScope.resolveClass.withArgs('Mine\\MyClass').returns({
                namespace: namespace,
                name: 'MyClass'
            });
        });

        it('should return the resolved FQCN', function () {
            createValue('Mine\\MyClass');

            expect(value.getCallableName(namespaceScope)).to.equal('Full\\Path\\To\\Mine\\MyClass');
        });
    });

    describe('getConstantByName()', function () {
        it('should fetch the constant from the class', function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue = sinon.createStubInstance(Value);
            namespaceScope.getClass.withArgs('This\\SubSpace\\MyClass').returns(classObject);
            classObject.getConstantByName.withArgs('MY_CONST').returns(resultValue);
            createValue('This\\SubSpace\\MyClass');

            expect(value.getConstantByName('MY_CONST', namespaceScope)).to.equal(resultValue);
        });
    });

    describe('getDisplayType()', function () {
        it('should return the value type', function () {
            createValue('mybarewordstring');

            expect(value.getDisplayType()).to.equal('string');
        });
    });

    describe('getReference()', function () {
        it('should throw an error', function () {
            createValue('mybarewordstring');

            expect(function () {
                value.getReference();
            }).to.throw('Cannot get a reference to a value');
        });
    });

    describe('getStaticPropertyByName()', function () {
        it('should fetch the property\'s value from the class', function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue = sinon.createStubInstance(Value);
            namespaceScope.getClass.withArgs('This\\SubSpace\\MyClass').returns(classObject);
            classObject.getStaticPropertyByName.withArgs('myProp').returns(resultValue);
            createValue('This\\SubSpace\\MyClass');

            expect(
                value.getStaticPropertyByName(
                    factory.createString('myProp'),
                    namespaceScope
                )
            ).to.equal(resultValue);
        });
    });

    describe('getValueOrNull()', function () {
        it('should just return this value, as values are always classed as "defined"', function () {
            createValue('MyString');

            expect(value.getValueOrNull()).to.equal(value);
        });
    });

    describe('instantiate()', function () {
        var classObject,
            newObjectValue;

        beforeEach(function () {
            classObject = sinon.createStubInstance(Class);
            namespaceScope.getClass.withArgs('My\\Space\\MyClass').returns(classObject);
            newObjectValue = sinon.createStubInstance(ObjectValue);
            classObject.instantiate.returns(newObjectValue);
        });

        it('should pass the args along', function () {
            var argValue = sinon.createStubInstance(IntegerValue);
            createValue('My\\Space\\MyClass');

            value.instantiate([argValue], namespaceScope);

            expect(classObject.instantiate).to.have.been.calledOnce;
            expect(classObject.instantiate).to.have.been.calledWith([sinon.match.same(argValue)]);
        });

        it('should return the new instance created by the class', function () {
            createValue('My\\Space\\MyClass');

            expect(value.instantiate([], namespaceScope)).to.equal(newObjectValue);
        });
    });

    describe('isNumeric()', function () {
        it('should return false', function () {
            expect(value.isNumeric()).to.be.false;
        });
    });

    describe('isTheClassOfObject()', function () {
        var namespace;

        beforeEach(function () {
            namespace = sinon.createStubInstance(Namespace);
            namespace.getPrefix.returns('Full\\Path\\To\\Mine\\');
            namespaceScope.resolveClass.withArgs('Mine\\MyClass').returns({
                namespace: namespace,
                name: 'MyClass'
            });
            createValue('Mine\\MyClass');
        });

        it('should return bool(true) when the subject object\'s class is this class', function () {
            var subjectObjectValue = sinon.createStubInstance(ObjectValue),
                result;
            subjectObjectValue.classIs.withArgs('Full\\Path\\To\\Mine\\MyClass').returns(true);

            result = value.isTheClassOfObject(subjectObjectValue, namespaceScope);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(true);
        });

        it('should return bool(false) when the subject object\'s class is not this class', function () {
            var subjectObjectValue = sinon.createStubInstance(ObjectValue),
                result;
            subjectObjectValue.classIs.withArgs('Full\\Path\\To\\Mine\\MyClass').returns(false);

            result = value.isTheClassOfObject(subjectObjectValue, namespaceScope);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('subtractFromNull()', function () {
        it('should throw an "Unsupported operand" error', function () {
            createValue('mybarewordstring');

            expect(function () {
                value.subtractFromNull();
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });
});
