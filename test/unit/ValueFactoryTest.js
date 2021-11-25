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
    tools = require('./tools'),
    BarewordStringValue = require('../../src/Value/BarewordString').sync(),
    CallFactory = require('../../src/CallFactory'),
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    Closure = require('../../src/Closure').sync(),
    ArrayIterator = require('../../src/Iterator/ArrayIterator'),
    ArrayValue = require('../../src/Value/Array').sync(),
    ElementProvider = require('../../src/Reference/Element/ElementProvider'),
    ErrorPromoter = require('../../src/Error/ErrorPromoter'),
    Exception = phpCommon.Exception,
    FFIResult = require('../../src/FFI/Result'),
    IntegerValue = require('../../src/Value/Integer').sync(),
    Namespace = require('../../src/Namespace').sync(),
    NullValue = require('../../src/Value/Null').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    PHPObject = require('../../src/FFI/Value/PHPObject').sync(),
    Translator = phpCommon.Translator,
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync(),
    ValueStorage = require('../../src/FFI/Value/ValueStorage');

describe('ValueFactory', function () {
    var callFactory,
        callStack,
        elementProvider,
        errorPromoter,
        factory,
        futureFactory,
        globalNamespace,
        referenceFactory,
        state,
        translator,
        valueStorage;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState(null, {
            'call_stack': callStack
        });
        callFactory = sinon.createStubInstance(CallFactory);
        elementProvider = new ElementProvider();
        errorPromoter = sinon.createStubInstance(ErrorPromoter);
        futureFactory = state.getFutureFactory();
        globalNamespace = sinon.createStubInstance(Namespace);
        referenceFactory = state.getReferenceFactory();
        translator = sinon.createStubInstance(Translator);
        valueStorage = new ValueStorage();

        translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });

        factory = new ValueFactory(
            'sync',
            translator,
            callFactory,
            errorPromoter,
            valueStorage,
            state.getControlBridge(),
            state.getControlScope()
        );
        factory.setCallStack(callStack);
        factory.setElementProvider(elementProvider);
        factory.setFutureFactory(futureFactory);
        factory.setGlobalNamespace(globalNamespace);
        factory.setReferenceFactory(referenceFactory);
    });

    describe('coerce()', function () {
        it('should just return a Value object', function () {
            var value = factory.createInteger(21);

            expect(factory.coerce(value)).to.equal(value);
        });

        it('should resolve an FFIResult', function () {
            var resolvedResult = factory.createInteger(21),
                ffiResult = sinon.createStubInstance(FFIResult);
            ffiResult.resolve
                .returns(resolvedResult);

            expect(factory.coerce(ffiResult)).to.equal(resolvedResult);
        });
    });

    describe('coerceList()', function () {
        it('should coerce all values given for an array-like value', function () {
            var result,
                values = {
                    // Deliberately use an array-like object rather than an array
                    length: 2,
                    0: 'first',
                    1: 'second'
                };

            result = factory.coerceList(values);

            expect(result).to.have.length(2);
            expect(result[0].getType()).to.equal('string');
            expect(result[0].getNative()).to.equal('first');
            expect(result[1].getType()).to.equal('string');
            expect(result[1].getNative()).to.equal('second');
        });
    });

    describe('coerceObject()', function () {
        it('should return ObjectValue instances untouched', function () {
            var value = sinon.createStubInstance(Value);
            value.getType.returns('object');

            expect(factory.coerceObject(value)).to.equal(value);
        });

        it('should throw when a non-Object Value is given', function () {
            expect(function () {
                var value = factory.createInteger(21);

                factory.coerceObject(value);
            }).to.throw(Exception, 'Tried to coerce a Value of type "int" to object');
        });

        it('should wrap native arrays as JSObjects', function () {
            var nativeArray = [21],
                JSObjectClass = sinon.createStubInstance(Class),
                objectValue;
            JSObjectClass.exportInstanceForJS
                .callsFake(function (instance) {
                    return instance.getObject();
                });
            JSObjectClass.getName.returns('JSObject');
            JSObjectClass.getSuperClass.returns(null);
            JSObjectClass.is.withArgs('JSObject').returns(true);
            JSObjectClass.is.returns(false);
            globalNamespace.getClass.withArgs('JSObject')
                .returns(futureFactory.createPresent(JSObjectClass));

            objectValue = factory.coerceObject(nativeArray);

            expect(objectValue).to.be.an.instanceOf(ObjectValue);
            expect(objectValue.classIs('JSObject')).to.be.true;
            expect(objectValue.getNative()).to.equal(nativeArray);
        });

        it('should coerce native null to a NullValue', function () {
            expect(factory.coerceObject(null)).to.be.an.instanceOf(NullValue);
        });

        it('should coerce native undefined to a NullValue', function () {
            expect(factory.coerceObject(void 0)).to.be.an.instanceOf(NullValue);
        });

        it('should throw an error when a string value is provided', function () {
            expect(function () {
                factory.coerceObject('hello');
            }).to.throw(
                'Only objects, null or undefined may be coerced to an object'
            );
        });
    });

    describe('createArray()', function () {
        it('should be able to create an ArrayValue with the given native element values', function () {
            var value = factory.createArray([21, 'second', 'third']);

            expect(value.getType()).to.equal('array');
            expect(value.getLength()).to.equal(3);
            expect(value.getElementByIndex(0).getValue().getType()).to.equal('int');
            expect(value.getElementByIndex(0).getValue().getNative()).to.equal(21);
            expect(value.getElementByIndex(1).getValue().getType()).to.equal('string');
            expect(value.getElementByIndex(1).getValue().getNative()).to.equal('second');
            expect(value.getElementByIndex(2).getValue().getType()).to.equal('string');
            expect(value.getElementByIndex(2).getValue().getNative()).to.equal('third');
        });
    });

    describe('createArrayIterator()', function () {
        it('should return an ArrayIterator on the specified value', function () {
            var arrayValue = sinon.createStubInstance(ArrayValue),
                iterator = factory.createArrayIterator(arrayValue);

            expect(iterator).to.be.an.instanceOf(ArrayIterator);
            expect(iterator.getIteratedValue()).to.equal(arrayValue);
        });
    });

    describe('createBarewordString()', function () {
        it('should return a BarewordString', function () {
            var value = factory.createBarewordString('mybareword');

            expect(value).to.be.an.instanceOf(BarewordStringValue);
            expect(value.getNative()).to.equal('mybareword');
        });
    });

    describe('createBoolean()', function () {
        it('should be able to create a BooleanValue with value true', function () {
            var value = factory.createBoolean(true);

            expect(value.getType()).to.equal('boolean');
            expect(value.getNative()).to.be.true;
        });

        it('should be able to create a BooleanValue with value false', function () {
            var value = factory.createBoolean(false);

            expect(value.getType()).to.equal('boolean');
            expect(value.getNative()).to.be.false;
        });
    });

    describe('createClosureObject()', function () {
        it('should create an ObjectValue of class Closure with the given internal Closure', function () {
            var closureClassObject = sinon.createStubInstance(Class),
                closure = sinon.createStubInstance(Closure),
                objectValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass
                .withArgs('Closure')
                .returns(futureFactory.createPresent(closureClassObject));
            closureClassObject.instantiateWithInternals
                .withArgs(sinon.match.any, {
                    closure: sinon.match.same(closure)
                })
                .returns(objectValue);

            expect(factory.createClosureObject(closure)).to.equal(objectValue);
        });
    });

    describe('createErrorObject()', function () {
        var myClassObject,
            objectValue;

        beforeEach(function () {
            myClassObject = sinon.createStubInstance(Class);
            objectValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass.withArgs('My\\Stuff\\MyErrorClass')
                .returns(futureFactory.createPresent(myClassObject));

            objectValue.getInternalProperty
                .withArgs('reportsOwnContext')
                .returns(false);
            objectValue.setInternalProperty
                .withArgs('reportsOwnContext')
                .callsFake(function (name, value) {
                    objectValue.getInternalProperty
                        .withArgs(name)
                        .returns(value);
                });
            objectValue.getProperty
                .returns(factory.createNull());
            objectValue.setProperty
                .callsFake(function (name, value) {
                    objectValue.getProperty
                        .withArgs(name)
                        .returns(value);
                });
        });

        it('should return a correctly instantiated instance of the Error subclass', function () {
            myClassObject.instantiate
                .withArgs([
                    sinon.match(function (arg) {
                        return arg.getNative() === 'My error message';
                    }),
                    sinon.match(function (arg) {
                        return arg.getNative() === 21;
                    }),
                    sinon.match(function (arg) {
                        return arg.getNative() === null;
                    })
                ])
                .returns(objectValue);

            expect(factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                true
            )).to.equal(objectValue);
        });

        it('should set the reportsOwnContext internal property to true when specified', function () {
            myClassObject.instantiate.returns(objectValue);

            factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                true
            );

            expect(objectValue.getInternalProperty('reportsOwnContext')).to.be.true;
        });

        it('should leave the reportsOwnContext internal property as false when specified', function () {
            myClassObject.instantiate.returns(objectValue);

            factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                false
            );

            expect(objectValue.getInternalProperty('reportsOwnContext')).to.be.false;
        });

        it('should override the "file" property if specified', function () {
            var value;
            myClassObject.instantiate.returns(objectValue);

            factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                false
            );
            value = objectValue.getProperty('file');

            expect(value.getType()).to.equal('string');
            expect(value.getNative()).to.equal('/path/to/my_module.php');
        });

        it('should override the "line" property if specified', function () {
            var value;
            myClassObject.instantiate.returns(objectValue);

            factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                false
            );
            value = objectValue.getProperty('line');

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(1234);
        });
    });

    describe('createExit()', function () {
        it('should return an ExitValue with the specified status value', function () {
            var statusValue = sinon.createStubInstance(IntegerValue);
            statusValue.getNative.returns(21);

            expect(factory.createExit(statusValue).getStatus()).to.equal(21);
        });
    });

    describe('createFloat()', function () {
        it('should return a FloatValue with the specified value', function () {
            var value = factory.createFloat(123.456);

            expect(value.getType()).to.equal('float');
            expect(value.getNative()).to.equal(123.456);
        });
    });

    describe('createFromNative()', function () {
        it('should return an indexed array when an indexed native array is given', function () {
            var nativeArray = [25, 28],
                arrayValue = factory.createFromNative(nativeArray);

            expect(arrayValue).to.be.an.instanceOf(ArrayValue);
            expect(arrayValue.getLength()).to.equal(2);
            expect(arrayValue.getElementByIndex(0).getKey().getNative()).to.equal(0);
            expect(arrayValue.getElementByIndex(0).getValue().getNative()).to.equal(25);
            expect(arrayValue.getElementByIndex(1).getKey().getNative()).to.equal(1);
            expect(arrayValue.getElementByIndex(1).getValue().getNative()).to.equal(28);
        });

        it('should return an associative array when object with non-numeric properties is given', function () {
            var nativeObject = {
                    'hello': 'world',
                    'a-number': 21
                },
                arrayValue = factory.createFromNative(nativeObject);

            expect(arrayValue).to.be.an.instanceOf(ArrayValue);
            expect(arrayValue.getLength()).to.equal(2);
            expect(arrayValue.getElementByIndex(0).getKey().getNative()).to.equal('hello');
            expect(arrayValue.getElementByIndex(0).getValue().getNative()).to.equal('world');
            expect(arrayValue.getElementByIndex(1).getKey().getNative()).to.equal('a-number');
            expect(arrayValue.getElementByIndex(1).getValue().getNative()).to.equal(21);
        });

        it('should return a JSObject when object given and one property is a function', function () {
            var aMethod = function () {},
                nativeObject = {
                    'hello': 'world',
                    'a-method': aMethod
                },
                JSObjectClass = sinon.createStubInstance(Class),
                objectValue;
            JSObjectClass.callMethod.withArgs('__get').callsFake(function (methodName, argValues) {
                if (argValues[0].getNative() === 'hello') {
                    return factory.createString('world');
                }
                if (argValues[0].getNative() === 'a-method') {
                    return factory.coerce(aMethod);
                }
            });
            JSObjectClass.exportInstanceForJS
                .callsFake(function (instance) {
                    return instance.getObject();
                });
            JSObjectClass.getMethodSpec.withArgs('__get').returns({});
            JSObjectClass.getName.returns('JSObject');
            JSObjectClass.getSuperClass.returns(null);
            JSObjectClass.is.withArgs('JSObject').returns(true);
            JSObjectClass.is.returns(false);
            globalNamespace.getClass.withArgs('JSObject')
                .returns(futureFactory.createPresent(JSObjectClass));

            objectValue = factory.createFromNative(nativeObject);

            expect(objectValue).to.be.an.instanceOf(ObjectValue);
            expect(objectValue.classIs('JSObject')).to.be.true;
            expect(objectValue.getElementByIndex(0).getKey().getNative()).to.equal('hello');
            expect(objectValue.getElementByIndex(0).getValue().getNative()).to.equal('world');
            expect(objectValue.getElementByIndex(1).getKey().getNative()).to.equal('a-method');
            expect(objectValue.getElementByIndex(1).getValue().getNative()).to.equal(aMethod);
        });

        it('should return a JSObject when a function is given', function () {
            var nativeFunction = function () {},
                JSObjectClass = sinon.createStubInstance(Class),
                objectValue;
            JSObjectClass.exportInstanceForJS
                .callsFake(function (instance) {
                    return instance.getObject();
                });
            JSObjectClass.getName.returns('JSObject');
            JSObjectClass.getSuperClass.returns(null);
            JSObjectClass.is.withArgs('JSObject').returns(true);
            JSObjectClass.is.returns(false);
            globalNamespace.getClass.withArgs('JSObject')
                .returns(futureFactory.createPresent(JSObjectClass));

            objectValue = factory.createFromNative(nativeFunction);

            expect(objectValue).to.be.an.instanceOf(ObjectValue);
            expect(objectValue.classIs('JSObject')).to.be.true;
            expect(objectValue.getNative()).to.equal(nativeFunction);
        });

        it('should unwrap an object exported as a PHPObject instance back to its original ObjectValue', function () {
            var objectValue = sinon.createStubInstance(ObjectValue),
                phpObject = sinon.createStubInstance(PHPObject);
            phpObject.getObjectValue.returns(objectValue);

            expect(factory.createFromNative(phpObject)).to.equal(objectValue);
        });

        it('should unwrap an object exported as an Unwrapped back to its original ObjectValue', function () {
            var objectValue = sinon.createStubInstance(ObjectValue),
                unwrappedObject = {};
            factory.valueStorage.setObjectValueForExport(unwrappedObject, objectValue);

            expect(factory.createFromNative(unwrappedObject)).to.equal(objectValue);
        });
    });

    describe('createFromNativeArray()', function () {
        it('should push any non-indexed elements onto the end as KeyValuePair objects', function () {
            var arrayValue,
                nativeArray = [21, 27];
            nativeArray.anotherProp = 'hello';

            arrayValue = factory.createFromNativeArray(nativeArray);

            expect(arrayValue).to.be.an.instanceOf(ArrayValue);
            expect(arrayValue.getLength()).to.equal(3);
            expect(arrayValue.getElementByIndex(0).getKey().getNative()).to.equal(0);
            expect(arrayValue.getElementByIndex(0).getValue().getNative()).to.equal(21);
            expect(arrayValue.getElementByIndex(1).getKey().getNative()).to.equal(1);
            expect(arrayValue.getElementByIndex(1).getValue().getNative()).to.equal(27);
            expect(arrayValue.getElementByIndex(2).getKey().getNative()).to.equal('anotherProp');
            expect(arrayValue.getElementByIndex(2).getValue().getNative()).to.equal('hello');
        });
    });

    describe('createInteger()', function () {
        it('should return an IntegerValue with the specified value', function () {
            var value = factory.createInteger(123);

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(123);
        });
    });

    describe('createNull()', function () {
        it('should return a NullValue', function () {
            var value = factory.createNull();

            expect(value.getType()).to.equal('null');
            expect(value.getNative()).to.be.null;
        });

        it('should always return the same NullValue for efficiency', function () {
            var firstNullValue = factory.createNull(),
                secondNullValue = factory.createNull();

            expect(secondNullValue.getType()).to.equal('null');
            expect(secondNullValue).to.equal(firstNullValue);
        });
    });

    describe('createObject()', function () {
        it('should return a correctly constructed ObjectValue', function () {
            var classObject = sinon.createStubInstance(Class),
                nativeObject = {myProp: 'my value'},
                value;

            value = factory.createObject(nativeObject, classObject);

            expect(value.getType()).to.equal('object');
            expect(value.getObject()).to.equal(nativeObject);
            expect(value.getID()).to.equal(1);
        });
    });

    describe('createStdClassObject()', function () {
        it('should return an ObjectValue wrapping the created stdClass instance', function () {
            var value = sinon.createStubInstance(ObjectValue),
                stdClassClass = sinon.createStubInstance(Class);
            globalNamespace.getClass.withArgs('stdClass')
                .returns(futureFactory.createPresent(stdClassClass));
            stdClassClass.getSuperClass.returns(null);
            stdClassClass.instantiate.returns(value);

            expect(factory.createStdClassObject()).to.equal(value);
        });
    });

    describe('createString()', function () {
        it('should return a correctly constructed StringValue', function () {
            var value = factory.createString('my string');

            expect(value.getType()).to.equal('string');
            expect(value.getNative()).to.equal('my string');
        });
    });

    describe('createTranslatedErrorObject()', function () {
        var myClassObject,
            objectValue;

        beforeEach(function () {
            myClassObject = sinon.createStubInstance(Class);
            objectValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass.withArgs('My\\Stuff\\MyErrorClass')
                .returns(futureFactory.createPresent(myClassObject));

            objectValue.getInternalProperty
                .withArgs('reportsOwnContext')
                .returns(false);
            objectValue.setInternalProperty
                .withArgs('reportsOwnContext')
                .callsFake(function (name, value) {
                    objectValue.getInternalProperty
                        .withArgs(name)
                        .returns(value);
                });
            objectValue.getProperty
                .returns(factory.createNull());
            objectValue.setProperty
                .callsFake(function (name, value) {
                    objectValue.getProperty
                        .withArgs(name)
                        .returns(value);
                });
        });

        it('should return a correctly instantiated instance of the Error subclass', function () {
            myClassObject.instantiate
                .withArgs([
                    sinon.match(function (arg) {
                        return arg.getNative() === '[Translated] my_translation {"my_placeholder":"my value"}';
                    }),
                    sinon.match(function (arg) {
                        return arg.getNative() === 21;
                    }),
                    sinon.match(function (arg) {
                        return arg.getNative() === null;
                    })
                ])
                .returns(objectValue);

            expect(factory.createTranslatedErrorObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null,
                '/path/to/my_module.php',
                1234
            )).to.equal(objectValue);
        });

        it('should set the reportsOwnContext internal property to false', function () {
            myClassObject.instantiate.returns(objectValue);

            factory.createTranslatedErrorObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null,
                '/path/to/my_module.php',
                1234
            );

            expect(objectValue.getInternalProperty('reportsOwnContext')).to.be.false;
        });

        it('should override the "file" property if specified', function () {
            var value;
            myClassObject.instantiate.returns(objectValue);

            factory.createTranslatedErrorObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null,
                '/path/to/my_module.php',
                1234
            );
            value = objectValue.getProperty('file');

            expect(value.getType()).to.equal('string');
            expect(value.getNative()).to.equal('/path/to/my_module.php');
        });

        it('should override the "line" property if specified', function () {
            var value;
            myClassObject.instantiate.returns(objectValue);

            factory.createTranslatedErrorObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null,
                '/path/to/my_module.php',
                1234
            );
            value = objectValue.getProperty('line');

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(1234);
        });
    });

    describe('createTranslatedExceptionObject()', function () {
        var myClassObject,
            objectValue;

        beforeEach(function () {
            myClassObject = sinon.createStubInstance(Class);
            objectValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass.withArgs('My\\Stuff\\MyErrorClass')
                .returns(futureFactory.createPresent(myClassObject));

            objectValue.getInternalProperty
                .withArgs('reportsOwnContext')
                .returns(false);
            objectValue.setInternalProperty
                .withArgs('reportsOwnContext')
                .callsFake(function (name, value) {
                    objectValue.getInternalProperty
                        .withArgs(name)
                        .returns(value);
                });
            objectValue.getProperty
                .returns(factory.createNull());
            objectValue.setProperty
                .callsFake(function (name, value) {
                    objectValue.getProperty
                        .withArgs(name)
                        .returns(value);
                });
        });

        it('should return a correctly instantiated instance of the Error subclass', function () {
            myClassObject.instantiate
                .withArgs([
                    sinon.match(function (arg) {
                        return arg.getNative() === '[Translated] my_translation {"my_placeholder":"my value"}';
                    }),
                    sinon.match(function (arg) {
                        return arg.getNative() === 21;
                    }),
                    sinon.match(function (arg) {
                        return arg.getNative() === null;
                    })
                ])
                .returns(objectValue);

            expect(factory.createTranslatedExceptionObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null
            )).to.equal(objectValue);
        });

        it('should set the reportsOwnContext internal property to false', function () {
            myClassObject.instantiate.returns(objectValue);

            factory.createTranslatedExceptionObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null
            );

            expect(objectValue.getInternalProperty('reportsOwnContext')).to.be.false;
        });
    });

    describe('instantiateObject()', function () {
        var myClassObject,
            objectValue;

        beforeEach(function () {
            myClassObject = sinon.createStubInstance(Class);
            objectValue = sinon.createStubInstance(ObjectValue);
            globalNamespace.getClass.withArgs('My\\Stuff\\MyClass')
                .returns(futureFactory.createPresent(myClassObject));
            myClassObject.getSuperClass.returns(null);
            myClassObject.instantiate.returns(objectValue);
        });

        it('should return an instance of the specified class with constructor args coerced', async function () {
            expect(await factory.instantiateObject('My\\Stuff\\MyClass').toPromise()).to.equal(objectValue);
        });

        it('should coerce the arguments to Value objects', async function () {
            await factory.instantiateObject('My\\Stuff\\MyClass', [
                21,
                'second arg'
            ]).toPromise();

            expect(myClassObject.instantiate).to.have.been.calledOnce;
            expect(myClassObject.instantiate.args[0][0][0].getType()).to.equal('int');
            expect(myClassObject.instantiate.args[0][0][0].getNative()).to.equal(21);
            expect(myClassObject.instantiate.args[0][0][1].getType()).to.equal('string');
            expect(myClassObject.instantiate.args[0][0][1].getNative()).to.equal('second arg');
        });
    });

    describe('isValue()', function () {
        it('should return true when given a Value object', function () {
            var value = factory.createInteger(27);

            expect(factory.isValue(value)).to.be.true;
        });

        it('should return false when given a non-Value object', function () {
            var object = {my: 'non-Value object'};

            expect(factory.isValue(object)).to.be.false;
        });
    });
});
