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
    PHPObject = require('../../../src/PHPObject').sync(),
    PropertyReference = require('../../../src/Reference/Property'),
    StaticPropertyReference = require('../../../src/Reference/StaticProperty'),
    Translator = phpCommon.Translator,
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Object', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.translator = sinon.createStubInstance(Translator);
        this.factory = new ValueFactory(null, 'sync', null, this.translator);
        this.globalNamespace = sinon.createStubInstance(Namespace);
        this.classObject = sinon.createStubInstance(Class);
        this.classObject.getMethodSpec.returns(null);
        this.classObject.getName.returns('My\\Space\\AwesomeClass');
        this.classObject.getSuperClass.returns(null);
        this.classObject.isAutoCoercionEnabled.returns(false);
        this.prop1 = this.factory.createString('the value of firstProp');
        this.prop2 = this.factory.createString('the value of secondProp');
        this.nativeObject = {};
        this.objectID = 21;

        this.callStack.getCurrentClass.returns(null);
        this.callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        }.bind(this));

        this.factory.setCallStack(this.callStack);
        this.factory.setGlobalNamespace(this.globalNamespace);

        this.translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });

        this.value = new ObjectValue(
            this.factory,
            this.callStack,
            this.translator,
            this.nativeObject,
            this.classObject,
            this.objectID
        );
        this.value.declareProperty('firstProp', this.classObject, 'public').initialise(this.prop1);
        this.value.declareProperty('secondProp', this.classObject, 'public').initialise(this.prop2);
    });

    describe('addToArray()', function () {
        it('should raise a notice', function () {
            try {
                this.value.addToArray(this.factory.createArray([]));
            } catch (error) {}

            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class My\\Space\\AwesomeClass could not be converted to number'
            );
        });

        it('should also raise a fatal error', function () {
            expect(function () {
                this.value.addToArray(this.factory.createArray([]));
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('addToBoolean()', function () {
        it('should raise a notice', function () {
            try {
                this.value.addToBoolean(this.factory.createBoolean(true));
            } catch (error) {}

            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class My\\Space\\AwesomeClass could not be converted to number'
            );
        });

        it('should return int(2) if the boolean was true', function () {
            var resultValue = this.value.addToBoolean(this.factory.createBoolean(true));

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(2);
        });

        it('should return int(1) if the boolean was false', function () {
            var resultValue = this.value.addToBoolean(this.factory.createBoolean(false));

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1);
        });
    });

    describe('addToFloat()', function () {
        it('should raise a notice', function () {
            try {
                this.value.addToFloat(this.factory.createBoolean(true));
            } catch (error) {}

            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class My\\Space\\AwesomeClass could not be converted to number'
            );
        });

        it('should return the float plus 1', function () {
            var resultValue = this.value.addToFloat(this.factory.createFloat(5.45));

            expect(resultValue.getType()).to.equal('float');
            expect(resultValue.getNative()).to.equal(6.45);
        });
    });

    describe('advance()', function () {
        describe('when the PHP object implements Iterator', function () {
            beforeEach(function () {
                this.classObject.is.withArgs('Iterator').returns(true);
                this.classObject.is.returns(false);
            });

            it('should call the ->next() method on it', function () {
                this.value.advance();

                expect(this.classObject.callMethod).to.have.been.calledOnce;
                expect(this.classObject.callMethod).to.have.been.calledWith('next');
            });
        });

        describe('when the PHP object does not implement Iterator', function () {
            beforeEach(function () {
                this.classObject.is.returns(false);
            });

            it('should throw an exception', function () {
                expect(function () {
                    this.value.advance();
                }.bind(this)).to.throw(Exception, 'Object.advance() :: Object does not implement Iterator');
            });
        });
    });

    describe('bindClosure()', function () {
        beforeEach(function () {
            this.boundClosure = sinon.createStubInstance(Closure);
            this.nativeObject = sinon.createStubInstance(Closure);
            this.scopeClass = sinon.createStubInstance(Class);
            this.thisValue = sinon.createStubInstance(ObjectValue);

            this.nativeObject.bind.returns(this.boundClosure);
            this.scopeClass.getSuperClass.returns(null);

            this.value = new ObjectValue(
                this.factory,
                this.callStack,
                this.translator,
                this.nativeObject,
                this.classObject,
                this.objectID
            );
        });

        it('should pass the `$this` object to the Closure', function () {
            this.value.bindClosure(this.thisValue, this.scopeClass);

            expect(this.nativeObject.bind).to.have.been.calledWith(
                sinon.match.same(this.thisValue)
            );
        });

        it('should pass the scope Class to the Closure', function () {
            this.value.bindClosure(this.thisValue, this.scopeClass);

            expect(this.nativeObject.bind).to.have.been.calledWith(
                sinon.match.any,
                sinon.match.same(this.scopeClass)
            );
        });

        it('should return the bound Closure', function () {
            expect(this.value.bindClosure(this.thisValue, this.scopeClass)).to.equal(this.boundClosure);
        });

        it('should throw when the wrapped object is not a Closure', function () {
            this.value = new ObjectValue(
                this.factory,
                this.callStack,
                this.translator,
                {},
                this.classObject,
                this.objectID
            );

            expect(function () {
                this.value.bindClosure(this.thisValue, this.scopeClass);
            }.bind(this)).to.throw('bindClosure() :: Value is not a Closure');
        });
    });

    describe('callMethod()', function () {
        it('should ask the class to call the method and return its result', function () {
            var argValue = sinon.createStubInstance(Value),
                resultValue = sinon.createStubInstance(Value);
            this.classObject.callMethod.returns(resultValue);

            expect(this.value.callMethod('myMethod', [argValue])).to.equal(resultValue);
            expect(this.classObject.callMethod).to.have.been.calledOnce;
            expect(this.classObject.callMethod).to.have.been.calledWith(
                'myMethod',
                [sinon.match.same(argValue)],
                sinon.match.same(this.value)
            );
        });
    });

    describe('callStaticMethod()', function () {
        it('should ask the class to call the method and return its result when non-forwarding', function () {
            var argValue = sinon.createStubInstance(Value),
                methodNameValue = this.factory.createString('myMethod'),
                resultValue = sinon.createStubInstance(Value);
            this.classObject.callMethod.returns(resultValue);

            expect(this.value.callStaticMethod(methodNameValue, [argValue], null, false)).to.equal(resultValue);
            expect(this.classObject.callMethod).to.have.been.calledOnce;
            expect(this.classObject.callMethod).to.have.been.calledWith(
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
                methodNameValue = this.factory.createString('myMethod'),
                resultValue = sinon.createStubInstance(Value);
            this.classObject.callMethod.returns(resultValue);

            expect(this.value.callStaticMethod(methodNameValue, [argValue], null, true)).to.equal(resultValue);
            expect(this.classObject.callMethod).to.have.been.calledOnce;
            expect(this.classObject.callMethod).to.have.been.calledWith(
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
            this.classObject.is.withArgs('My\\Class\\Path').returns(true);

            expect(this.value.classIs('My\\Class\\Path')).to.be.true;
        });

        it('should return false when <class>.is(...) does', function () {
            this.classObject.is.withArgs('My\\Class\\Path').returns(false);

            expect(this.value.classIs('My\\Class\\Path')).to.be.false;
        });
    });

    describe('clone()', function () {
        it('should return an instance created via Class.instantiateBare(...)', function () {
            var cloneInstance = sinon.createStubInstance(ObjectValue);
            this.classObject.instantiateBare
                .withArgs([])
                .returns(cloneInstance);

            expect(this.value.clone()).to.equal(cloneInstance);
        });

        it('should copy any instance properties from the original to the clone', function () {
            var cloneInstance = sinon.createStubInstance(ObjectValue);
            this.classObject.instantiateBare
                .withArgs([])
                .returns(cloneInstance);

            this.value.clone();

            expect(cloneInstance.setProperty).to.have.been.calledTwice;
            expect(cloneInstance.setProperty).to.have.been.calledWith('firstProp', sinon.match.same(this.prop1));
            expect(cloneInstance.setProperty).to.have.been.calledWith('secondProp', sinon.match.same(this.prop2));
        });

        it('should call the magic __clone() method on the clone if defined', function () {
            var cloneInstance = sinon.createStubInstance(ObjectValue);
            this.classObject.instantiateBare
                .withArgs([])
                .returns(cloneInstance);
            cloneInstance.isMethodDefined
                .withArgs('__clone')
                .returns(true);

            this.value.clone();

            expect(cloneInstance.callMethod).to.have.been.calledOnce;
            expect(cloneInstance.callMethod).to.have.been.calledWith('__clone');
        });

        it('should not call the magic __clone() method on the original if defined', function () {
            var cloneInstance = sinon.createStubInstance(ObjectValue);
            this.classObject.instantiateBare
                .withArgs([])
                .returns(cloneInstance);
            cloneInstance.isMethodDefined
                .withArgs('__clone')
                .returns(false);

            this.value.clone();

            expect(cloneInstance.callMethod).not.to.have.been.called;
        });
    });

    describe('coerceToArray()', function () {
        it('should handle an empty object', function () {
            var objectValue = new ObjectValue(
                    this.factory,
                    this.callStack,
                    this.translator,
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
            expect(arrayValue.getElementByIndex(0).getKey().getNative()).to.equal('firstProp');
            expect(arrayValue.getElementByIndex(0).getValue().getNative()).to.equal('the value of firstProp');
            expect(arrayValue.getElementByIndex(1).getKey().getNative()).to.equal('secondProp');
            expect(arrayValue.getElementByIndex(1).getValue().getNative()).to.equal('the value of secondProp');
            expect(arrayValue.getElementByIndex(2).getKey().getNative()).to.equal('myNewProp');
            expect(arrayValue.getElementByIndex(2).getValue().getNative()).to.equal('the value of the new prop');
        });

        it('should handle an object with property named "length"', function () {
            var arrayValue;
            this.value.getInstancePropertyByName(this.factory.createString('length'))
                .setValue(this.factory.createInteger(321));

            arrayValue = this.value.coerceToArray();

            expect(arrayValue.getLength()).to.equal(3);
            expect(arrayValue.getElementByIndex(2).getKey().getNative()).to.equal('length');
            expect(arrayValue.getElementByIndex(2).getValue().getNative()).to.equal(321);
        });

        it('should handle an object with private and protected properties', function () {
            var arrayValue;
            this.value.declareProperty('privateProp', this.classObject, 'private')
                .initialise(this.factory.createString('a private one'));
            this.value.declareProperty('protectedProp', this.classObject, 'protected')
                .initialise(this.factory.createString('a protected one'));

            arrayValue = this.value.coerceToArray();

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
            this.classObject.getName.returns('MyClass');
            this.value.coerceToInteger();

            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class MyClass could not be converted to number'
            );
        });

        it('should return int one', function () {
            var result = this.value.coerceToInteger();

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });
    });

    describe('coerceToNativeError()', function () {
        it('should coerce an instance of a class implementing Throwable with a message correctly', function () {
            var error;
            this.classObject.getName.returns('My\\Stuff\\MyException');
            this.classObject.is.withArgs('Throwable').returns(true);
            this.value.declareProperty('message', this.classObject, 'line')
                .initialise(this.factory.createString('My PHP exception message'));
            this.value.declareProperty('file', this.classObject, 'public')
                .initialise(this.factory.createString('/path/to/my_module.php'));
            this.value.declareProperty('line', this.classObject, 'line')
                .initialise(this.factory.createInteger(4321));

            error = this.value.coerceToNativeError();

            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal(
                'PHP Fatal error: [Translated] core.uncaught_throwable {"name":"My\\\\Stuff\\\\MyException","message":"My PHP exception message"} in /path/to/my_module.php on line 4321'
            );
        });

        it('should coerce an instance of a class implementing Throwable with empty message correctly', function () {
            var error;
            this.classObject.getName.returns('My\\Stuff\\MyException');
            this.classObject.is.withArgs('Throwable').returns(true);
            this.value.declareProperty('message', this.classObject, 'line')
                .initialise(this.factory.createString(''));
            this.value.declareProperty('file', this.classObject, 'public')
                .initialise(this.factory.createString('/path/to/my_module.php'));
            this.value.declareProperty('line', this.classObject, 'line')
                .initialise(this.factory.createInteger(4321));

            error = this.value.coerceToNativeError();

            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal(
                'PHP Fatal error: [Translated] core.uncaught_empty_throwable {"name":"My\\\\Stuff\\\\MyException"} in /path/to/my_module.php on line 4321'
            );
        });

        it('should coerce an instance of ParseError correctly', function () {
            var error;
            this.classObject.getName.returns('ParseError');
            this.classObject.is.withArgs('ParseError').returns(true);
            this.classObject.is.withArgs('Throwable').returns(true);
            this.value.declareProperty('message', this.classObject, 'line')
                .initialise(this.factory.createString('My parse error message'));
            this.value.declareProperty('file', this.classObject, 'public')
                .initialise(this.factory.createString('/path/to/my_module.php'));
            this.value.declareProperty('line', this.classObject, 'line')
                .initialise(this.factory.createInteger(1111));

            error = this.value.coerceToNativeError();

            expect(error).to.be.an.instanceOf(Error);
            expect(error.message).to.equal(
                'PHP Parse error: My parse error message in /path/to/my_module.php on line 1111'
            );
        });

        it('should throw when the ObjectValue does not implement Exception', function () {
            this.classObject.is.withArgs('Throwable').returns(false);

            expect(function () {
                this.value.coerceToNativeError();
            }.bind(this)).to.throw('Weird value class thrown: My\\Space\\AwesomeClass');
        });
    });

    describe('coerceToNumber()', function () {
        it('should raise a notice', function () {
            this.classObject.getName.returns('MyClass');
            this.value.coerceToNumber();

            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
                PHPError.E_NOTICE,
                'Object of class MyClass could not be converted to number'
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

    describe('declareProperty()', function () {
        it('should leave the property undefined', function () {
            this.value.declareProperty('myUndefinedProp');

            expect(this.value.getInstancePropertyByName(this.factory.createString('myUndefinedProp')).isDefined())
                .to.be.false;
        });

        it('should leave the property unset', function () {
            this.value.declareProperty('myUndefinedProp');

            expect(this.value.getInstancePropertyByName(this.factory.createString('myUndefinedProp')).isSet())
                .to.be.false;
        });

        it('should leave the property empty', function () {
            this.value.declareProperty('myUndefinedProp');

            expect(this.value.getInstancePropertyByName(this.factory.createString('myUndefinedProp')).isEmpty())
                .to.be.true;
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
            }.bind(this)).to.throw(
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
                        'Object of class MyClass could not be converted to number'
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
                    'Object of class MyClass could not be converted to number'
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
                beforeEach(function () {
                    this.leftValue = this.factory.createString(scenario.left);
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
                        'Object of class MyClass could not be converted to number'
                    );
                });
            });
        });
    });

    describe('formatAsString()', function () {
        it('should include the class of the object', function () {
            this.classObject.getName.returns('My\\Namespaced\\FunClass');

            expect(this.value.formatAsString()).to.equal('Object(My\\Namespaced\\FunClass)');
        });
    });

    describe('getCallableName()', function () {
        it('should return the FQN when the object is a Closure', function () {
            this.classObject.is.withArgs('Closure').returns(true);
            this.classObject.is.returns(false);
            this.nativeObject.functionSpec = sinon.createStubInstance(FunctionSpec);
            this.nativeObject.functionSpec.getFunctionName
                .withArgs(true)
                .returns('Fully\\Qualified\\Path\\To\\{closure}');

            expect(this.value.getCallableName()).to.equal('Fully\\Qualified\\Path\\To\\{closure}');
        });

        it('should return the FQN to the __invoke(...) method when the object is not a Closure', function () {
            this.classObject.getName.returns('Fully\\Qualified\\Path\\To\\MyClass');

            expect(this.value.getCallableName()).to.equal('Fully\\Qualified\\Path\\To\\MyClass::__invoke()');
        });
    });

    describe('getClass()', function () {
        it('should return the Class of the object', function () {
            expect(this.value.getClass()).to.equal(this.classObject);
        });
    });

    describe('getConstantByName()', function () {
        it('should fetch the constant from the class of the object', function () {
            var resultValue = this.factory.createString('my value');
            this.classObject.getConstantByName
                .withArgs('MY_CONST')
                .returns(resultValue);

            expect(this.value.getConstantByName('MY_CONST', this.namespaceScope)).to.equal(resultValue);
        });
    });

    describe('getCurrentElementReference()', function () {
        describe('when the PHP object implements Iterator', function () {
            beforeEach(function () {
                this.classObject.is.withArgs('Iterator').returns(true);
                this.classObject.is.returns(false);
            });

            it('should call the ->current() method on it', function () {
                this.value.getCurrentElementReference();

                expect(this.classObject.callMethod).to.have.been.calledOnce;
                expect(this.classObject.callMethod).to.have.been.calledWith('current');
            });

            it('should return the result from the ->current() method', function () {
                var resultValue = sinon.createStubInstance(Value);
                this.classObject.callMethod.withArgs('current').returns(resultValue);

                expect(this.value.getCurrentElementReference()).to.equal(resultValue);
            });
        });

        describe('when the PHP object does not implement Iterator', function () {
            beforeEach(function () {
                this.classObject.is.returns(false);
            });

            it('should throw an exception', function () {
                expect(function () {
                    this.value.getCurrentElementReference();
                }.bind(this)).to.throw(Exception, 'Object.getCurrentElementValue() :: Object does not implement Iterator');
            });
        });
    });

    describe('getCurrentElementValue()', function () {
        describe('when the PHP object implements Iterator', function () {
            beforeEach(function () {
                this.classObject.is.withArgs('Iterator').returns(true);
                this.classObject.is.returns(false);
            });

            it('should call the ->current() method on it', function () {
                this.value.getCurrentElementValue();

                expect(this.classObject.callMethod).to.have.been.calledOnce;
                expect(this.classObject.callMethod).to.have.been.calledWith('current');
            });

            it('should return the result from the ->current() method', function () {
                var resultValue = sinon.createStubInstance(Value);
                this.classObject.callMethod.withArgs('current').returns(resultValue);

                expect(this.value.getCurrentElementValue()).to.equal(resultValue);
            });
        });

        describe('when the PHP object does not implement Iterator', function () {
            beforeEach(function () {
                this.classObject.is.returns(false);
            });

            it('should throw an exception', function () {
                expect(function () {
                    this.value.getCurrentElementValue();
                }.bind(this)).to.throw(Exception, 'Object.getCurrentElementValue() :: Object does not implement Iterator');
            });
        });
    });

    describe('getCurrentKey()', function () {
        describe('when the PHP object implements Iterator', function () {
            beforeEach(function () {
                this.classObject.is.withArgs('Iterator').returns(true);
                this.classObject.is.returns(false);
                this.resultValue = this.factory.createString('my_key');
                this.classObject.callMethod.withArgs('key').returns(this.resultValue);
            });

            it('should call the ->key() method on it', function () {
                this.value.getCurrentKey();

                expect(this.classObject.callMethod).to.have.been.calledOnce;
                expect(this.classObject.callMethod).to.have.been.calledWith('key');
            });

            it('should return the result from the ->key() method', function () {
                expect(this.value.getCurrentKey()).to.equal(this.resultValue);
            });
        });

        describe('when the PHP object does not implement Iterator', function () {
            beforeEach(function () {
                this.classObject.is.returns(false);
            });

            it('should throw an exception', function () {
                expect(function () {
                    this.value.getCurrentKey();
                }.bind(this)).to.throw(Exception, 'Object.getCurrentKey() :: Object does not implement Iterator');
            });
        });
    });

    describe('getDisplayType()', function () {
        it('should return the class FQCN', function () {
            expect(this.value.getDisplayType()).to.equal('My\\Space\\AwesomeClass');
        });
    });

    describe('getElementByKey()', function () {
        it('should return a NullReference when the value could not be coerced to a key', function () {
            var reference = this.value.getElementByKey(this.factory.createArray(['my el']));

            expect(reference).to.be.an.instanceOf(NullReference);
        });

        it('should return an ObjectElement when this object implements ArrayAccess', function () {
            var element,
                elementValue = this.factory.createString('my value'),
                keyValue = this.factory.createString('my key');
            this.classObject.callMethod
                .withArgs('offsetGet', [keyValue], sinon.match.same(this.value))
                .returns(elementValue);
            this.classObject.is
                .withArgs('ArrayAccess')
                .returns(true);

            element = this.value.getElementByKey(keyValue);

            expect(element).to.be.an.instanceOf(ObjectElement);
            expect(element.getValue()).to.equal(elementValue);
        });

        it('should raise an error when this object does not implement ArrayAccess', function () {
            this.classObject.is
                .withArgs('ArrayAccess')
                .returns(false);

            expect(function () {
                this.value.getElementByKey(this.factory.createString('my key'));
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.cannot_use_wrong_type_as with {"actual":"My\\\\Space\\\\AwesomeClass","expected":"array"}'
            );
        });
    });

    describe('getInstancePropertyByName()', function () {
        beforeEach(function () {
            this.ancestorClass = sinon.createStubInstance(Class);
            this.descendantClass = sinon.createStubInstance(Class);
            this.foreignClass = sinon.createStubInstance(Class);

            this.ancestorClass.getName.returns('MyAncestorClass');
            this.descendantClass.getName.returns('MyDescendantClass');
            this.foreignClass.getName.returns('MyForeignClass');

            this.ancestorClass.extends.withArgs(sinon.match.same(this.ancestorClass)).returns(false);
            this.ancestorClass.extends.withArgs(sinon.match.same(this.classObject)).returns(false);
            this.ancestorClass.extends.withArgs(sinon.match.same(this.descendantClass)).returns(false);
            this.ancestorClass.extends.withArgs(sinon.match.same(this.foreignClass)).returns(false);
            this.classObject.extends.withArgs(sinon.match.same(this.ancestorClass)).returns(true);
            this.classObject.extends.withArgs(sinon.match.same(this.classObject)).returns(false);
            this.classObject.extends.withArgs(sinon.match.same(this.descendantClass)).returns(false);
            this.classObject.extends.withArgs(sinon.match.same(this.foreignClass)).returns(false);
            this.descendantClass.extends.withArgs(sinon.match.same(this.ancestorClass)).returns(true);
            this.descendantClass.extends.withArgs(sinon.match.same(this.classObject)).returns(true);
            this.descendantClass.extends.withArgs(sinon.match.same(this.descendantClass)).returns(false);
            this.descendantClass.extends.withArgs(sinon.match.same(this.foreignClass)).returns(false);
            this.foreignClass.extends.withArgs(sinon.match.same(this.ancestorClass)).returns(false);
            this.foreignClass.extends.withArgs(sinon.match.same(this.classObject)).returns(false);
            this.foreignClass.extends.withArgs(sinon.match.same(this.descendantClass)).returns(false);
            this.foreignClass.extends.withArgs(sinon.match.same(this.foreignClass)).returns(false);

            this.ancestorClass.getSuperClass.returns(null);
            this.descendantClass.getSuperClass.returns(this.classObject);
            this.foreignClass.getSuperClass.returns(null);

            this.ancestorClass.isInFamilyOf.withArgs(sinon.match.same(this.ancestorClass)).returns(true);
            this.ancestorClass.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(true);
            this.ancestorClass.isInFamilyOf.withArgs(sinon.match.same(this.descendantClass)).returns(true);
            this.ancestorClass.isInFamilyOf.withArgs(sinon.match.same(this.foreignClass)).returns(false);
            this.classObject.isInFamilyOf.withArgs(sinon.match.same(this.ancestorClass)).returns(true);
            this.classObject.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(true);
            this.classObject.isInFamilyOf.withArgs(sinon.match.same(this.descendantClass)).returns(true);
            this.classObject.isInFamilyOf.withArgs(sinon.match.same(this.foreignClass)).returns(false);
            this.descendantClass.isInFamilyOf.withArgs(sinon.match.same(this.ancestorClass)).returns(true);
            this.descendantClass.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(true);
            this.descendantClass.isInFamilyOf.withArgs(sinon.match.same(this.descendantClass)).returns(true);
            this.descendantClass.isInFamilyOf.withArgs(sinon.match.same(this.foreignClass)).returns(false);
            this.foreignClass.isInFamilyOf.withArgs(sinon.match.same(this.ancestorClass)).returns(false);
            this.foreignClass.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(false);
            this.foreignClass.isInFamilyOf.withArgs(sinon.match.same(this.descendantClass)).returns(false);
            this.foreignClass.isInFamilyOf.withArgs(sinon.match.same(this.foreignClass)).returns(true);
        });

        describe('for an undefined property', function () {
            it('should define the property, return it and always return the same instance', function () {
                var property = this.value.getInstancePropertyByName(this.factory.createString('myPublicProp'));

                expect(property).to.be.an.instanceOf(PropertyReference);
                expect(this.value.getInstancePropertyByName(this.factory.createString('myPublicProp')))
                    .to.equal(property);
            });
        });

        describe('for a public property', function () {
            it('should return when not inside any class', function () {
                var property = this.value.declareProperty('myPublicProp', this.classObject, 'public');

                expect(this.value.getInstancePropertyByName(this.factory.createString('myPublicProp')))
                    .to.equal(property);
            });

            it('should return when inside a class that is not the defining one', function () {
                var property = this.value.declareProperty('myPublicProp', this.classObject, 'public');
                this.callStack.getCurrentClass.returns(this.foreignClass);

                expect(this.value.getInstancePropertyByName(this.factory.createString('myPublicProp')))
                    .to.equal(property);
            });
        });

        describe('for a protected property', function () {
            it('should return when inside the defining class', function () {
                var property = this.value.declareProperty('myProtectedProp', this.classObject, 'protected');
                this.callStack.getCurrentClass.returns(this.classObject);

                expect(this.value.getInstancePropertyByName(this.factory.createString('myProtectedProp')))
                    .to.equal(property);
            });

            it('should throw a fatal error when inside a class that is not in the family of the definer', function () {
                this.value.declareProperty('myProtectedProp', this.classObject, 'protected');
                this.callStack.getCurrentClass.returns(this.foreignClass);

                expect(function () {
                    this.value.getInstancePropertyByName(this.factory.createString('myProtectedProp'));
                }.bind(this)).to.throw(
                    'Fake PHP Fatal error for #core.cannot_access_property with {"className":"My\\\\Space\\\\AwesomeClass","propertyName":"myProtectedProp","visibility":"protected"}'
                );
            });

            it('should return when inside a class that is an ancestor of the definer', function () {
                var property = this.value.declareProperty('myProtectedProp', this.classObject, 'protected');
                this.callStack.getCurrentClass.returns(this.ancestorClass);

                expect(this.value.getInstancePropertyByName(this.factory.createString('myProtectedProp')))
                    .to.equal(property);
            });

            it('should return when inside a class that is a descendant of the definer', function () {
                var property = this.value.declareProperty('myProtectedProp', this.classObject, 'protected');
                this.callStack.getCurrentClass.returns(this.descendantClass);

                expect(this.value.getInstancePropertyByName(this.factory.createString('myProtectedProp')))
                    .to.equal(property);
            });
        });

        describe('for a private property', function () {
            it('should return when inside the defining class', function () {
                var property = this.value.declareProperty('myPrivateProp', this.classObject, 'private');
                this.callStack.getCurrentClass.returns(this.classObject);

                expect(this.value.getInstancePropertyByName(this.factory.createString('myPrivateProp')))
                    .to.equal(property);
            });

            it('should throw a fatal error when inside a class that is not in the family of the definer', function () {
                this.value.declareProperty('myPrivateProp', this.classObject, 'private');
                this.callStack.getCurrentClass.returns(this.foreignClass);

                expect(function () {
                    this.value.getInstancePropertyByName(this.factory.createString('myPrivateProp'));
                }.bind(this)).to.throw(
                    'Fake PHP Fatal error for #core.cannot_access_property with {"className":"My\\\\Space\\\\AwesomeClass","propertyName":"myPrivateProp","visibility":"private"}'
                );
            });

            it('should throw a fatal error when inside a class that is an ancestor of the definer', function () {
                this.value.declareProperty('myPrivateProp', this.classObject, 'private');
                this.callStack.getCurrentClass.returns(this.ancestorClass);

                expect(function () {
                    this.value.getInstancePropertyByName(this.factory.createString('myPrivateProp'));
                }.bind(this)).to.throw(
                    'Fake PHP Fatal error for #core.cannot_access_property with {"className":"My\\\\Space\\\\AwesomeClass","propertyName":"myPrivateProp","visibility":"private"}'
                );
            });

            it('should throw a fatal error when inside a class that is a descendant of the definer', function () {
                this.value.declareProperty('myPrivateProp', this.classObject, 'private');
                this.callStack.getCurrentClass.returns(this.descendantClass);

                expect(function () {
                    this.value.getInstancePropertyByName(this.factory.createString('myPrivateProp'));
                }.bind(this)).to.throw(
                    'Fake PHP Fatal error for #core.undefined_property with {"className":"MyDescendantClass","propertyName":"myPrivateProp"}'
                );
            });
        });

        describe('for a defined but static property', function () {
            // TODO: This should now raise a notice instead (making two notices in total) in PHP7+
            it('should raise a strict standards warning about the invalid access', function () {
                this.classObject.hasStaticPropertyByName.withArgs('myStaticProp').returns(true);

                this.value.getInstancePropertyByName(this.factory.createString('myStaticProp'));

                expect(this.value.callStack.raiseError).to.have.been.calledOnce;
                expect(this.value.callStack.raiseError).to.have.been.calledWith(
                    PHPError.E_STRICT,
                    'Accessing static property My\\Space\\AwesomeClass::$myStaticProp as non static'
                );
            });

            it('should raise a notice about the undefined instance property when read', function () {
                this.classObject.hasStaticPropertyByName.withArgs('myStaticProp').returns(true);

                this.value.getInstancePropertyByName(this.factory.createString('myStaticProp')).getValue();

                expect(this.value.callStack.raiseError).to.have.been.calledTwice;
                expect(this.value.callStack.raiseError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'Undefined property: My\\Space\\AwesomeClass::$myStaticProp'
                );
            });

            it('should return null', function () {
                this.classObject.hasStaticPropertyByName.withArgs('myStaticProp').returns(true);

                expect(
                    this.value.getInstancePropertyByName(this.factory.createString('myStaticProp'))
                        .getValue()
                        .getNative()
                )
                    .to.equal(null);
            });
        });
    });

    describe('getInstancePropertyNames()', function () {
        beforeEach(function () {
            this.ancestorClass = sinon.createStubInstance(Class);
            this.descendantClass = sinon.createStubInstance(Class);
            this.foreignClass = sinon.createStubInstance(Class);

            this.ancestorClass.getSuperClass.returns(null);
            this.descendantClass.getSuperClass.returns(this.classObject);
            this.foreignClass.getSuperClass.returns(null);

            this.ancestorClass.isInFamilyOf.withArgs(sinon.match.same(this.ancestorClass)).returns(true);
            this.ancestorClass.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(true);
            this.ancestorClass.isInFamilyOf.withArgs(sinon.match.same(this.descendantClass)).returns(true);
            this.ancestorClass.isInFamilyOf.withArgs(sinon.match.same(this.foreignClass)).returns(false);
            this.classObject.isInFamilyOf.withArgs(sinon.match.same(this.ancestorClass)).returns(true);
            this.classObject.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(true);
            this.classObject.isInFamilyOf.withArgs(sinon.match.same(this.descendantClass)).returns(true);
            this.classObject.isInFamilyOf.withArgs(sinon.match.same(this.foreignClass)).returns(false);
            this.descendantClass.isInFamilyOf.withArgs(sinon.match.same(this.ancestorClass)).returns(true);
            this.descendantClass.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(true);
            this.descendantClass.isInFamilyOf.withArgs(sinon.match.same(this.descendantClass)).returns(true);
            this.descendantClass.isInFamilyOf.withArgs(sinon.match.same(this.foreignClass)).returns(false);
            this.foreignClass.isInFamilyOf.withArgs(sinon.match.same(this.ancestorClass)).returns(false);
            this.foreignClass.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(false);
            this.foreignClass.isInFamilyOf.withArgs(sinon.match.same(this.descendantClass)).returns(false);
            this.foreignClass.isInFamilyOf.withArgs(sinon.match.same(this.foreignClass)).returns(true);
        });

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

        it('should include private properties when inside the defining class', function () {
            var names;
            this.value.declareProperty('myPrivateProp', this.classObject, 'private')
                .initialise(this.factory.createString('my value'));
            this.callStack.getCurrentClass.returns(this.classObject);

            names = this.value.getInstancePropertyNames();

            expect(names).to.have.length(3);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
            expect(names[2].getNative()).to.equal('myPrivateProp');
        });

        it('should include protected properties when inside a class of the same family', function () {
            var names;
            this.value.declareProperty('protectedPropFromAncestor', this.ancestorClass, 'protected')
                .initialise(this.factory.createString('my value'));
            this.callStack.getCurrentClass.returns(this.classObject);

            names = this.value.getInstancePropertyNames();

            expect(names).to.have.length(3);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
            expect(names[2].getNative()).to.equal('protectedPropFromAncestor');
        });

        it('should not include private nor protected properties when inside an unrelated class', function () {
            var names;
            this.value.declareProperty('myPrivateProp', this.classObject, 'private')
                .initialise(this.factory.createString('my private value'));
            this.value.declareProperty('myProtectedProp', this.classObject, 'protected')
                .initialise(this.factory.createString('my protected value'));
            this.callStack.getCurrentClass.returns(this.foreignClass);

            names = this.value.getInstancePropertyNames();

            expect(names).to.have.length(2);
            expect(names[0].getNative()).to.equal('firstProp');
            expect(names[1].getNative()).to.equal('secondProp');
        });
    });

    describe('getInternalProperty()', function () {
        it('should retrieve a stored internal property', function () {
            this.value.setInternalProperty('myProp', 21);

            expect(this.value.getInternalProperty('myProp')).to.equal(21);
        });

        it('should error when the internal property is not defined', function () {
            this.classObject.getName.returns('My\\SpecialClass');

            expect(function () {
                this.value.getInternalProperty('myUndefinedProperty');
            }.bind(this)).to.throw(
                'Object of class "My\\SpecialClass" has no internal property "myUndefinedProperty"'
            );
        });
    });

    describe('getIterator()', function () {
        it('should reset the object\'s internal pointer', function () {
            this.value.setPointer(4);

            this.value.getIterator();

            expect(this.value.getPointer()).to.equal(0);
        });

        describe('when the object does not implement Traversable', function () {
            it('should return an ArrayIterator over this object', function () {
                var iterator;
                this.classObject.is.returns(false);

                iterator = this.value.getIterator();

                expect(iterator).to.be.an.instanceOf(ArrayIterator);
                expect(iterator.getIteratedValue()).to.equal(this.value);
            });
        });

        describe('when the object implements Iterator', function () {
            beforeEach(function () {
                this.classObject.is.withArgs('Iterator').returns(true);
                this.classObject.is.returns(false);
            });

            it('should call its ->rewind() method', function () {
                this.value.getIterator();

                expect(this.classObject.callMethod).to.have.been.calledOnce;
                expect(this.classObject.callMethod).to.have.been.calledWith('rewind');
            });

            it('should return this object itself', function () {
                expect(this.value.getIterator()).to.equal(this.value);
            });
        });

        describe('when the object implements IteratorAggregate', function () {
            beforeEach(function () {
                this.classObject.is.withArgs('IteratorAggregate').returns(true);
                this.classObject.is.returns(false);
            });

            it('should return the Iterator instance returned by ->getIterator()', function () {
                var iteratorValue = sinon.createStubInstance(ObjectValue);
                iteratorValue.classIs.withArgs('Iterator').returns(true);
                iteratorValue.classIs.returns(false);
                iteratorValue.getType.returns('object');
                this.classObject.callMethod.withArgs('getIterator').returns(iteratorValue);

                expect(this.value.getIterator()).to.equal(iteratorValue);
            });

            it('should rewind the Iterator instance returned by ->getIterator()', function () {
                var iteratorValue = sinon.createStubInstance(ObjectValue);
                iteratorValue.classIs.withArgs('Iterator').returns(true);
                iteratorValue.classIs.returns(false);
                iteratorValue.getType.returns('object');
                this.classObject.callMethod.withArgs('getIterator').returns(iteratorValue);

                this.value.getIterator();

                expect(iteratorValue.callMethod).to.have.been.calledOnce;
                expect(iteratorValue.callMethod).to.have.been.calledWith('rewind');
            });

            it('should throw an Exception when the return value of ->getIterator() is not an object', function () {
                var caughtError,
                    exceptionClassObject = sinon.createStubInstance(Class),
                    exceptionObjectValue = sinon.createStubInstance(ObjectValue),
                    invalidIteratorValue = this.factory.createString('I am not a valid iterator');
                exceptionClassObject.getSuperClass.returns(null);
                this.classObject.callMethod.withArgs('getIterator').returns(invalidIteratorValue);
                this.globalNamespace.getClass.withArgs('Exception').returns(exceptionClassObject);
                exceptionClassObject.instantiate.returns(exceptionObjectValue);

                try {
                    this.value.getIterator();
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
                this.classObject.callMethod.withArgs('getIterator').returns(iteratorValue);
                this.globalNamespace.getClass.withArgs('Exception').returns(exceptionClassObject);
                exceptionClassObject.instantiate.returns(exceptionObjectValue);

                try {
                    this.value.getIterator();
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
        beforeEach(function () {
            this.ancestorClass = sinon.createStubInstance(Class);
            this.descendantClass = sinon.createStubInstance(Class);
            this.foreignClass = sinon.createStubInstance(Class);

            this.ancestorClass.getSuperClass.returns(null);
            this.descendantClass.getSuperClass.returns(this.classObject);
            this.foreignClass.getSuperClass.returns(null);

            this.ancestorClass.isInFamilyOf.withArgs(sinon.match.same(this.ancestorClass)).returns(true);
            this.ancestorClass.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(true);
            this.ancestorClass.isInFamilyOf.withArgs(sinon.match.same(this.descendantClass)).returns(true);
            this.ancestorClass.isInFamilyOf.withArgs(sinon.match.same(this.foreignClass)).returns(false);
            this.classObject.isInFamilyOf.withArgs(sinon.match.same(this.ancestorClass)).returns(true);
            this.classObject.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(true);
            this.classObject.isInFamilyOf.withArgs(sinon.match.same(this.descendantClass)).returns(true);
            this.classObject.isInFamilyOf.withArgs(sinon.match.same(this.foreignClass)).returns(false);
            this.descendantClass.isInFamilyOf.withArgs(sinon.match.same(this.ancestorClass)).returns(true);
            this.descendantClass.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(true);
            this.descendantClass.isInFamilyOf.withArgs(sinon.match.same(this.descendantClass)).returns(true);
            this.descendantClass.isInFamilyOf.withArgs(sinon.match.same(this.foreignClass)).returns(false);
            this.foreignClass.isInFamilyOf.withArgs(sinon.match.same(this.ancestorClass)).returns(false);
            this.foreignClass.isInFamilyOf.withArgs(sinon.match.same(this.classObject)).returns(false);
            this.foreignClass.isInFamilyOf.withArgs(sinon.match.same(this.descendantClass)).returns(false);
            this.foreignClass.isInFamilyOf.withArgs(sinon.match.same(this.foreignClass)).returns(true);
        });

        it('should return the number of properties when only public ones exist', function () {
            expect(this.value.getLength()).to.equal(2);
        });

        it('should include private properties in the length when inside their defining class', function () {
            this.value.declareProperty('myPrivateProp', this.classObject, 'private')
                .initialise(this.factory.createString('a value'));
            this.callStack.getCurrentClass.returns(this.classObject);

            expect(this.value.getLength()).to.equal(3);
        });

        it('should include protected properties when inside a class of the same family', function () {
            this.value.declareProperty('protectedPropFromAncestor', this.ancestorClass, 'protected')
                .initialise(this.factory.createString('my value'));
            this.callStack.getCurrentClass.returns(this.classObject);

            expect(this.value.getLength()).to.equal(3);
        });

        it('should not include private nor protected properties in the length when inside an unrelated class', function () {
            this.value.declareProperty('myPrivateProp', this.classObject, 'private')
                .initialise(this.factory.createString('a private value'));
            this.value.declareProperty('myProtectedProp', this.classObject, 'protected')
                .initialise(this.factory.createString('a protected value'));
            this.callStack.getCurrentClass.returns(this.foreignClass);

            expect(this.value.getLength()).to.equal(2);
        });
    });

    describe('getNative()', function () {
        describe('JSObject instances', function () {
            beforeEach(function () {
                this.classObject.getName.returns('JSObject');
            });

            it('should be unwrapped by returning the original JS object', function () {
                expect(this.value.getNative()).to.equal(this.nativeObject);
            });
        });

        describe('stdClass instances', function () {
            beforeEach(function () {
                this.classObject.getName.returns('stdClass');
            });

            it('should be unwrapped as a plain object with properties unwrapped recursively', function () {
                var subObject = new ObjectValue(
                    this.factory,
                    this.callStack,
                    this.translator,
                    {},
                    this.classObject,
                    this.objectID
                );
                subObject.declareProperty('firstNestedProp', this.classObject, 'public')
                    .initialise(this.factory.createString('value of first nested prop'));
                subObject.declareProperty('secondNestedProp', this.classObject, 'public')
                    .initialise(this.factory.createString('value of second nested prop'));
                this.value.declareProperty('objectProp', this.classObject, 'public').initialise(subObject);

                expect(this.value.getNative()).to.deep.equal({
                    firstProp: 'the value of firstProp',
                    secondProp: 'the value of secondProp',
                    objectProp: {
                        firstNestedProp: 'value of first nested prop',
                        secondNestedProp:  'value of second nested prop'
                    }
                });
            });
        });

        describe('instances of other classes', function () {
            beforeEach(function () {
                this.classObject.getName.returns('Some\\Other\\MyClass');
            });

            it('should be unwrapped via the class', function () {
                var unwrappedObject = {};
                this.classObject.unwrapInstanceForJS
                    .withArgs(sinon.match.same(this.value), sinon.match.same(this.nativeObject))
                    .returns(unwrappedObject);

                expect(this.value.getNative()).to.equal(unwrappedObject);
            });
        });
    });

    describe('getObject()', function () {
        it('should return the wrapped native object', function () {
            expect(this.value.getObject()).to.equal(this.nativeObject);
        });
    });

    describe('getPropertyNames()', function () {
        it('should return all instance property names as native strings', function () {
            expect(this.value.getPropertyNames()).to.deep.equal([
                'firstProp',
                'secondProp'
            ]);
        });
    });

    describe('getProxy()', function () {
        it('should wrap the instance in a proxying PHPObject instance via the class', function () {
            var wrapperPHPObject = sinon.createStubInstance(PHPObject);
            this.classObject.proxyInstanceForJS
                .withArgs(sinon.match.same(this.value))
                .returns(wrapperPHPObject);

            expect(this.value.getProxy()).to.equal(wrapperPHPObject);
        });
    });

    describe('getReference()', function () {
        it('should throw an error', function () {
            expect(function () {
                this.value.getReference();
            }.bind(this)).to.throw('Cannot get a reference to a value');
        });
    });

    describe('getStaticPropertyByName()', function () {
        it('should fetch the static property reference from the class of the object', function () {
            var propertyReference = sinon.createStubInstance(StaticPropertyReference);
            this.classObject.getStaticPropertyByName
                .withArgs('myProp')
                .returns(propertyReference);

            expect(this.value.getStaticPropertyByName(this.factory.createString('myProp'), this.namespaceScope))
                .to.equal(propertyReference);
        });
    });

    describe('getValueOrNull()', function () {
        it('should just return this value, as values are always classed as "defined"', function () {
            expect(this.value.getValueOrNull()).to.equal(this.value);
        });
    });

    describe('instantiate()', function () {
        beforeEach(function () {
            this.arg1Value = this.factory.createInteger(21);
        });

        describe('for an instance of a PHP class', function () {
            it('should return a new instance of that class', function () {
                var newObjectValue = sinon.createStubInstance(ObjectValue),
                    resultObjectValue;
                this.classObject.instantiate.withArgs([sinon.match.same(this.arg1Value)]).returns(newObjectValue);

                resultObjectValue = this.value.instantiate([this.arg1Value]);

                expect(resultObjectValue).to.equal(newObjectValue);
            });
        });

        describe('for a JSObject instance wrapping a JS function', function () {
            beforeEach(function () {
                this.classObject.getName.returns('JSObject');
                this.JSClass = sinon.stub();
                this.nativeObject = this.JSClass;

                sinon.stub(this.factory, 'coerceObject').callsFake(function (nativeObject) {
                    var newObjectValue = sinon.createStubInstance(ObjectValue);
                    newObjectValue.getClass.returns(this.classObject);
                    newObjectValue.getObject.returns(nativeObject);
                    return newObjectValue;
                }.bind(this));

                this.value = new ObjectValue(
                    this.factory,
                    this.callStack,
                    this.translator,
                    this.nativeObject,
                    this.classObject,
                    this.objectID
                );
            });

            it('should return a JSObject wrapping a new instance of the JS function/class', function () {
                var resultObjectValue;

                resultObjectValue = this.value.instantiate([this.arg1Value]);

                expect(resultObjectValue).to.be.an.instanceOf(ObjectValue);
                expect(resultObjectValue.getClass()).to.equal(this.classObject);
                expect(resultObjectValue.getObject()).to.be.an.instanceOf(this.JSClass);
            });

            it('should call the native JS function/class/constructor on the new native JS object with unwrapped args', function () {
                var resultObjectValue;
                this.JSClass.callsFake(function () {
                    this.myProp = 1009;
                });

                resultObjectValue = this.value.instantiate([this.arg1Value]);

                expect(this.JSClass).to.have.been.calledOnce;
                expect(resultObjectValue.getObject().myProp).to.equal(1009);
                expect(this.JSClass).to.have.been.calledWith(21);
            });

            it('should allow a native JS constructor function to return a different object to use', function () {
                var resultObjectValue,
                    resultNativeObject = {my: 'native object'};
                this.JSClass.returns(resultNativeObject);

                resultObjectValue = this.value.instantiate([this.arg1Value]);

                expect(resultObjectValue).to.be.an.instanceOf(ObjectValue);
                expect(resultObjectValue.getClass()).to.equal(this.classObject);
                expect(resultObjectValue.getObject()).to.equal(resultNativeObject);
            });
        });

        describe('for a JSObject instance wrapping a non-function JS object', function () {
            beforeEach(function () {
                this.classObject.getName.returns('JSObject');
                this.nativeObject = {};

                this.value = new ObjectValue(
                    this.factory,
                    this.callStack,
                    this.translator,
                    this.nativeObject,
                    this.classObject,
                    this.objectID
                );
            });

            it('should throw, as only native JS functions are supported by the bridge integration', function () {
                expect(function () {
                    this.value.instantiate([this.arg1Value]);
                }.bind(this)).to.throw('Cannot create a new instance of a non-function JSObject');
            });
        });
    });

    describe('invokeClosure()', function () {
        beforeEach(function () {
            this.closure = sinon.createStubInstance(Closure);
            this.value = new ObjectValue(
                this.factory,
                this.callStack,
                this.translator,
                this.closure,
                this.classObject,
                this.objectID
            );
        });

        it('should pass the provided arguments to Closure.invoke(...)', function () {
            var arg1 = sinon.createStubInstance(Value),
                arg2 = sinon.createStubInstance(Value);

            this.value.invokeClosure([arg1, arg2]);

            expect(this.closure.invoke).to.have.been.calledOnce;
            expect(this.closure.invoke).to.have.been.calledWith(
                [sinon.match.same(arg1), sinon.match.same(arg2)]
            );
        });

        it('should return the result from Closure.invoke(...)', function () {
            var resultValue = sinon.createStubInstance(Value);
            this.closure.invoke.returns(resultValue);

            expect(this.value.invokeClosure([])).to.equal(resultValue);
        });

        it('should throw when the native value is not an instance of Closure', function () {
            var value = new ObjectValue(
                this.factory,
                this.callStack,
                this.translator,
                {},
                this.classObject,
                this.objectID
            );

            expect(function () {
                value.invokeClosure([]);
            }.bind(this)).to.throw('bindClosure() :: Value is not a Closure');
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

    describe('isCallable()', function () {
        beforeEach(function () {
            this.classObject.getMethodSpec
                .returns(null);
            this.classObject.is
                .withArgs('Closure')
                .returns(false);
        });

        it('should return true for an instance of Closure', function () {
            this.classObject.is
                .withArgs('Closure')
                .returns(true);

            expect(this.value.isCallable()).to.be.true;
        });

        it('should return true for an instance of a non-Closure class implementing ->__invoke()', function () {
            var methodSpec = sinon.createStubInstance(MethodSpec);
            this.classObject.getMethodSpec
                .withArgs('__invoke')
                .returns(methodSpec);

            expect(this.value.isCallable()).to.be.true;
        });

        it('should return false for a non-Closure instance that doesn\'t implement ->__invoke()', function () {
            expect(this.value.isCallable()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return false', function () {
            expect(this.value.isEmpty()).to.be.false;
        });
    });

    describe('isEqualToObject()', function () {
        beforeEach(function () {
            this.anotherClass = sinon.createStubInstance(Class);
        });

        it('should return true when given the same object', function () {
            expect(this.value.isEqualToObject(this.value).getNative()).to.be.true;
        });

        it('should return true when given another object with identical properties and of the same class', function () {
            var otherObject = new ObjectValue(this.factory, this.callStack, this.translator, {}, this.classObject, 22);
            otherObject.declareProperty('firstProp', this.classObject, 'public').initialise(this.prop1);
            otherObject.declareProperty('secondProp', this.classObject, 'public').initialise(this.prop2);

            expect(this.value.isEqualToObject(otherObject).getNative()).to.be.true;
        });

        it('should return false when given another object with identical properties but of another class', function () {
            var otherObject = new ObjectValue(this.factory, this.callStack, this.translator, {}, this.anotherClass, 22);
            otherObject.declareProperty('firstProp', this.classObject, 'public').initialise(this.prop1);
            otherObject.declareProperty('secondProp', this.classObject, 'public').initialise(this.prop2);

            expect(this.value.isEqualToObject(otherObject).getNative()).to.be.false;
        });

        it('should return false when given another object with different properties but of the same class', function () {
            var otherObject = new ObjectValue(this.factory, this.callStack, this.translator, {}, this.classObject, 22);
            otherObject.declareProperty('firstProp', this.classObject, 'public').initialise(this.prop1);
            otherObject.declareProperty('secondProp', this.classObject, 'public')
                .initialise(this.factory.createInteger(1001));

            expect(this.value.isEqualToObject(otherObject).getNative()).to.be.false;
        });
    });

    describe('isIterable()', function () {
        it('should return true when the object is an instance of Traversable', function () {
            this.classObject.is
                .withArgs('Traversable')
                .returns(true);

            expect(this.value.isIterable()).to.be.true;
        });

        it('should return false when the object is not an instance of Traversable', function () {
            this.classObject.is
                .withArgs('Traversable')
                .returns(false);

            expect(this.value.isIterable()).to.be.false;
        });
    });

    describe('isMethodDefined()', function () {
        it('should return true when the method is defined', function () {
            this.classObject.getMethodSpec.withArgs('myMethod').returns(sinon.createStubInstance(MethodSpec));

            expect(this.value.isMethodDefined('myMethod')).to.be.true;
        });

        it('should return false when the method is not defined', function () {
            this.classObject.getMethodSpec.withArgs('myMethod').returns(null);

            expect(this.value.isMethodDefined('myMethod')).to.be.false;
        });
    });

    describe('isNotFinished()', function () {
        describe('when the object implements Iterator', function () {
            beforeEach(function () {
                this.classObject.is.withArgs('Iterator').returns(true);
                this.classObject.is.returns(false);
            });

            it('should return true when ->valid() does', function () {
                this.classObject.callMethod.withArgs('valid').returns(this.factory.createBoolean(true));

                expect(this.value.isNotFinished()).to.be.true;
            });

            it('should return false when ->valid() does', function () {
                this.classObject.callMethod.withArgs('valid').returns(this.factory.createBoolean(false));

                expect(this.value.isNotFinished()).to.be.false;
            });

            it('should return true when ->valid() returns a truthy value', function () {
                this.classObject.callMethod.withArgs('valid').returns(this.factory.createString('yep'));

                expect(this.value.isNotFinished()).to.be.true;
            });

            it('should return false when ->valid() returns a falsy value', function () {
                this.classObject.callMethod.withArgs('valid').returns(this.factory.createFloat(0.0));

                expect(this.value.isNotFinished()).to.be.false;
            });
        });

        describe('when the object does not implement Iterator', function () {
            it('should throw an exception', function () {
                this.classObject.is.returns(false);

                expect(function () {
                    this.value.isNotFinished();
                }.bind(this)).to.throw(Exception, 'ObjectValue.isNotFinished() :: Object does not implement Iterator');
            });
        });
    });

    describe('isNumeric()', function () {
        it('should return false', function () {
            expect(this.value.isNumeric()).to.be.false;
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
            subjectClassObject.getSuperClass.returns(null);
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
            subjectClassObject.getSuperClass.returns(null);
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

    describe('multiply()', function () {
        it('should hand off to the right-hand operand to multiply by this object', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            rightOperand.multiplyByObject.withArgs(this.value).returns(result);

            expect(this.value.multiply(rightOperand)).to.equal(result);
        });
    });

    describe('multiplyByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createArray([]);

            expect(function () {
                this.value.multiplyByArray(leftValue);
            }.bind(this)).to.throw(
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
                beforeEach(function () {
                    this.leftValue = this.factory.createBoolean(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = this.value.multiplyByBoolean(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    this.classObject.getName.returns('MyClass');

                    this.value.multiplyByBoolean(this.leftValue);

                    expect(this.callStack.raiseError).to.have.been.calledOnce;
                    expect(this.callStack.raiseError).to.have.been.calledWith(
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
                beforeEach(function () {
                    this.leftValue = this.factory.createFloat(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = this.value.multiplyByFloat(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    this.classObject.getName.returns('MyObjClass');

                    this.value.multiplyByFloat(this.leftValue);

                    expect(this.callStack.raiseError).to.have.been.calledOnce;
                    expect(this.callStack.raiseError).to.have.been.calledWith(
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
                beforeEach(function () {
                    this.leftValue = this.factory.createInteger(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = this.value.multiplyByInteger(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    this.classObject.getName.returns('MyClass');

                    this.value.multiplyByInteger(this.leftValue);

                    expect(this.callStack.raiseError).to.have.been.calledOnce;
                    expect(this.callStack.raiseError).to.have.been.calledWith(
                        PHPError.E_NOTICE,
                        'Object of class MyClass could not be converted to number'
                    );
                });
            });
        });
    });

    describe('multiplyByNull()', function () {
        describe('for `null * <object>`', function () {
            beforeEach(function () {
                this.leftValue = sinon.createStubInstance(NullValue);
                this.leftValue.getNative.returns(null);

                this.coercedLeftValue = sinon.createStubInstance(IntegerValue);
                this.coercedLeftValue.getNative.returns(0);
                this.leftValue.coerceToNumber.returns(this.coercedLeftValue);
            });

            it('should return int(0)', function () {
                var result = this.value.multiplyByNull(this.leftValue);

                expect(result).to.be.an.instanceOf(IntegerValue);
                expect(result.getNative()).to.equal(0);
            });

            it('should raise a notice due to coercion of object to int', function () {
                this.classObject.getName.returns('MyClass');

                this.value.multiplyByNull(this.leftValue);

                expect(this.callStack.raiseError).to.have.been.calledOnce;
                expect(this.callStack.raiseError).to.have.been.calledWith(
                    PHPError.E_NOTICE,
                    'Object of class MyClass could not be converted to number'
                );
            });
        });
    });

    describe('multiplyByObject()', function () {
        beforeEach(function () {
            this.leftValue = sinon.createStubInstance(ObjectValue);
            this.leftValue.getNative.returns({});

            this.coercedLeftValue = sinon.createStubInstance(IntegerValue);
            this.coercedLeftValue.getNative.returns(1);
            this.leftValue.coerceToNumber.returns(this.coercedLeftValue);
        });

        it('should return int(1)', function () {
            var result = this.value.multiplyByObject(this.leftValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(1);
        });

        it('should raise a notice due to coercion of object to int', function () {
            this.classObject.getName.returns('MyClass');

            this.value.multiplyByObject(this.leftValue);

            expect(this.callStack.raiseError).to.have.been.calledOnce;
            expect(this.callStack.raiseError).to.have.been.calledWith(
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
                beforeEach(function () {
                    this.leftValue = this.factory.createString(scenario.left);
                });

                it('should return the correct value', function () {
                    var result = this.value.multiplyByString(this.leftValue);

                    expect(result).to.be.an.instanceOf(scenario.expectedResultType);
                    expect(result.getNative()).to.equal(scenario.expectedResult);
                });

                it('should raise a notice due to coercion of object to int', function () {
                    this.classObject.getName.returns('MyClass');

                    this.value.multiplyByString(this.leftValue);

                    expect(this.callStack.raiseError).to.have.been.calledOnce;
                    expect(this.callStack.raiseError).to.have.been.calledWith(
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

    describe('subtractFromNull()', function () {
        it('should throw an "Unsupported operand" error', function () {
            expect(function () {
                this.value.subtractFromNull();
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });
});
