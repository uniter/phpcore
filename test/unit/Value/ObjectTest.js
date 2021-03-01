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
    ArrayIterator = require('../../../src/Iterator/ArrayIterator'),
    ArrayValue = require('../../../src/Value/Array').sync(),
    BooleanValue = require('../../../src/Value/Boolean').sync(),
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    Closure = require('../../../src/Closure').sync(),
    Exception = phpCommon.Exception,
    FloatValue = require('../../../src/Value/Float').sync(),
    FunctionSpec = require('../../../src/Function/FunctionSpec'),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    MethodSpec = require('../../../src/MethodSpec'),
    Namespace = require('../../../src/Namespace').sync(),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    NullReference = require('../../../src/Reference/Null'),
    NullValue = require('../../../src/Value/Null').sync(),
    ObjectElement = require('../../../src/Reference/ObjectElement'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    PHPObject = require('../../../src/FFI/Value/PHPObject').sync(),
    PropertyReference = require('../../../src/Reference/Property'),
    StaticPropertyReference = require('../../../src/Reference/StaticProperty'),
    Translator = phpCommon.Translator,
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Object', function () {
    var callStack,
        classObject,
        factory,
        globalNamespace,
        namespaceScope,
        nativeObject,
        objectID,
        prop1,
        prop2,
        translator,
        value;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        translator = sinon.createStubInstance(Translator);
        factory = new ValueFactory(null, 'sync', null, translator);
        globalNamespace = sinon.createStubInstance(Namespace);
        classObject = sinon.createStubInstance(Class);
        classObject.getMethodSpec.returns(null);
        classObject.getName.returns('My\\Space\\AwesomeClass');
        classObject.getSuperClass.returns(null);
        classObject.isAutoCoercionEnabled.returns(false);
        prop1 = factory.createString('the value of firstProp');
        prop2 = factory.createString('the value of secondProp');
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        nativeObject = {};
        objectID = 21;

        callStack.getCurrentClass.returns(null);
        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        factory.setCallStack(callStack);
        factory.setGlobalNamespace(globalNamespace);

        translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });

        value = new ObjectValue(
            factory,
            callStack,
            translator,
            nativeObject,
            classObject,
            objectID
        );
        value.declareProperty('firstProp', classObject, 'public').initialise(prop1);
        value.declareProperty('secondProp', classObject, 'public').initialise(prop2);
    });

    describe('addToArray()', function () {
        it('should raise a notice', function () {
            try {
                value.addToArray(factory.createArray([]));
            } catch (error) {}

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class My\\Space\\AwesomeClass could not be converted to number'
            );
        });

        it('should also raise a fatal error', function () {
            expect(function () {
                value.addToArray(factory.createArray([]));
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('addToBoolean()', function () {
        it('should raise a notice', function () {
            try {
                value.addToBoolean(factory.createBoolean(true));
            } catch (error) {}

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class My\\Space\\AwesomeClass could not be converted to number'
            );
        });

        it('should return int(2) if the boolean was true', function () {
            var resultValue = value.addToBoolean(factory.createBoolean(true));

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(2);
        });

        it('should return int(1) if the boolean was false', function () {
            var resultValue = value.addToBoolean(factory.createBoolean(false));

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1);
        });
    });

    describe('addToFloat()', function () {
        it('should raise a notice', function () {
            try {
                value.addToFloat(factory.createBoolean(true));
            } catch (error) {}

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class My\\Space\\AwesomeClass could not be converted to number'
            );
        });

        it('should return the float plus 1', function () {
            var resultValue = value.addToFloat(factory.createFloat(5.45));

            expect(resultValue.getType()).to.equal('float');
            expect(resultValue.getNative()).to.equal(6.45);
        });
    });

    describe('advance()', function () {
        describe('when the PHP object implements Iterator', function () {
            beforeEach(function () {
                classObject.is.withArgs('Iterator').returns(true);
                classObject.is.returns(false);
            });

            it('should call the ->next() method on it', function () {
                value.advance();

                expect(classObject.callMethod).to.have.been.calledOnce;
                expect(classObject.callMethod).to.have.been.calledWith('next');
            });
        });

        describe('when the PHP object does not implement Iterator', function () {
            beforeEach(function () {
                classObject.is.returns(false);
            });

            it('should throw an exception', function () {
                expect(function () {
                    value.advance();
                }).to.throw(Exception, 'Object.advance() :: Object does not implement Iterator');
            });
        });
    });

    describe('bindClosure()', function () {
        var boundClosure,
            nativeObject,
            scopeClass,
            thisValue;

        beforeEach(function () {
            boundClosure = sinon.createStubInstance(Closure);
            nativeObject = sinon.createStubInstance(Closure);
            scopeClass = sinon.createStubInstance(Class);
            thisValue = sinon.createStubInstance(ObjectValue);

            classObject.is.withArgs('Closure').returns(true);
            nativeObject.bind.returns(boundClosure);
            scopeClass.getSuperClass.returns(null);

            value = new ObjectValue(
                factory,
                callStack,
                translator,
                nativeObject,
                classObject,
                objectID
            );
            value.setInternalProperty('closure', nativeObject);
        });

        it('should pass the `$this` object to the Closure', function () {
            value.bindClosure(thisValue, scopeClass);

            expect(nativeObject.bind).to.have.been.calledWith(
                sinon.match.same(thisValue)
            );
        });

        it('should pass the scope Class to the Closure', function () {
            value.bindClosure(thisValue, scopeClass);

            expect(nativeObject.bind).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(scopeClass)
            );
        });

        it('should return the bound Closure', function () {
            expect(value.bindClosure(thisValue, scopeClass)).to.equal(boundClosure);
        });

        it('should throw when the wrapped object is not a Closure', function () {
            classObject.is.withArgs('Closure').returns(false);

            expect(function () {
                value.bindClosure(thisValue, scopeClass);
            }).to.throw('bindClosure() :: Value is not a Closure');
        });
    });

    describe('callMethod()', function () {
        it('should ask the class to call the method and return its result', function () {
            var argValue = sinon.createStubInstance(Value),
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(resultValue);

            expect(value.callMethod('myMethod', [argValue])).to.equal(resultValue);
            expect(classObject.callMethod).to.have.been.calledOnce;
            expect(classObject.callMethod).to.have.been.calledWith(
                'myMethod',
                [sinon.match.same(argValue)],
                sinon.match.same(value)
            );
        });
    });

    describe('callStaticMethod()', function () {
        it('should ask the class to call the method and return its result when non-forwarding', function () {
            var argValue = sinon.createStubInstance(Value),
                methodNameValue = factory.createString('myMethod'),
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(resultValue);

            expect(value.callStaticMethod(methodNameValue, [argValue], null, false)).to.equal(resultValue);
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
                methodNameValue = factory.createString('myMethod'),
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(resultValue);

            expect(value.callStaticMethod(methodNameValue, [argValue], null, true)).to.equal(resultValue);
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

    describe('classIs()', function () {
        it('should return true when <class>.is(...) does', function () {
            classObject.is.withArgs('My\\Class\\Path').returns(true);

            expect(value.classIs('My\\Class\\Path')).to.be.true;
        });

        it('should return false when <class>.is(...) does', function () {
            classObject.is.withArgs('My\\Class\\Path').returns(false);

            expect(value.classIs('My\\Class\\Path')).to.be.false;
        });
    });

    describe('clone()', function () {
        it('should return an instance created via Class.instantiateBare(...)', function () {
            var cloneInstance = sinon.createStubInstance(ObjectValue);
            classObject.instantiateBare
                .withArgs([])
                .returns(cloneInstance);

            expect(value.clone()).to.equal(cloneInstance);
        });

        it('should copy any instance properties from the original to the clone', function () {
            var cloneInstance = sinon.createStubInstance(ObjectValue);
            classObject.instantiateBare
                .withArgs([])
                .returns(cloneInstance);

            value.clone();

            expect(cloneInstance.setProperty).to.have.been.calledTwice;
            expect(cloneInstance.setProperty).to.have.been.calledWith('firstProp', sinon.match.same(prop1));
            expect(cloneInstance.setProperty).to.have.been.calledWith('secondProp', sinon.match.same(prop2));
        });

        it('should call the magic __clone() method on the clone if defined', function () {
            var cloneInstance = sinon.createStubInstance(ObjectValue);
            classObject.instantiateBare
                .withArgs([])
                .returns(cloneInstance);
            cloneInstance.isMethodDefined
                .withArgs('__clone')
                .returns(true);

            value.clone();

            expect(cloneInstance.callMethod).to.have.been.calledOnce;
            expect(cloneInstance.callMethod).to.have.been.calledWith('__clone');
        });

        it('should not call the magic __clone() method on the original if defined', function () {
            var cloneInstance = sinon.createStubInstance(ObjectValue);
            classObject.instantiateBare
                .withArgs([])
                .returns(cloneInstance);
            cloneInstance.isMethodDefined
                .withArgs('__clone')
                .returns(false);

            value.clone();

            expect(cloneInstance.callMethod).not.to.have.been.called;
        });
    });

    describe('coerceToArray()', function () {
        it('should handle an empty object', function () {
            var objectValue = new ObjectValue(
                    factory,
                    callStack,
                    translator,
                    {},
                    classObject,
                    objectID
                ),
                arrayValue;

            arrayValue = objectValue.coerceToArray();

            expect(arrayValue.getLength()).to.equal(0);
        });

        it('should handle an object with native and PHP properties', function () {
            var arrayValue;
            value.getInstancePropertyByName(factory.createString('myNewProp'))
                .setValue(factory.createString('the value of the new prop'));

            arrayValue = value.coerceToArray();

            expect(arrayValue.getLength()).to.equal(3);
            expect(arrayValue.getElementByIndex(0).getKey().getNative()).to.equal('firstProp');
            expect(arrayValue.getElementByIndex(0).getValue().getNative()).to.equal('the value of firstProp');
            expect(arrayValue.getElementByIndex(1).getKey().getNative()).to.equal('secondProp');
            expect(arrayValue.getElementByIndex(1).getValue().getNative()).to.equal('the value of secondProp');
            expect(arrayValue.getElementByIndex(2).getKey().getNative()).to.equal('myNewProp');
            expect(arrayValue.getElementByIndex(2).getValue().getNative()).to.equal('the value of the new prop');
        });

        it('should handle an object with property named "length"', function () {
            var arrayValue;
            value.getInstancePropertyByName(factory.createString('length'))
                .setValue(factory.createInteger(321));

            arrayValue = value.coerceToArray();

            expect(arrayValue.getLength()).to.equal(3);
            expect(arrayValue.getElementByIndex(2).getKey().getNative()).to.equal('length');
            expect(arrayValue.getElementByIndex(2).getValue().getNative()).to.equal(321);
        });

        it('should handle an object with private and protected properties', function () {
            var arrayValue;
            value.declareProperty('privateProp', classObject, 'private')
                .initialise(factory.createString('a private one'));
            value.declareProperty('protectedProp', classObject, 'protected')
                .initialise(factory.createString('a protected one'));

            arrayValue = value.coerceToArray();

            expect(arrayValue.getNative()).to.deep.equal({
                'firstProp': 'the value of firstProp',
                'secondProp': 'the value of secondProp',
                '\0My\\Space\\AwesomeClass\0privateProp': 'a private one',
                '\0*\0protectedProp': 'a protected one'
            });
        });
    });

    describe('coerceToInteger()', function () {
        it('should raise a notice', function () {
            classObject.getName.returns('MyClass');
            value.coerceToInteger();

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class MyClass could not be converted to number'
            );
        });

        it('should return int one', function () {
            var result = value.coerceToInteger();

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });
    });

    describe('coerceToNativeError()', function () {
        it('should export an instance of a class implementing Throwable', function () {
            var error,
                exportedValue = new Error('my native error');
            classObject.exportInstanceForJS
                .withArgs(sinon.match.same(value))
                .returns(exportedValue);
            classObject.is
                .withArgs('Throwable')
                .returns(true);

            error = value.coerceToNativeError();

            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal('my native error');
        });

        it('should throw when the ObjectValue does not implement Exception', function () {
            classObject.is.withArgs('Throwable').returns(false);

            expect(function () {
                value.coerceToNativeError();
            }).to.throw('Weird value class thrown: My\\Space\\AwesomeClass');
        });
    });

    describe('coerceToNumber()', function () {
        it('should raise a notice', function () {
            classObject.getName.returns('MyClass');
            value.coerceToNumber();

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class MyClass could not be converted to number'
            );
        });

        it('should return int one', function () {
            var result = value.coerceToNumber();

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });
    });

    describe('coerceToObject()', function () {
        it('should return the same object value', function () {
            var coercedValue = value.coerceToObject();

            expect(coercedValue).to.equal(value);
        });
    });

    describe('declareProperty()', function () {
        it('should leave the property undefined', function () {
            value.declareProperty('myUndefinedProp');

            expect(value.getInstancePropertyByName(factory.createString('myUndefinedProp')).isDefined())
                .to.be.false;
        });

        it('should leave the property unset', function () {
            value.declareProperty('myUndefinedProp');

            expect(value.getInstancePropertyByName(factory.createString('myUndefinedProp')).isSet())
                .to.be.false;
        });

        it('should leave the property empty', function () {
            value.declareProperty('myUndefinedProp');

            expect(value.getInstancePropertyByName(factory.createString('myUndefinedProp')).isEmpty())
                .to.be.true;
        });
    });

    describe('divide()', function () {
        it('should hand off to the right-hand operand to divide by this object', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.divideByObject.withArgs(value).returns(result);

            expect(value.divide(rightOperand)).to.equal(result);
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
                var leftValue;

                beforeEach(function () {
                    leftValue = factory.createBoolean(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = value.divideByBoolean(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    classObject.getName.returns('MyClass');

                    value.divideByBoolean(leftValue);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyClass could not be converted to number'
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
                var leftValue;

                beforeEach(function () {
                    leftValue = factory.createFloat(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = value.divideByFloat(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    classObject.getName.returns('MyObjClass');

                    value.divideByFloat(leftValue);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyObjClass could not be converted to number'
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
                var leftValue;

                beforeEach(function () {
                    leftValue = factory.createInteger(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = value.divideByInteger(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    classObject.getName.returns('MyClass');

                    value.divideByInteger(leftValue);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyClass could not be converted to number'
                    );
                });
            });
        });
    });

    describe('divideByNull()', function () {
        describe('for `null / <object>`', function () {
            var coercedLeftValue,
                leftValue;

            beforeEach(function () {
                leftValue = sinon.createStubInstance(NullValue);
                leftValue.getNative.returns(null);

                coercedLeftValue = sinon.createStubInstance(IntegerValue);
                coercedLeftValue.getNative.returns(0);
                leftValue.coerceToNumber.returns(coercedLeftValue);
            });

            it('should return int(0)', function () {
                var result = value.divideByNull(leftValue);

                expect(result).to.be.an.instanceOf(IntegerValue);
                expect(result.getNative()).to.equal(0);
            });

            it('should raise a notice due to coercion of object to int', function () {
                classObject.getName.returns('MyClass');

                value.divideByNull(leftValue);

                expect(callStack.raiseError).to.have.been.calledOnce;
                expect(callStack.raiseError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'Object of class MyClass could not be converted to number'
                );
            });
        });
    });

    describe('divideByObject()', function () {
        var coercedLeftValue,
            leftValue;

        beforeEach(function () {
            leftValue = sinon.createStubInstance(ObjectValue);
            leftValue.getNative.returns({});

            coercedLeftValue = sinon.createStubInstance(IntegerValue);
            coercedLeftValue.getNative.returns(1);
            leftValue.coerceToNumber.returns(coercedLeftValue);
        });

        it('should return int(1)', function () {
            var result = value.divideByObject(leftValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });

        it('should raise a notice due to coercion of object to int', function () {
            classObject.getName.returns('MyClass');

            value.divideByObject(leftValue);

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class MyClass could not be converted to number'
            );
        });
    });

    describe('divideByString()', function () {
        _.each([
            {
                left: 'my string',
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: '21', // Int string is coerced to int
                expectedResultType: IntegerValue,
                expectedResult: 21
            },
            {
                left: '27.2', // Decimal string is coerced to float
                expectedResultType: FloatValue,
                expectedResult: 27.2
            },
            {
                left: '25.4.7', // Decimal string prefix is coerced to float
                expectedResultType: FloatValue,
                expectedResult: 25.4
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' / <object>`', function () {
                var leftValue;

                beforeEach(function () {
                    leftValue = factory.createString(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = value.divideByString(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    classObject.getName.returns('MyClass');

                    value.divideByString(leftValue);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyClass could not be converted to number'
                    );
                });
            });
        });
    });

    describe('formatAsString()', function () {
        it('should include the class of the object', function () {
            classObject.getName.returns('My\\Namespaced\\FunClass');

            expect(value.formatAsString()).to.equal('Object(My\\Namespaced\\FunClass)');
        });
    });

    describe('getCallableName()', function () {
        it('should return the FQN when the object is a Closure', function () {
            classObject.is.withArgs('Closure').returns(true);
            classObject.is.returns(false);
            nativeObject.functionSpec = sinon.createStubInstance(FunctionSpec);
            nativeObject.functionSpec.getFunctionName
                .withArgs(true)
                .returns('Fully\\Qualified\\Path\\To\\{closure}');

            expect(value.getCallableName()).to.equal('Fully\\Qualified\\Path\\To\\{closure}');
        });

        it('should return the FQN to the __invoke(...) method when the object is not a Closure', function () {
            classObject.getName.returns('Fully\\Qualified\\Path\\To\\MyClass');

            expect(value.getCallableName()).to.equal('Fully\\Qualified\\Path\\To\\MyClass::__invoke()');
        });
    });

    describe('getClass()', function () {
        it('should return the Class of the object', function () {
            expect(value.getClass()).to.equal(classObject);
        });
    });

    describe('getConstantByName()', function () {
        it('should fetch the constant from the class of the object', function () {
            var resultValue = factory.createString('my value');
            classObject.getConstantByName
                .withArgs('MY_CONST')
                .returns(resultValue);

            expect(value.getConstantByName('MY_CONST', namespaceScope)).to.equal(resultValue);
        });
    });

    describe('getCurrentElementReference()', function () {
        describe('when the PHP object implements Iterator', function () {
            beforeEach(function () {
                classObject.is.withArgs('Iterator').returns(true);
                classObject.is.returns(false);
            });

            it('should call the ->current() method on it', function () {
                value.getCurrentElementReference();

                expect(classObject.callMethod).to.have.been.calledOnce;
                expect(classObject.callMethod).to.have.been.calledWith('current');
            });

            it('should return the result from the ->current() method', function () {
                var resultValue = sinon.createStubInstance(Value);
                classObject.callMethod.withArgs('current').returns(resultValue);

                expect(value.getCurrentElementReference()).to.equal(resultValue);
            });
        });

        describe('when the PHP object does not implement Iterator', function () {
            beforeEach(function () {
                classObject.is.returns(false);
            });

            it('should throw an exception', function () {
                expect(function () {
                    value.getCurrentElementReference();
                }).to.throw(Exception, 'Object.getCurrentElementValue() :: Object does not implement Iterator');
            });
        });
    });

    describe('getCurrentElementValue()', function () {
        describe('when the PHP object implements Iterator', function () {
            beforeEach(function () {
                classObject.is.withArgs('Iterator').returns(true);
                classObject.is.returns(false);
            });

            it('should call the ->current() method on it', function () {
                value.getCurrentElementValue();

                expect(classObject.callMethod).to.have.been.calledOnce;
                expect(classObject.callMethod).to.have.been.calledWith('current');
            });

            it('should return the result from the ->current() method', function () {
                var resultValue = sinon.createStubInstance(Value);
                classObject.callMethod.withArgs('current').returns(resultValue);

                expect(value.getCurrentElementValue()).to.equal(resultValue);
            });
        });

        describe('when the PHP object does not implement Iterator', function () {
            beforeEach(function () {
                classObject.is.returns(false);
            });

            it('should throw an exception', function () {
                expect(function () {
                    value.getCurrentElementValue();
                }).to.throw(Exception, 'Object.getCurrentElementValue() :: Object does not implement Iterator');
            });
        });
    });

    describe('getCurrentKey()', function () {
        describe('when the PHP object implements Iterator', function () {
            var resultValue;

            beforeEach(function () {
                classObject.is.withArgs('Iterator').returns(true);
                classObject.is.returns(false);
                resultValue = factory.createString('my_key');
                classObject.callMethod.withArgs('key').returns(resultValue);
            });

            it('should call the ->key() method on it', function () {
                value.getCurrentKey();

                expect(classObject.callMethod).to.have.been.calledOnce;
                expect(classObject.callMethod).to.have.been.calledWith('key');
            });

            it('should return the result from the ->key() method', function () {
                expect(value.getCurrentKey()).to.equal(resultValue);
            });
        });

        describe('when the PHP object does not implement Iterator', function () {
            beforeEach(function () {
                classObject.is.returns(false);
            });

            it('should throw an exception', function () {
                expect(function () {
                    value.getCurrentKey();
                }).to.throw(Exception, 'Object.getCurrentKey() :: Object does not implement Iterator');
            });
        });
    });

    describe('getDisplayType()', function () {
        it('should return the class FQCN', function () {
            expect(value.getDisplayType()).to.equal('My\\Space\\AwesomeClass');
        });
    });

    describe('getElementByKey()', function () {
        it('should return a NullReference when the value could not be coerced to a key', function () {
            var reference = value.getElementByKey(factory.createArray(['my el']));

            expect(reference).to.be.an.instanceOf(NullReference);
        });

        it('should return an ObjectElement when this object implements ArrayAccess', function () {
            var element,
                elementValue = factory.createString('my value'),
                keyValue = factory.createString('my key');
            classObject.callMethod
                .withArgs('offsetGet', [keyValue], sinon.match.same(value))
                .returns(elementValue);
            classObject.is
                .withArgs('ArrayAccess')
                .returns(true);

            element = value.getElementByKey(keyValue);

            expect(element).to.be.an.instanceOf(ObjectElement);
            expect(element.getValue()).to.equal(elementValue);
        });

        it('should raise an error when this object does not implement ArrayAccess', function () {
            classObject.is
                .withArgs('ArrayAccess')
                .returns(false);

            expect(function () {
                value.getElementByKey(factory.createString('my key'));
            }).to.throw(
                'Fake PHP Fatal error for #core.cannot_use_wrong_type_as with {"actual":"My\\\\Space\\\\AwesomeClass","expected":"array"}'
            );
        });
    });

    describe('getInstancePropertyByName()', function () {
        var ancestorClass,
            descendantClass,
            foreignClass;

        beforeEach(function () {
            ancestorClass = sinon.createStubInstance(Class);
            descendantClass = sinon.createStubInstance(Class);
            foreignClass = sinon.createStubInstance(Class);

            ancestorClass.getName.returns('MyAncestorClass');
            descendantClass.getName.returns('MyDescendantClass');
            foreignClass.getName.returns('MyForeignClass');

            ancestorClass.extends.withArgs(sinon.match.same(ancestorClass)).returns(false);
            ancestorClass.extends.withArgs(sinon.match.same(classObject)).returns(false);
            ancestorClass.extends.withArgs(sinon.match.same(descendantClass)).returns(false);
            ancestorClass.extends.withArgs(sinon.match.same(foreignClass)).returns(false);
            classObject.extends.withArgs(sinon.match.same(ancestorClass)).returns(true);
            classObject.extends.withArgs(sinon.match.same(classObject)).returns(false);
            classObject.extends.withArgs(sinon.match.same(descendantClass)).returns(false);
            classObject.extends.withArgs(sinon.match.same(foreignClass)).returns(false);
            descendantClass.extends.withArgs(sinon.match.same(ancestorClass)).returns(true);
            descendantClass.extends.withArgs(sinon.match.same(classObject)).returns(true);
            descendantClass.extends.withArgs(sinon.match.same(descendantClass)).returns(false);
            descendantClass.extends.withArgs(sinon.match.same(foreignClass)).returns(false);
            foreignClass.extends.withArgs(sinon.match.same(ancestorClass)).returns(false);
            foreignClass.extends.withArgs(sinon.match.same(classObject)).returns(false);
            foreignClass.extends.withArgs(sinon.match.same(descendantClass)).returns(false);
            foreignClass.extends.withArgs(sinon.match.same(foreignClass)).returns(false);

            ancestorClass.getSuperClass.returns(null);
            descendantClass.getSuperClass.returns(classObject);
            foreignClass.getSuperClass.returns(null);

            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(true);
            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);
            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(true);
            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(false);
            classObject.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(true);
            classObject.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);
            classObject.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(true);
            classObject.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(false);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(true);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(true);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(true);
        });

        describe('for an undefined property', function () {
            it('should define the property, return it and always return the same instance', function () {
                var property = value.getInstancePropertyByName(factory.createString('myPublicProp'));

                expect(property).to.be.an.instanceOf(PropertyReference);
                expect(value.getInstancePropertyByName(factory.createString('myPublicProp')))
                    .to.equal(property);
            });
        });

        describe('for a public property', function () {
            it('should return when not inside any class', function () {
                var property = value.declareProperty('myPublicProp', classObject, 'public');

                expect(value.getInstancePropertyByName(factory.createString('myPublicProp')))
                    .to.equal(property);
            });

            it('should return when inside a class that is not the defining one', function () {
                var property = value.declareProperty('myPublicProp', classObject, 'public');
                callStack.getCurrentClass.returns(foreignClass);

                expect(value.getInstancePropertyByName(factory.createString('myPublicProp')))
                    .to.equal(property);
            });
        });

        describe('for a protected property', function () {
            it('should return when inside the defining class', function () {
                var property = value.declareProperty('myProtectedProp', classObject, 'protected');
                callStack.getCurrentClass.returns(classObject);

                expect(value.getInstancePropertyByName(factory.createString('myProtectedProp')))
                    .to.equal(property);
            });

            it('should throw a fatal error when inside a class that is not in the family of the definer', function () {
                value.declareProperty('myProtectedProp', classObject, 'protected');
                callStack.getCurrentClass.returns(foreignClass);

                expect(function () {
                    value.getInstancePropertyByName(factory.createString('myProtectedProp'));
                }).to.throw(
                    'Fake PHP Fatal error for #core.cannot_access_property with {"className":"My\\\\Space\\\\AwesomeClass","propertyName":"myProtectedProp","visibility":"protected"}'
                );
            });

            it('should return when inside a class that is an ancestor of the definer', function () {
                var property = value.declareProperty('myProtectedProp', classObject, 'protected');
                callStack.getCurrentClass.returns(ancestorClass);

                expect(value.getInstancePropertyByName(factory.createString('myProtectedProp')))
                    .to.equal(property);
            });

            it('should return when inside a class that is a descendant of the definer', function () {
                var property = value.declareProperty('myProtectedProp', classObject, 'protected');
                callStack.getCurrentClass.returns(descendantClass);

                expect(value.getInstancePropertyByName(factory.createString('myProtectedProp')))
                    .to.equal(property);
            });
        });

        describe('for a private property', function () {
            it('should return when inside the defining class', function () {
                var property = value.declareProperty('myPrivateProp', classObject, 'private');
                callStack.getCurrentClass.returns(classObject);

                expect(value.getInstancePropertyByName(factory.createString('myPrivateProp')))
                    .to.equal(property);
            });

            it('should throw a fatal error when inside a class that is not in the family of the definer', function () {
                value.declareProperty('myPrivateProp', classObject, 'private');
                callStack.getCurrentClass.returns(foreignClass);

                expect(function () {
                    value.getInstancePropertyByName(factory.createString('myPrivateProp'));
                }).to.throw(
                    'Fake PHP Fatal error for #core.cannot_access_property with {"className":"My\\\\Space\\\\AwesomeClass","propertyName":"myPrivateProp","visibility":"private"}'
                );
            });

            it('should throw a fatal error when inside a class that is an ancestor of the definer', function () {
                value.declareProperty('myPrivateProp', classObject, 'private');
                callStack.getCurrentClass.returns(ancestorClass);

                expect(function () {
                    value.getInstancePropertyByName(factory.createString('myPrivateProp'));
                }).to.throw(
                    'Fake PHP Fatal error for #core.cannot_access_property with {"className":"My\\\\Space\\\\AwesomeClass","propertyName":"myPrivateProp","visibility":"private"}'
                );
            });

            it('should throw a fatal error when inside a class that is a descendant of the definer', function () {
                value.declareProperty('myPrivateProp', classObject, 'private');
                callStack.getCurrentClass.returns(descendantClass);

                expect(function () {
                    value.getInstancePropertyByName(factory.createString('myPrivateProp'));
                }).to.throw(
                    'Fake PHP Fatal error for #core.undefined_property with {"className":"MyDescendantClass","propertyName":"myPrivateProp"}'
                );
            });
        });

        describe('for a defined but static property', function () {
            // TODO: This should now raise a notice instead (making two notices in total) in PHP7+
            it('should raise a strict standards warning about the invalid access', function () {
                classObject.hasStaticPropertyByName.withArgs('myStaticProp').returns(true);

                value.getInstancePropertyByName(factory.createString('myStaticProp'));

                expect(value.callStack.raiseError).to.have.been.calledOnce;
                expect(value.callStack.raiseError).to.have.been.calledWith(
                    PHPError.E_STRICT,
                    'Accessing static property My\\Space\\AwesomeClass::$myStaticProp as non static'
                );
            });

            it('should raise a notice about the undefined instance property when read', function () {
                classObject.hasStaticPropertyByName.withArgs('myStaticProp').returns(true);

                value.getInstancePropertyByName(factory.createString('myStaticProp')).getValue();

                expect(value.callStack.raiseError).to.have.been.calledTwice;
                expect(value.callStack.raiseError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'Undefined property: My\\Space\\AwesomeClass::$myStaticProp'
                );
            });

            it('should return null', function () {
                classObject.hasStaticPropertyByName.withArgs('myStaticProp').returns(true);

                expect(
                    value.getInstancePropertyByName(factory.createString('myStaticProp'))
                        .getValue()
                        .getNative()
                )
                    .to.equal(null);
            });
        });
    });

    describe('getInstancePropertyNames()', function () {
        var ancestorClass,
            descendantClass,
            foreignClass;

        beforeEach(function () {
            ancestorClass = sinon.createStubInstance(Class);
            descendantClass = sinon.createStubInstance(Class);
            foreignClass = sinon.createStubInstance(Class);

            ancestorClass.getSuperClass.returns(null);
            descendantClass.getSuperClass.returns(classObject);
            foreignClass.getSuperClass.returns(null);

            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(true);
            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);
            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(true);
            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(false);
            classObject.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(true);
            classObject.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);
            classObject.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(true);
            classObject.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(false);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(true);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(true);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(true);
        });

        it('should include properties on the native object', function () {
            var names = value.getInstancePropertyNames();

            expect(names).to.have.length(2);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
        });

        it('should include properties added from PHP', function () {
            var names;
            value.getInstancePropertyByName(factory.createString('myNewProp'))
                .setValue(factory.createString('a value'));

            names = value.getInstancePropertyNames();

            expect(names).to.have.length(3);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
            expect(names[2].getNative()).to.equal('myNewProp');
        });

        it('should not include undefined properties', function () {
            var names;
            // Fetch property reference but do not assign a value or reference to keep it undefined
            value.getInstancePropertyByName(factory.createString('myNewProp'));

            names = value.getInstancePropertyNames();

            expect(names).to.have.length(2);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
        });

        it('should handle a property called "length" correctly', function () {
            var names;
            value.getInstancePropertyByName(factory.createString('length'))
                .setValue(factory.createInteger(127));

            names = value.getInstancePropertyNames();

            expect(names).to.have.length(3);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
            expect(names[2].getNative()).to.equal('length');
        });

        it('should include private properties when inside the defining class', function () {
            var names;
            value.declareProperty('myPrivateProp', classObject, 'private')
                .initialise(factory.createString('my value'));
            callStack.getCurrentClass.returns(classObject);

            names = value.getInstancePropertyNames();

            expect(names).to.have.length(3);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
            expect(names[2].getNative()).to.equal('myPrivateProp');
        });

        it('should include protected properties when inside a class of the same family', function () {
            var names;
            value.declareProperty('protectedPropFromAncestor', ancestorClass, 'protected')
                .initialise(factory.createString('my value'));
            callStack.getCurrentClass.returns(classObject);

            names = value.getInstancePropertyNames();

            expect(names).to.have.length(3);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
            expect(names[2].getNative()).to.equal('protectedPropFromAncestor');
        });

        it('should not include private nor protected properties when inside an unrelated class', function () {
            var names;
            value.declareProperty('myPrivateProp', classObject, 'private')
                .initialise(factory.createString('my private value'));
            value.declareProperty('myProtectedProp', classObject, 'protected')
                .initialise(factory.createString('my protected value'));
            callStack.getCurrentClass.returns(foreignClass);

            names = value.getInstancePropertyNames();

            expect(names).to.have.length(2);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
        });
    });

    describe('getInternalProperty()', function () {
        it('should retrieve a stored internal property', function () {
            value.setInternalProperty('myProp', 21);

            expect(value.getInternalProperty('myProp')).to.equal(21);
        });

        it('should error when the internal property is not defined', function () {
            classObject.getName.returns('My\\SpecialClass');

            expect(function () {
                value.getInternalProperty('myUndefinedProperty');
            }).to.throw(
                'Object of class "My\\SpecialClass" has no internal property "myUndefinedProperty"'
            );
        });
    });

    describe('getIterator()', function () {
        it('should reset the object\'s internal pointer', function () {
            value.setPointer(4);

            value.getIterator();

            expect(value.getPointer()).to.equal(0);
        });

        describe('when the object does not implement Traversable', function () {
            it('should return an ArrayIterator over this object', function () {
                var iterator;
                classObject.is.returns(false);

                iterator = value.getIterator();

                expect(iterator).to.be.an.instanceOf(ArrayIterator);
                expect(iterator.getIteratedValue()).to.equal(value);
            });
        });

        describe('when the object implements Iterator', function () {
            beforeEach(function () {
                classObject.is.withArgs('Iterator').returns(true);
                classObject.is.returns(false);
            });

            it('should call its ->rewind() method', function () {
                value.getIterator();

                expect(classObject.callMethod).to.have.been.calledOnce;
                expect(classObject.callMethod).to.have.been.calledWith('rewind');
            });

            it('should return this object itself', function () {
                expect(value.getIterator()).to.equal(value);
            });
        });

        describe('when the object implements IteratorAggregate', function () {
            beforeEach(function () {
                classObject.is.withArgs('IteratorAggregate').returns(true);
                classObject.is.returns(false);
            });

            it('should return the Iterator instance returned by ->getIterator()', function () {
                var iteratorValue = sinon.createStubInstance(ObjectValue);
                iteratorValue.classIs.withArgs('Iterator').returns(true);
                iteratorValue.classIs.returns(false);
                iteratorValue.getType.returns('object');
                classObject.callMethod.withArgs('getIterator').returns(iteratorValue);

                expect(value.getIterator()).to.equal(iteratorValue);
            });

            it('should rewind the Iterator instance returned by ->getIterator()', function () {
                var iteratorValue = sinon.createStubInstance(ObjectValue);
                iteratorValue.classIs.withArgs('Iterator').returns(true);
                iteratorValue.classIs.returns(false);
                iteratorValue.getType.returns('object');
                classObject.callMethod.withArgs('getIterator').returns(iteratorValue);

                value.getIterator();

                expect(iteratorValue.callMethod).to.have.been.calledOnce;
                expect(iteratorValue.callMethod).to.have.been.calledWith('rewind');
            });

            it('should throw an Exception when the return value of ->getIterator() is not an object', function () {
                var caughtError,
                    exceptionClassObject = sinon.createStubInstance(Class),
                    exceptionObjectValue = sinon.createStubInstance(ObjectValue),
                    invalidIteratorValue = factory.createString('I am not a valid iterator');
                exceptionClassObject.getSuperClass.returns(null);
                classObject.callMethod.withArgs('getIterator').returns(invalidIteratorValue);
                globalNamespace.getClass.withArgs('Exception').returns(exceptionClassObject);
                exceptionClassObject.instantiate.returns(exceptionObjectValue);

                try {
                    value.getIterator();
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).to.equal(exceptionObjectValue);
                expect(exceptionClassObject.instantiate.args[0][0][0].getType()).to.equal('string');
                expect(exceptionClassObject.instantiate.args[0][0][0].getNative()).to.equal(
                    '[Translated] core.object_from_get_iterator_must_be_traversable {"className":"My\\\\Space\\\\AwesomeClass"}'
                );
            });

            it('should throw an Exception when the return value of ->getIterator() does not implement Iterator', function () {
                var caughtError,
                    exceptionClassObject = sinon.createStubInstance(Class),
                    exceptionObjectValue = sinon.createStubInstance(ObjectValue),
                    iteratorValue = sinon.createStubInstance(ObjectValue);
                exceptionClassObject.getSuperClass.returns(null);
                iteratorValue.classIs.returns(false);
                iteratorValue.getType.returns('object');
                classObject.callMethod.withArgs('getIterator').returns(iteratorValue);
                globalNamespace.getClass.withArgs('Exception').returns(exceptionClassObject);
                exceptionClassObject.instantiate.returns(exceptionObjectValue);

                try {
                    value.getIterator();
                } catch (error) {
                    caughtError = error;
                }

                expect(caughtError).to.equal(exceptionObjectValue);
                expect(exceptionClassObject.instantiate.args[0][0][0].getType()).to.equal('string');
                expect(exceptionClassObject.instantiate.args[0][0][0].getNative()).to.equal(
                    '[Translated] core.object_from_get_iterator_must_be_traversable {"className":"My\\\\Space\\\\AwesomeClass"}'
                );
            });
        });
    });

    describe('getLength()', function () {
        var ancestorClass,
            descendantClass,
            foreignClass;

        beforeEach(function () {
            ancestorClass = sinon.createStubInstance(Class);
            descendantClass = sinon.createStubInstance(Class);
            foreignClass = sinon.createStubInstance(Class);

            ancestorClass.getSuperClass.returns(null);
            descendantClass.getSuperClass.returns(classObject);
            foreignClass.getSuperClass.returns(null);

            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(true);
            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);
            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(true);
            ancestorClass.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(false);
            classObject.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(true);
            classObject.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);
            classObject.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(true);
            classObject.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(false);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(true);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(true);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(true);
            descendantClass.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(ancestorClass)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(classObject)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(descendantClass)).returns(false);
            foreignClass.isInFamilyOf.withArgs(sinon.match.same(foreignClass)).returns(true);
        });

        it('should return the number of properties when only public ones exist', function () {
            expect(value.getLength()).to.equal(2);
        });

        it('should include private properties in the length when inside their defining class', function () {
            value.declareProperty('myPrivateProp', classObject, 'private')
                .initialise(factory.createString('a value'));
            callStack.getCurrentClass.returns(classObject);

            expect(value.getLength()).to.equal(3);
        });

        it('should include protected properties when inside a class of the same family', function () {
            value.declareProperty('protectedPropFromAncestor', ancestorClass, 'protected')
                .initialise(factory.createString('my value'));
            callStack.getCurrentClass.returns(classObject);

            expect(value.getLength()).to.equal(3);
        });

        it('should not include private nor protected properties in the length when inside an unrelated class', function () {
            value.declareProperty('myPrivateProp', classObject, 'private')
                .initialise(factory.createString('a private value'));
            value.declareProperty('myProtectedProp', classObject, 'protected')
                .initialise(factory.createString('a protected value'));
            callStack.getCurrentClass.returns(foreignClass);

            expect(value.getLength()).to.equal(2);
        });
    });

    describe('getNative()', function () {
        beforeEach(function () {
            classObject.exportInstanceForJS
                .withArgs(sinon.match.same(value))
                .returns(nativeObject);
            classObject.getName.returns('JSObject');
        });

        it('should unwrap by returning the original JS object', function () {
            expect(value.getNative()).to.equal(nativeObject);
        });
    });

    describe('getNonPrivateProperties()', function () {
        it('should fetch all non-private properties', function () {
            var properties;
            value.declareProperty('myPrivateProp', classObject, 'private')
                .initialise(factory.createString('private value'));
            value.declareProperty('myProtectedProp', classObject, 'protected')
                .initialise(factory.createString('protected value'));

            properties = value.getNonPrivateProperties();

            expect(Object.keys(properties)).to.have.length(3);
            expect(properties.firstProp.getNative()).to.equal('the value of firstProp');
            expect(properties.secondProp.getNative()).to.equal('the value of secondProp');
            expect(properties.myProtectedProp.getNative()).to.equal('protected value');
        });
    });

    describe('getObject()', function () {
        it('should return the wrapped native object', function () {
            expect(value.getObject()).to.equal(nativeObject);
        });
    });

    describe('getPropertyNames()', function () {
        it('should return all instance property names as native strings', function () {
            expect(value.getPropertyNames()).to.deep.equal([
                'firstProp',
                'secondProp'
            ]);
        });
    });

    describe('getProxy()', function () {
        it('should wrap the instance in a proxying PHPObject instance via the class', function () {
            var wrapperPHPObject = sinon.createStubInstance(PHPObject);
            classObject.proxyInstanceForJS
                .withArgs(sinon.match.same(value))
                .returns(wrapperPHPObject);

            expect(value.getProxy()).to.equal(wrapperPHPObject);
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
        it('should fetch the static property reference from the class of the object', function () {
            var propertyReference = sinon.createStubInstance(StaticPropertyReference);
            classObject.getStaticPropertyByName
                .withArgs('myProp')
                .returns(propertyReference);

            expect(value.getStaticPropertyByName(factory.createString('myProp'), namespaceScope))
                .to.equal(propertyReference);
        });
    });

    describe('getThisObject()', function () {
        it('should fetch the $this object via the class', function () {
            var thisObject = {my: 'this object'};
            classObject.getThisObjectForInstance
                .withArgs(sinon.match.same(value))
                .returns(thisObject);

            expect(value.getThisObject()).to.equal(thisObject);
        });
    });

    describe('getValueOrNull()', function () {
        it('should just return this value, as values are always classed as "defined"', function () {
            expect(value.getValueOrNull()).to.equal(value);
        });
    });

    describe('instantiate()', function () {
        var arg1Value;

        beforeEach(function () {
            arg1Value = factory.createInteger(21);
        });

        describe('for an instance of a PHP class', function () {
            it('should return a new instance of that class', function () {
                var newObjectValue = sinon.createStubInstance(ObjectValue),
                    resultObjectValue;
                classObject.instantiate.withArgs([sinon.match.same(arg1Value)]).returns(newObjectValue);

                resultObjectValue = value.instantiate([arg1Value]);

                expect(resultObjectValue).to.equal(newObjectValue);
            });
        });

        describe('for a JSObject instance wrapping a JS function', function () {
            var JSClass;

            beforeEach(function () {
                classObject.getName.returns('JSObject');
                JSClass = sinon.stub();
                nativeObject = JSClass;

                sinon.stub(factory, 'coerceObject').callsFake(function (nativeObject) {
                    var newObjectValue = sinon.createStubInstance(ObjectValue);
                    newObjectValue.getClass.returns(classObject);
                    newObjectValue.getObject.returns(nativeObject);
                    return newObjectValue;
                });

                value = new ObjectValue(
                    factory,
                    callStack,
                    translator,
                    nativeObject,
                    classObject,
                    objectID
                );
            });

            it('should return a JSObject wrapping a new instance of the JS function/class', function () {
                var resultObjectValue;

                resultObjectValue = value.instantiate([arg1Value]);

                expect(resultObjectValue).to.be.an.instanceOf(ObjectValue);
                expect(resultObjectValue.getClass()).to.equal(classObject);
                expect(resultObjectValue.getObject()).to.be.an.instanceOf(JSClass);
            });

            it('should call the native JS function/class/constructor on the new native JS object with unwrapped args', function () {
                var resultObjectValue;
                JSClass.callsFake(function () {
                    this.myProp = 1009;
                });

                resultObjectValue = value.instantiate([arg1Value]);

                expect(JSClass).to.have.been.calledOnce;
                expect(resultObjectValue.getObject().myProp).to.equal(1009);
                expect(JSClass).to.have.been.calledWith(21);
            });

            it('should allow a native JS constructor function to return a different object to use', function () {
                var resultObjectValue,
                    resultNativeObject = {my: 'native object'};
                JSClass.returns(resultNativeObject);

                resultObjectValue = value.instantiate([arg1Value]);

                expect(resultObjectValue).to.be.an.instanceOf(ObjectValue);
                expect(resultObjectValue.getClass()).to.equal(classObject);
                expect(resultObjectValue.getObject()).to.equal(resultNativeObject);
            });
        });

        describe('for a JSObject instance wrapping a non-function JS object', function () {
            beforeEach(function () {
                classObject.getName.returns('JSObject');
                nativeObject = {};

                value = new ObjectValue(
                    factory,
                    callStack,
                    translator,
                    nativeObject,
                    classObject,
                    objectID
                );
            });

            it('should throw, as only native JS functions are supported by the bridge integration', function () {
                expect(function () {
                    value.instantiate([arg1Value]);
                }).to.throw('Cannot create a new instance of a non-function JSObject');
            });
        });
    });

    describe('invokeClosure()', function () {
        var closure;

        beforeEach(function () {
            closure = sinon.createStubInstance(Closure);

            classObject.is.withArgs('Closure').returns(true);

            value = new ObjectValue(
                factory,
                callStack,
                translator,
                closure,
                classObject,
                objectID
            );
            value.setInternalProperty('closure', closure);
        });

        it('should pass the provided arguments to Closure.invoke(...)', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);

            value.invokeClosure([arg1, arg2]);

            expect(closure.invoke).to.have.been.calledOnce;
            expect(closure.invoke).to.have.been.calledWith(
                [sinon.match.same(arg1), sinon.match.same(arg2)]
            );
        });

        it('should return the result from Closure.invoke(...)', function () {
            var resultValue = sinon.createStubInstance(Value);
            closure.invoke.returns(resultValue);

            expect(value.invokeClosure([])).to.equal(resultValue);
        });

        it('should throw when the native value is not an instance of Closure', function () {
            classObject.is.withArgs('Closure').returns(false);

            expect(function () {
                value.invokeClosure([]);
            }).to.throw('invokeClosure() :: Value is not a Closure');
        });
    });

    describe('isAnInstanceOf()', function () {
        it('should hand off to the right-hand operand to determine the result', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.isTheClassOfObject
                .withArgs(sinon.match.same(value), sinon.match.same(namespaceScope))
                .returns(result);

            expect(value.isAnInstanceOf(rightOperand, namespaceScope)).to.equal(result);
        });
    });

    describe('isCallable()', function () {
        beforeEach(function () {
            classObject.getMethodSpec
                .returns(null);
            classObject.is
                .withArgs('Closure')
                .returns(false);
        });

        it('should return true for an instance of Closure', function () {
            classObject.is
                .withArgs('Closure')
                .returns(true);

            expect(value.isCallable()).to.be.true;
        });

        it('should return true for an instance of a non-Closure class implementing ->__invoke()', function () {
            var methodSpec = sinon.createStubInstance(MethodSpec);
            classObject.getMethodSpec
                .withArgs('__invoke')
                .returns(methodSpec);

            expect(value.isCallable()).to.be.true;
        });

        it('should return false for a non-Closure instance that doesn\'t implement ->__invoke()', function () {
            expect(value.isCallable()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return false', function () {
            expect(value.isEmpty()).to.be.false;
        });
    });

    describe('isEqualToObject()', function () {
        var anotherClass;

        beforeEach(function () {
            anotherClass = sinon.createStubInstance(Class);
        });

        it('should return true when given the same object', function () {
            expect(value.isEqualToObject(value).getNative()).to.be.true;
        });

        it('should return true when given another object with identical properties and of the same class', function () {
            var otherObject = new ObjectValue(factory, callStack, translator, {}, classObject, 22);
            otherObject.declareProperty('firstProp', classObject, 'public').initialise(prop1);
            otherObject.declareProperty('secondProp', classObject, 'public').initialise(prop2);

            expect(value.isEqualToObject(otherObject).getNative()).to.be.true;
        });

        it('should return false when given another object with identical properties but of another class', function () {
            var otherObject = new ObjectValue(factory, callStack, translator, {}, anotherClass, 22);
            otherObject.declareProperty('firstProp', classObject, 'public').initialise(prop1);
            otherObject.declareProperty('secondProp', classObject, 'public').initialise(prop2);

            expect(value.isEqualToObject(otherObject).getNative()).to.be.false;
        });

        it('should return false when given another object with different properties but of the same class', function () {
            var otherObject = new ObjectValue(factory, callStack, translator, {}, classObject, 22);
            otherObject.declareProperty('firstProp', classObject, 'public').initialise(prop1);
            otherObject.declareProperty('secondProp', classObject, 'public')
                .initialise(factory.createInteger(1001));

            expect(value.isEqualToObject(otherObject).getNative()).to.be.false;
        });
    });

    describe('isIterable()', function () {
        it('should return true when the object is an instance of Traversable', function () {
            classObject.is
                .withArgs('Traversable')
                .returns(true);

            expect(value.isIterable()).to.be.true;
        });

        it('should return false when the object is not an instance of Traversable', function () {
            classObject.is
                .withArgs('Traversable')
                .returns(false);

            expect(value.isIterable()).to.be.false;
        });
    });

    describe('isMethodDefined()', function () {
        it('should return true when the method is defined', function () {
            classObject.getMethodSpec.withArgs('myMethod').returns(sinon.createStubInstance(MethodSpec));

            expect(value.isMethodDefined('myMethod')).to.be.true;
        });

        it('should return false when the method is not defined', function () {
            classObject.getMethodSpec.withArgs('myMethod').returns(null);

            expect(value.isMethodDefined('myMethod')).to.be.false;
        });
    });

    describe('isNotFinished()', function () {
        describe('when the object implements Iterator', function () {
            beforeEach(function () {
                classObject.is.withArgs('Iterator').returns(true);
                classObject.is.returns(false);
            });

            it('should return true when ->valid() does', function () {
                classObject.callMethod.withArgs('valid').returns(factory.createBoolean(true));

                expect(value.isNotFinished()).to.be.true;
            });

            it('should return false when ->valid() does', function () {
                classObject.callMethod.withArgs('valid').returns(factory.createBoolean(false));

                expect(value.isNotFinished()).to.be.false;
            });

            it('should return true when ->valid() returns a truthy value', function () {
                classObject.callMethod.withArgs('valid').returns(factory.createString('yep'));

                expect(value.isNotFinished()).to.be.true;
            });

            it('should return false when ->valid() returns a falsy value', function () {
                classObject.callMethod.withArgs('valid').returns(factory.createFloat(0.0));

                expect(value.isNotFinished()).to.be.false;
            });
        });

        describe('when the object does not implement Iterator', function () {
            it('should throw an exception', function () {
                classObject.is.returns(false);

                expect(function () {
                    value.isNotFinished();
                }).to.throw(Exception, 'ObjectValue.isNotFinished() :: Object does not implement Iterator');
            });
        });
    });

    describe('isNumeric()', function () {
        it('should return false', function () {
            expect(value.isNumeric()).to.be.false;
        });
    });

    describe('isTheClassOfArray()', function () {
        it('should return bool(false)', function () {
            var classValue = sinon.createStubInstance(ArrayValue),
                result = value.isTheClassOfArray(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfBoolean()', function () {
        it('should return bool(false)', function () {
            var classValue = factory.createBoolean(true),
                result = value.isTheClassOfBoolean(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfFloat()', function () {
        it('should return bool(false)', function () {
            var classValue = factory.createFloat(21.2),
                result = value.isTheClassOfFloat(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfInteger()', function () {
        it('should return bool(false)', function () {
            var classValue = factory.createInteger(21),
                result = value.isTheClassOfInteger(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfNull()', function () {
        it('should return bool(false)', function () {
            var classValue = factory.createNull(),
                result = value.isTheClassOfNull(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfObject()', function () {
        it('should return bool(true) when the two objects have the same class', function () {
            var subjectObjectValue = factory.createObject({}, classObject),
                result = value.isTheClassOfObject(subjectObjectValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(true);
        });

        it('should return bool(true) when the subject object\'s class extends this object\'s class', function () {
            var subjectClassObject = sinon.createStubInstance(Class),
                subjectObjectValue = factory.createObject({}, subjectClassObject),
                result;
            subjectClassObject.getSuperClass.returns(null);
            subjectClassObject.extends.withArgs(sinon.match.same(classObject)).returns(true);
            classObject.extends.withArgs(sinon.match.same(subjectClassObject)).returns(false);

            result = value.isTheClassOfObject(subjectObjectValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(true);
        });

        it('should return bool(false) when this object\'s class extends the subject object\'s class', function () {
            var subjectClassObject = sinon.createStubInstance(Class),
                subjectObjectValue = factory.createObject({}, subjectClassObject),
                result;
            subjectClassObject.getSuperClass.returns(null);
            subjectClassObject.extends.withArgs(sinon.match.same(classObject)).returns(false);
            classObject.extends.withArgs(sinon.match.same(subjectClassObject)).returns(true);

            result = value.isTheClassOfObject(subjectObjectValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('isTheClassOfString()', function () {
        it('should return bool(false)', function () {
            var classValue = factory.createString('my string'),
                result = value.isTheClassOfString(classValue);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('multiply()', function () {
        it('should hand off to the right-hand operand to multiply by this object', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.multiplyByObject.withArgs(value).returns(result);

            expect(value.multiply(rightOperand)).to.equal(result);
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
            describe('for `' + scenario.left + ' * <object>`', function () {
                var leftValue;

                beforeEach(function () {
                    leftValue = factory.createBoolean(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByBoolean(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    classObject.getName.returns('MyClass');

                    value.multiplyByBoolean(leftValue);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyClass could not be converted to number'
                    );
                });
            });
        });
    });

    describe('multiplyByFloat()', function () {
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
            describe('for `' + scenario.left + ' * <object>`', function () {
                var leftValue;

                beforeEach(function () {
                    leftValue = factory.createFloat(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByFloat(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    classObject.getName.returns('MyObjClass');

                    value.multiplyByFloat(leftValue);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyObjClass could not be converted to number'
                    );
                });
            });
        });
    });

    describe('multiplyByInteger()', function () {
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
            describe('for `' + scenario.left + ' * <object>`', function () {
                var leftValue;

                beforeEach(function () {
                    leftValue = factory.createInteger(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByInteger(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    classObject.getName.returns('MyClass');

                    value.multiplyByInteger(leftValue);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyClass could not be converted to number'
                    );
                });
            });
        });
    });

    describe('multiplyByNull()', function () {
        describe('for `null * <object>`', function () {
            var coercedLeftValue,
                leftValue;

            beforeEach(function () {
                leftValue = sinon.createStubInstance(NullValue);
                leftValue.getNative.returns(null);

                coercedLeftValue = sinon.createStubInstance(IntegerValue);
                coercedLeftValue.getNative.returns(0);
                leftValue.coerceToNumber.returns(coercedLeftValue);
            });

            it('should return int(0)', function () {
                var result = value.multiplyByNull(leftValue);

                expect(result).to.be.an.instanceOf(IntegerValue);
                expect(result.getNative()).to.equal(0);
            });

            it('should raise a notice due to coercion of object to int', function () {
                classObject.getName.returns('MyClass');

                value.multiplyByNull(leftValue);

                expect(callStack.raiseError).to.have.been.calledOnce;
                expect(callStack.raiseError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'Object of class MyClass could not be converted to number'
                );
            });
        });
    });

    describe('multiplyByObject()', function () {
        var coercedLeftValue,
            leftValue;

        beforeEach(function () {
            leftValue = sinon.createStubInstance(ObjectValue);
            leftValue.getNative.returns({});

            coercedLeftValue = sinon.createStubInstance(IntegerValue);
            coercedLeftValue.getNative.returns(1);
            leftValue.coerceToNumber.returns(coercedLeftValue);
        });

        it('should return int(1)', function () {
            var result = value.multiplyByObject(leftValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });

        it('should raise a notice due to coercion of object to int', function () {
            classObject.getName.returns('MyClass');

            value.multiplyByObject(leftValue);

            expect(callStack.raiseError).to.have.been.calledOnce;
            expect(callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class MyClass could not be converted to number'
            );
        });
    });

    describe('multiplyByString()', function () {
        _.each([
            {
                left: 'my string',
                expectedResultType: IntegerValue,
                expectedResult: 0
            },
            {
                left: '21', // Int string is coerced to int
                expectedResultType: IntegerValue,
                expectedResult: 21
            },
            {
                left: '27.2', // Decimal string is coerced to float
                expectedResultType: FloatValue,
                expectedResult: 27.2
            },
            {
                left: '25.4.7', // Decimal string prefix is coerced to float
                expectedResultType: FloatValue,
                expectedResult: 25.4
            }
        ], function (scenario) {
            describe('for `' + scenario.left + ' * <object>`', function () {
                var leftValue;

                beforeEach(function () {
                    leftValue = factory.createString(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = value.multiplyByString(leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    classObject.getName.returns('MyClass');

                    value.multiplyByString(leftValue);

                    expect(callStack.raiseError).to.have.been.calledOnce;
                    expect(callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyClass could not be converted to number'
                    );
                });
            });
        });
    });

    describe('pointToProperty()', function () {
        it('should set the pointer to the index of the property when native', function () {
            var element = sinon.createStubInstance(PropertyReference);
            element.getKey.returns(factory.createString('secondProp'));

            value.pointToProperty(element);

            expect(value.getPointer()).to.equal(1);
        });

        it('should set the pointer to the index of the property when added from PHP', function () {
            var element = sinon.createStubInstance(PropertyReference);
            element.getKey.returns(factory.createString('myNewProp'));
            value.getInstancePropertyByName(factory.createString('myNewProp'))
                .setValue(factory.createString('a value'));

            value.pointToProperty(element);

            expect(value.getPointer()).to.equal(2);
        });
    });

    describe('subtractFromNull()', function () {
        it('should throw an "Unsupported operand" error', function () {
            expect(function () {
                value.subtractFromNull();
            }).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });
});
