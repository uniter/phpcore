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
    tools = require('../tools'),
    BarewordStringValue = require('../../../src/Value/BarewordString').sync(),
    BooleanValue = require('../../../src/Value/Boolean').sync(),
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    KeyValuePair = require('../../../src/KeyValuePair'),
    Namespace = require('../../../src/Namespace').sync(),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    Value = require('../../../src/Value').sync();

describe('BarewordStringValue', function () {
    var callStack,
        createKeyValuePair,
        createValue,
        factory,
        flow,
        futureFactory,
        globalNamespace,
        namespaceScope,
        numericStringParser,
        referenceFactory,
        state,
        value;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        factory = state.getValueFactory();
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        globalNamespace = state.getGlobalNamespace();
        namespaceScope = sinon.createStubInstance(NamespaceScope);
        numericStringParser = state.getService('numeric_string_parser');
        referenceFactory = state.getReferenceFactory();

        callStack.raiseTranslatedError.callsFake(function (level, translationKey, placeholderVariables, errorClass) {
            if (level !== PHPError.E_ERROR) {
                return;
            }

            throw new Error(
                'Fake PHP ' + level +
                (errorClass ? ' (' + errorClass + ')' : '') +
                ' for #' + translationKey +
                ' with ' + JSON.stringify(placeholderVariables || {})
            );
        });

        createKeyValuePair = function (key, value) {
            var keyValuePair = sinon.createStubInstance(KeyValuePair);
            keyValuePair.getKey.returns(key);
            keyValuePair.getValue.returns(value);
            return keyValuePair;
        };

        createValue = function (nativeValue) {
            value = new BarewordStringValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack,
                flow,
                nativeValue,
                globalNamespace,
                numericStringParser,
                namespaceScope
            );
        };
    });

    describe('add()', function () {
        it('should raise a fatal error when right addend is an array', function () {
            createValue('mybarewordstring');

            expect(function () {
                value.add(factory.createArray([]));
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"string","operator":"+","right":"array"}'
            );
        });
    });

    describe('asFuture()', function () {
        it('should return a Present that resolves to this value', function () {
            createValue('mybareword');

            return expect(value.asFuture().toPromise()).to.eventually.equal(value);
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
        it('should ask the class to call the method and return its result when non-forwarding', async function () {
            var argValue = sinon.createStubInstance(Value),
                classObject = sinon.createStubInstance(Class),
                methodNameValue = factory.createString('myMethod'),
                result,
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(factory.createPresent(resultValue));
            namespaceScope.getClass.withArgs('My\\Space\\MyClass').returns(futureFactory.createPresent(classObject));
            createValue('My\\Space\\MyClass');

            result = await value.callStaticMethod(methodNameValue, [argValue], false).toPromise();

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

        it('should ask the class to call the method and return its result when forwarding', async function () {
            var argValue = sinon.createStubInstance(Value),
                classObject = sinon.createStubInstance(Class),
                methodNameValue = factory.createString('myMethod'),
                result,
                resultValue = sinon.createStubInstance(Value);
            classObject.callMethod.returns(factory.createPresent(resultValue));
            namespaceScope.getClass.withArgs('My\\Space\\MyClass').returns(futureFactory.createPresent(classObject));
            createValue('My\\Space\\MyClass');

            result = await value.callStaticMethod(methodNameValue, [argValue], true).toPromise();

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

    describe('divideBy()', function () {
        it('should throw an "Unsupported operand" error when divisor is an array', function () {
            var divisorValue = factory.createArray([]);
            createValue('mybarewordstring');

            expect(function () {
                value.divideBy(divisorValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"string","operator":"/","right":"array"}'
            );
        });
    });

    describe('getCallableName()', function () {
        var namespace;

        beforeEach(function () {
            namespace = sinon.createStubInstance(Namespace);
            namespace.getPrefix.returns('Full\\Path\\To\\Mine\\');
            namespaceScope.resolveName.withArgs('Mine\\MyClass').returns({
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
        it('should fetch the constant from the class', async function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue = sinon.createStubInstance(Value);
            resultValue.next.yields(resultValue);
            resultValue.toPromise.returns(Promise.resolve(resultValue));
            namespaceScope.getClass
                .withArgs('This\\SubSpace\\MyClass')
                .returns(futureFactory.createPresent(classObject));
            classObject.getConstantByName
                .withArgs('MY_CONST')
                .returns(resultValue);
            createValue('This\\SubSpace\\MyClass');

            expect(await value.getConstantByName('MY_CONST', namespaceScope).toPromise()).to.equal(resultValue);
        });

        it('should not autoload when the special ::class constant for an undefined class', async function () {
            var namespace,
                resultValue;
            namespace = sinon.createStubInstance(Namespace);
            namespace.getPrefix.returns('Some\\SubSpace\\');
            namespaceScope.resolveName.withArgs('Some\\SubSpace\\SomeUndefinedClass').returns({
                namespace: namespace,
                name: 'SomeUndefinedClass'
            });
            createValue('Some\\SubSpace\\SomeUndefinedClass');

            resultValue = await value.getConstantByName('class', namespaceScope).toPromise();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('Some\\SubSpace\\SomeUndefinedClass');
            expect(namespaceScope.getClass).not.to.have.been.called;
        });
    });

    describe('getDisplayType()', function () {
        it('should return the value type', function () {
            createValue('mybarewordstring');

            expect(value.getDisplayType()).to.equal('string');
        });
    });

    describe('getOutgoingValues()', function () {
        it('should return an empty array as scalars cannot refer to anything', function () {
            createValue('mybarewordstring');

            expect(value.getOutgoingValues()).to.deep.equal([]);
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
        it('should fetch the property\'s value from the class', async function () {
            var classObject = sinon.createStubInstance(Class),
                resultValue = sinon.createStubInstance(Value);
            resultValue.next.yields(resultValue);
            resultValue.toPromise.returns(Promise.resolve(resultValue));
            namespaceScope.getClass
                .withArgs('This\\SubSpace\\MyClass')
                .returns(futureFactory.createPresent(classObject));
            classObject.getStaticPropertyByName
                .withArgs('myProp')
                .returns(resultValue);
            createValue('This\\SubSpace\\MyClass');

            expect(
                await value.getStaticPropertyByName(
                    factory.createString('myProp'),
                    namespaceScope
                ).toPromise()
            ).to.equal(resultValue);
        });
    });

    describe('getType()', function () {
        it('should return "string"', function () {
            createValue('mybareword');

            // Note "string" and not "bareword" as for the underlying type below.
            expect(value.getType()).to.equal('string');
        });
    });

    describe('getUnderlyingType()', function () {
        it('should return "bareword"', function () {
            createValue('mybareword');

            expect(value.getUnderlyingType()).to.equal('bareword');
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
            namespaceScope.getClass
                .withArgs('My\\Space\\MyClass')
                .returns(futureFactory.createPresent(classObject));
            newObjectValue = sinon.createStubInstance(ObjectValue);
            newObjectValue.next.yields(newObjectValue);
            newObjectValue.toPromise.returns(Promise.resolve(newObjectValue));
            classObject.instantiate.returns(newObjectValue);
        });

        it('should pass the args along', function () {
            var argValue = sinon.createStubInstance(IntegerValue);
            createValue('My\\Space\\MyClass');

            value.instantiate([argValue]);

            expect(classObject.instantiate).to.have.been.calledOnce;
            expect(classObject.instantiate).to.have.been.calledWith([sinon.match.same(argValue)]);
        });

        it('should return the new instance created by the class', async function () {
            createValue('My\\Space\\MyClass');

            expect(await value.instantiate([]).toPromise()).to.equal(newObjectValue);
        });
    });

    describe('isNumeric()', function () {
        it('should return false', function () {
            createValue('mybarewordstring');

            expect(value.isNumeric()).to.be.false;
        });
    });

    describe('isReferenceable()', function () {
        it('should return false', function () {
            createValue('mybarewordstring');

            expect(value.isReferenceable()).to.be.false;
        });
    });

    describe('isScalar()', function () {
        it('should return true', function () {
            createValue('mybarewordstring');

            expect(value.isScalar()).to.be.true;
        });
    });

    describe('isStructured()', function () {
        it('should return false', function () {
            createValue('mybarewordstring');

            expect(value.isStructured()).to.be.false;
        });
    });

    describe('isTheClassOfObject()', function () {
        var namespace;

        beforeEach(function () {
            namespace = sinon.createStubInstance(Namespace);
            namespace.getPrefix.returns('Full\\Path\\To\\Mine\\');
            namespaceScope.resolveName.withArgs('Mine\\MyClass').returns({
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

    describe('modulo()', function () {
        // Note that modulo is not actually applicable as legal barewords cannot be numeric.
        // These tests are included for completeness.

        it('should return the correct remainder of 3 for 23 mod 5', function () {
            var result,
                rightValue = factory.createInteger(5);
            createValue('23');

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(3);
        });

        it('should return the correct remainder of 0 for 10 mod 2', function () {
            var result,
                rightValue = factory.createInteger(2);
            createValue('10');

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(0);
        });

        it('should return the correct remainder of 4 for 24 mod 5', function () {
            var result,
                rightValue = factory.createInteger(5);
            createValue('24');

            result = value.modulo(rightValue);

            expect(result).to.be.an.instanceOf(IntegerValue);
            expect(result.getNative()).to.equal(4);
        });
    });

    describe('next()', function () {
        beforeEach(function () {
            createValue('mybarewordstring');
        });

        it('should just return the value when no callback given', function () {
            expect(value.next()).to.equal(value);
        });

        it('should invoke the callback with the value and return the chainified result', async function () {
            var callback = sinon.stub();
            callback.withArgs(sinon.match.same(value)).returns('my result');

            expect(await value.next(callback).toPromise()).to.equal('my result');
        });

        it('should return a rejected Future when the callback raises an error', async function () {
            var callback = sinon.stub(),
                result;
            callback.withArgs(sinon.match.same(value)).throws(new Error('Bang!'));

            result = value.next(callback);

            await expect(result.toPromise()).to.eventually.be.rejectedWith('Bang!');
        });
    });

    describe('nextIsolated()', function () {
        beforeEach(function () {
            createValue('mybareword');
        });

        it('should invoke the given callback with the value', function () {
            var callback = sinon.stub();

            value.nextIsolated(callback);

            expect(callback).to.have.been.calledOnce;
            expect(callback).to.have.been.calledWith(sinon.match.same(value));
        });

        it('should do nothing when no callback is given', function () {
            expect(function () {
                value.nextIsolated();
            }).not.to.throw();
        });
    });

    describe('subtract()', function () {
        it('should throw an "Unsupported operand" error when subtrahend is an array', function () {
            var subtrahendValue = factory.createArray([]);
            createValue('mybarewordstring');

            expect(function () {
                value.subtract(subtrahendValue);
            }).to.throw(
                'Fake PHP Fatal error (TypeError) for #core.unsupported_operand_types ' +
                'with {"left":"string","operator":"-","right":"array"}'
            );
        });
    });
});
