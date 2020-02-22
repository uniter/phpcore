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
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = new ValueFactory();
        this.namespaceScope = sinon.createStubInstance(NamespaceScope);

        this.callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables) {
            throw new Error(
                'Fake PHP ' + level + ' for #' + translationKey + ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        this.createKeyValuePair = function (key, value) {
            var keyValuePair = sinon.createStubInstance(KeyValuePair);
            keyValuePair.getKey.returns(key);
            keyValuePair.getValue.returns(value);
            return keyValuePair;
        };

        this.createValue = function (nativeValue) {
            this.value = new BarewordStringValue(this.factory, this.callStack, nativeValue);
        }.bind(this);
    });

    describe('addToArray()', function () {
        it('should raise a fatal error', function () {
            this.createValue('mybarewordstring');

            expect(function () {
                this.value.addToArray(this.factory.createArray([]));
            }.bind(this)).to.throw(
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
            this.namespaceScope.getFunction.withArgs('This\\SubSpace\\my_function').returns(func);
            this.createValue('This\\SubSpace\\my_function');

            result = this.value.call([argValue], this.namespaceScope);

            expect(result).to.equal(resultValue);
            expect(func).to.have.been.calledOnce;
            expect(func).to.have.been.calledOn(null);
            expect(func).to.have.been.calledWith(sinon.match.same(argValue));
        });
    });

    describe('callMethod()', function () {
        it('should throw, as instance methods cannot exist on non-objects', function () {
            this.createValue('something');

            expect(function () {
                this.value.callMethod('aMethod', [], this.namespaceScope);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.non_object_method_call with {"name":"aMethod","type":"string"}'
            );
        });
    });

    describe('callStaticMethod()', function () {
        it('should ask the class to call the method and return its result when non-forwarding', function () {
            var argValue = sinon.createStubInstance(Value),
                classObject = sinon.createStubInstance(Class),
                methodNameValue = this.factory.createString('myMethod'),
                result,
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(resultValue);
            this.namespaceScope.getClass.withArgs('My\\Space\\MyClass').returns(classObject);
            this.createValue('My\\Space\\MyClass');

            result = this.value.callStaticMethod(methodNameValue, [argValue], this.namespaceScope, false);

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
                methodNameValue = this.factory.createString('myMethod'),
                result,
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(resultValue);
            this.namespaceScope.getClass.withArgs('My\\Space\\MyClass').returns(classObject);
            this.createValue('My\\Space\\MyClass');

            result = this.value.callStaticMethod(methodNameValue, [argValue], this.namespaceScope, true);

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
            this.createValue('mybarewordstring');

            expect(function () {
                this.value.coerceToNativeError();
            }.bind(this)).to.throw(
                'Only instances of Throwable may be thrown: tried to throw a(n) string'
            );
        });
    });

    describe('divide()', function () {
        it('should hand off to the right-hand operand to divide by this string', function () {
            var rightOperand = sinon.createStubInstance(Value),
                result = sinon.createStubInstance(Value);
            this.createValue('mybarewordstring');
            rightOperand.divideByString.withArgs(this.value).returns(result);

            expect(this.value.divide(rightOperand)).to.equal(result);
        });
    });

    describe('divideByArray()', function () {
        it('should throw an "Unsupported operand" error', function () {
            var leftValue = this.factory.createArray([]);
            this.createValue('mybarewordstring');

            expect(function () {
                this.value.divideByArray(leftValue);
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });

    describe('getCallableName()', function () {
        beforeEach(function () {
            this.namespace = sinon.createStubInstance(Namespace);
            this.namespace.getPrefix.returns('Full\\Path\\To\\Mine\\');
            this.namespaceScope.resolveClass.withArgs('Mine\\MyClass').returns({
                namespace: this.namespace,
                name: 'MyClass'
            });
        });

        it('should return the resolved FQCN', function () {
            this.createValue('Mine\\MyClass');

            expect(this.value.getCallableName(this.namespaceScope)).to.equal('Full\\Path\\To\\Mine\\MyClass');
        });
    });

    describe('getConstantByName()', function () {
        it('should fetch the constant from the class', function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue = sinon.createStubInstance(Value);
            this.namespaceScope.getClass.withArgs('This\\SubSpace\\MyClass').returns(classObject);
            classObject.getConstantByName.withArgs('MY_CONST').returns(resultValue);
            this.createValue('This\\SubSpace\\MyClass');

            expect(this.value.getConstantByName('MY_CONST', this.namespaceScope)).to.equal(resultValue);
        });
    });

    describe('getDisplayType()', function () {
        it('should return the value type', function () {
            this.createValue('mybarewordstring');

            expect(this.value.getDisplayType()).to.equal('string');
        });
    });

    describe('getReference()', function () {
        it('should throw an error', function () {
            this.createValue('mybarewordstring');

            expect(function () {
                this.value.getReference();
            }.bind(this)).to.throw('Cannot get a reference to a value');
        });
    });

    describe('getStaticPropertyByName()', function () {
        it('should fetch the property\'s value from the class', function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue = sinon.createStubInstance(Value);
            this.namespaceScope.getClass.withArgs('This\\SubSpace\\MyClass').returns(classObject);
            classObject.getStaticPropertyByName.withArgs('myProp').returns(resultValue);
            this.createValue('This\\SubSpace\\MyClass');

            expect(
                this.value.getStaticPropertyByName(
                    this.factory.createString('myProp'),
                    this.namespaceScope
                )
            ).to.equal(resultValue);
        });
    });

    describe('instantiate()', function () {
        beforeEach(function () {
            this.classObject = sinon.createStubInstance(Class);
            this.namespaceScope.getClass.withArgs('My\\Space\\MyClass').returns(this.classObject);
            this.newObjectValue = sinon.createStubInstance(ObjectValue);
            this.classObject.instantiate.returns(this.newObjectValue);
        });

        it('should pass the args along', function () {
            var argValue = sinon.createStubInstance(IntegerValue);
            this.createValue('My\\Space\\MyClass');

            this.value.instantiate([argValue], this.namespaceScope);

            expect(this.classObject.instantiate).to.have.been.calledOnce;
            expect(this.classObject.instantiate).to.have.been.calledWith([sinon.match.same(argValue)]);
        });

        it('should return the new instance created by the class', function () {
            this.createValue('My\\Space\\MyClass');

            expect(this.value.instantiate([], this.namespaceScope)).to.equal(this.newObjectValue);
        });
    });

    describe('isNumeric()', function () {
        it('should return false', function () {
            expect(this.value.isNumeric()).to.be.false;
        });
    });

    describe('isTheClassOfObject()', function () {
        beforeEach(function () {
            this.namespace = sinon.createStubInstance(Namespace);
            this.namespace.getPrefix.returns('Full\\Path\\To\\Mine\\');
            this.namespaceScope.resolveClass.withArgs('Mine\\MyClass').returns({
                namespace: this.namespace,
                name: 'MyClass'
            });
            this.createValue('Mine\\MyClass');
        });

        it('should return bool(true) when the subject object\'s class is this class', function () {
            var subjectObjectValue = sinon.createStubInstance(ObjectValue),
                result;
            subjectObjectValue.classIs.withArgs('Full\\Path\\To\\Mine\\MyClass').returns(true);

            result = this.value.isTheClassOfObject(subjectObjectValue, this.namespaceScope);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(true);
        });

        it('should return bool(false) when the subject object\'s class is not this class', function () {
            var subjectObjectValue = sinon.createStubInstance(ObjectValue),
                result;
            subjectObjectValue.classIs.withArgs('Full\\Path\\To\\Mine\\MyClass').returns(false);

            result = this.value.isTheClassOfObject(subjectObjectValue, this.namespaceScope);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });

    describe('subtractFromNull()', function () {
        it('should throw an "Unsupported operand" error', function () {
            this.createValue('mybarewordstring');

            expect(function () {
                this.value.subtractFromNull();
            }.bind(this)).to.throw(
                'Fake PHP Fatal error for #core.unsupported_operand_types with {}'
            );
        });
    });
});
