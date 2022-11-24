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
    util = require('util'),
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
    Future = require('../../src/Control/Future'),
    FutureFactory = require('../../src/Control/FutureFactory'),
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
        controlScope,
        elementProvider,
        errorPromoter,
        factory,
        flow,
        futureFactory,
        futuresCreated,
        globalNamespace,
        referenceFactory,
        state,
        translator,
        valueStorage;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        futuresCreated = 0;
        state = tools.createIsolatedState('async', {
            'call_stack': callStack,
            'future_factory': function (set, get) {
                function TrackedFuture() {
                    Future.apply(this, arguments);

                    futuresCreated++;
                }

                util.inherits(TrackedFuture, Future);

                return new FutureFactory(
                    get('pause_factory'),
                    get('value_factory'),
                    get('control_bridge'),
                    get('control_scope'),
                    TrackedFuture
                );
            }
        });
        callFactory = sinon.createStubInstance(CallFactory);
        controlScope = state.getControlScope();
        errorPromoter = sinon.createStubInstance(ErrorPromoter);
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        globalNamespace = sinon.createStubInstance(Namespace);
        referenceFactory = state.getReferenceFactory();
        translator = sinon.createStubInstance(Translator);
        elementProvider = new ElementProvider(referenceFactory);
        valueStorage = new ValueStorage();

        translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });

        factory = new ValueFactory(
            'async',
            translator,
            callFactory,
            errorPromoter,
            valueStorage,
            state.getControlBridge(),
            state.getControlScope()
        );
        factory.setCallStack(callStack);
        factory.setElementProvider(elementProvider);
        factory.setFlow(flow);
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

    describe('createAsyncPresent()', function () {
        it('should return a pending Future-wrapped Value', function () {
            var value = factory.createAsyncPresent('my value');

            expect(value).to.be.an.instanceOf(Future);
            expect(value.isPending()).to.be.true;
        });

        it('should return a FutureValue that eventually resolves with the given value', async function () {
            var resolvedValue,
                value = factory.createAsyncPresent('my value');

            resolvedValue = await value.toPromise();

            expect(resolvedValue.getType()).to.equal('string');
            expect(resolvedValue.getNative()).to.equal('my value');
        });
    });

    describe('createAsyncMacrotaskFuture()', function () {
        it('should return a pending Future-wrapped Value', function () {
            var value = factory.createAsyncMacrotaskFuture(function () {});

            expect(value).to.be.an.instanceOf(Future);
            expect(value.isPending()).to.be.true;
        });

        it('should return a Future that eventually resolves with the given value', async function () {
            var resolvedValue,
                value = factory.createAsyncMacrotaskFuture(function (resolve) {
                    resolve('my value');
                });

            resolvedValue = await value.toPromise();

            expect(resolvedValue.getType()).to.equal('string');
            expect(resolvedValue.getNative()).to.equal('my value');
        });
    });

    describe('createAsyncMicrotaskFuture()', function () {
        it('should return a pending Future-wrapped Value', function () {
            var value = factory.createAsyncMicrotaskFuture(function () {});

            expect(value).to.be.an.instanceOf(Future);
            expect(value.isPending()).to.be.true;
        });

        it('should return a Future that eventually resolves with the given value', async function () {
            var resolvedValue,
                value = factory.createAsyncMicrotaskFuture(function (resolve) {
                    resolve('my value');
                });

            resolvedValue = await value.toPromise();

            expect(resolvedValue.getType()).to.equal('string');
            expect(resolvedValue.getNative()).to.equal('my value');
        });
    });

    describe('createAsyncRejection()', function () {
        it('should return a pending Future-wrapped Value', function () {
            var value = factory.createAsyncRejection(new Error('my error'));

            expect(value).to.be.an.instanceOf(Future);
            expect(value.isPending()).to.be.true;
        });

        it('should return a Future that eventually rejects with the given error', function () {
            var error = new Error('my error'),
                value = factory.createAsyncRejection(error);

            return expect(value.toPromise()).to.eventually.be.rejectedWith(error);
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

        it('should always return the same BooleanValue<true> for efficiency', function () {
            var firstTrueBooleanValue = factory.createBoolean(true),
                secondTrueBooleanValue = factory.createBoolean(true);

            expect(firstTrueBooleanValue.getType()).to.equal('boolean');
            expect(firstTrueBooleanValue.getNative()).to.be.true;
            expect(secondTrueBooleanValue).to.equal(firstTrueBooleanValue);
        });

        it('should be able to create a BooleanValue with value false', function () {
            var value = factory.createBoolean(false);

            expect(value.getType()).to.equal('boolean');
            expect(value.getNative()).to.be.false;
        });

        it('should always return the same BooleanValue<false> for efficiency', function () {
            var firstFalseBooleanValue = factory.createBoolean(false),
                secondFalseBooleanValue = factory.createBoolean(false);

            expect(firstFalseBooleanValue.getType()).to.equal('boolean');
            expect(firstFalseBooleanValue.getNative()).to.be.false;
            expect(secondFalseBooleanValue).to.equal(firstFalseBooleanValue);
        });
    });

    describe('createBoxedJSObject()', function () {
        it('should always return the same JSObject instance for a given native object', function () {
            var firstJSObjectInstance,
                secondJSObjectInstance,
                jsObjectClassObject = sinon.createStubInstance(Class),
                nativeObject = {my: 'native object'};
            globalNamespace.getClass
                .withArgs('JSObject')
                .returns(futureFactory.createPresent(jsObjectClassObject));

            firstJSObjectInstance = factory.createBoxedJSObject(nativeObject);
            secondJSObjectInstance = factory.createBoxedJSObject(nativeObject);

            expect(firstJSObjectInstance.getType()).to.equal('object');
            expect(secondJSObjectInstance.getType()).to.equal('object');
            expect(secondJSObjectInstance).to.equal(firstJSObjectInstance);
        });

        it('should cache the internal Class instance for JSObject for efficiency', function () {
            var firstJSObjectInstance,
                secondJSObjectInstance,
                jsObjectClassObject = sinon.createStubInstance(Class),
                firstNativeObject = {my: 'first native object'},
                secondNativeObject = {my: 'second native object'};
            globalNamespace.getClass
                .withArgs('JSObject')
                .returns(futureFactory.createPresent(jsObjectClassObject));

            firstJSObjectInstance = factory.createBoxedJSObject(firstNativeObject);
            secondJSObjectInstance = factory.createBoxedJSObject(secondNativeObject);

            expect(globalNamespace.getClass).to.have.been.calledOnce;
            expect(firstJSObjectInstance.getClass()).to.equal(jsObjectClassObject);
            expect(secondJSObjectInstance.getClass()).to.equal(jsObjectClassObject);
            expect(secondJSObjectInstance).not.to.equal(firstJSObjectInstance);
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

        it('should cache the internal Class instance for Closure for efficiency', function () {
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

            factory.createClosureObject(closure);
            factory.createClosureObject(closure);

            expect(globalNamespace.getClass).to.have.been.calledOnce;
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

            // Simulate the initial file and line as fetched from the call stack by Error & Exception.
            objectValue.setProperty('file', '/my/current/file_path.php');
            objectValue.setProperty('line', 789);
        });

        it('should return a correctly instantiated instance of the Error subclass', async function () {
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

            expect(
                await factory.createErrorObject(
                    'My\\Stuff\\MyErrorClass',
                    'My error message',
                    21,
                    null,
                    '/path/to/my_module.php',
                    1234,
                    true
                ).toPromise()
            ).to.equal(objectValue);
        });

        it('should set the reportsOwnContext internal property to true when specified', async function () {
            myClassObject.instantiate.returns(objectValue);

            await factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                true
            ).toPromise();

            expect(objectValue.getInternalProperty('reportsOwnContext')).to.be.true;
        });

        it('should leave the reportsOwnContext internal property as false when specified', async function () {
            myClassObject.instantiate.returns(objectValue);

            await factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                false
            ).toPromise();

            expect(objectValue.getInternalProperty('reportsOwnContext')).to.be.false;
        });

        it('should override the "file" property with the given string if specified', async function () {
            var value;
            myClassObject.instantiate.returns(objectValue);

            await factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                false
            ).toPromise();
            value = objectValue.getProperty('file');

            expect(value.getType()).to.equal('string');
            expect(value.getNative()).to.equal('/path/to/my_module.php');
        });

        it('should override the "file" property with null if specified', async function () {
            var value;
            myClassObject.instantiate.returns(objectValue);

            await factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                null, // Specify that file path should be treated as unknown.
                1234,
                false
            ).toPromise();
            value = objectValue.getProperty('file');

            expect(value.getType()).to.equal('null');
        });

        it('should override the "line" property with the given integer if specified', async function () {
            var value;
            myClassObject.instantiate.returns(objectValue);

            await factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                false
            ).toPromise();
            value = objectValue.getProperty('line');

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(1234);
        });

        it('should override the "line" property with null if specified', async function () {
            var value;
            myClassObject.instantiate.returns(objectValue);

            await factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                null, // Specify that line number should be treated as unknown.
                false
            ).toPromise();
            value = objectValue.getProperty('line');

            expect(value.getType()).to.equal('null');
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

    describe('createFromNativeObject()', function () {
        it('should return the wrapped ObjectValue when a PHPObject is given', function () {
            var objectValue = sinon.createStubInstance(ObjectValue),
                phpObject = sinon.createStubInstance(PHPObject);
            phpObject.getObjectValue.returns(objectValue);

            expect(factory.createFromNativeObject(phpObject)).to.equal(objectValue);
        });
    });

    describe('createFuture()', function () {
        it('should return a FutureValue that coerces any native async result to a Value', async function () {
            var resolvedValue,
                value = factory.createFuture(function (resolve) {
                    state.queueMicrotask(function () {
                        resolve(21);
                    });
                });

            resolvedValue = await value.toPromise();

            expect(resolvedValue.getType()).to.equal('int');
            expect(resolvedValue.getNative()).to.equal(21);
        });

        it('should allow the next Coroutine to be nested', async function () {
            var value = factory.createFuture(function (resolve, reject, nestCoroutine) {
                state.queueMicrotask(function () {
                    nestCoroutine();
                    resolve(21);
                });
            });

            await value.toPromise();

            expect(controlScope.isNestingCoroutine()).to.be.true;
        });
    });

    describe('createFutureChain()', function () {
        it('should create a Future resolved with the result of the executor', async function () {
            var value = factory
                .createFutureChain(function () {
                    return 'my result';
                })
                .next(function (intermediateValue) {
                    return intermediateValue.getNative() + ' with suffix';
                });

            expect(await value.toPromise()).to.equal('my result with suffix');
        });

        it('should create a FutureValue rejected with any error of the executor', async function () {
            var error = new Error('Oh dear!'),
                value = factory
                    .createFutureChain(function () {
                        throw error;
                    })
                    .next(function (intermediateValue) {
                        return intermediateValue.getNative() + ' with suffix';
                    });

            await expect(value.toPromise()).to.eventually.be.rejectedWith(error);
        });

        it('should create no Future instances when not required', async function () {
            futuresCreated = 0;

            await factory
                .createFutureChain(function () {
                    return 'my result';
                })
                .toPromise();

            expect(futuresCreated).to.equal(0);
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

    describe('createNumber()', function () {
        it('should return an IntegerValue when given a positive native integer', function () {
            var value = factory.createNumber(21);

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(21);
        });

        it('should return an IntegerValue when given a negative native integer', function () {
            var value = factory.createNumber(-21);

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(-21);
        });

        it('should return a FloatValue when given a positive native float', function () {
            var value = factory.createNumber(101.123);

            expect(value.getType()).to.equal('float');
            expect(value.getNative()).to.equal(101.123);
        });

        it('should return a FloatValue when given a negative native float', function () {
            var value = factory.createNumber(-101.123);

            expect(value.getType()).to.equal('float');
            expect(value.getNative()).to.equal(-101.123);
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

    describe('createResource()', function () {
        it('should return a correctly constructed ResourceValue', function () {
            var resource = {my: 'resource'},
                value;

            value = factory.createResource('my_resource_type', resource);

            expect(value.getType()).to.equal('resource');
            expect(value.getResource()).to.equal(resource);
            expect(value.getResourceType()).to.equal('my_resource_type');
            expect(value.getID()).to.equal(1);
        });

        it('should give each ResourceValue a unique ID', function () {
            var value;
            factory.createResource('my_resource_type', {my: 'first resource'});

            value = factory.createResource('my_resource_type', {my: 'second resource'});

            expect(value.getID()).to.equal(2);
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

        it('should return a correctly instantiated instance of the Error subclass', async function () {
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

            expect(
                await factory.createTranslatedErrorObject(
                    'My\\Stuff\\MyErrorClass',
                    'my_translation',
                    {'my_placeholder': 'my value'},
                    21,
                    null,
                    '/path/to/my_module.php',
                    1234
                ).toPromise()
            ).to.equal(objectValue);
        });

        it('should set the reportsOwnContext internal property to false', async function () {
            myClassObject.instantiate.returns(objectValue);

            await factory.createTranslatedErrorObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null,
                '/path/to/my_module.php',
                1234
            ).toPromise();

            expect(objectValue.getInternalProperty('reportsOwnContext')).to.be.false;
        });

        it('should override the "file" property if specified', async function () {
            var value;
            myClassObject.instantiate.returns(objectValue);

            await factory.createTranslatedErrorObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null,
                '/path/to/my_module.php',
                1234
            ).toPromise();
            value = objectValue.getProperty('file');

            expect(value.getType()).to.equal('string');
            expect(value.getNative()).to.equal('/path/to/my_module.php');
        });

        it('should override the "line" property if specified', async function () {
            var value;
            myClassObject.instantiate.returns(objectValue);

            await factory.createTranslatedErrorObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null,
                '/path/to/my_module.php',
                1234
            ).toPromise();
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

        it('should return a correctly instantiated instance of the Error subclass', async function () {
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

            expect(
                await factory.createTranslatedExceptionObject(
                    'My\\Stuff\\MyErrorClass',
                    'my_translation',
                    {'my_placeholder': 'my value'},
                    21,
                    null
                ).toPromise()
            ).to.equal(objectValue);
        });

        it('should set the reportsOwnContext internal property to false', async function () {
            myClassObject.instantiate.returns(objectValue);

            await factory.createTranslatedExceptionObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null
            ).toPromise();

            expect(objectValue.getInternalProperty('reportsOwnContext')).to.be.false;
        });
    });

    describe('deriveFuture()', function () {
        it('should create a new FutureValue to be resolved with the given Future', async function () {
            var derivedFuture = factory.deriveFuture(futureFactory.createAsyncPresent(21)),
                resultValue;

            // Ensure the derived Future remains unsettled until the parent one is.
            expect(derivedFuture.isSettled()).to.be.false;
            resultValue = await derivedFuture.toPromise();
            expect(derivedFuture.isSettled()).to.be.true;
            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(21);
        });

        it('should create a new FutureValue to be rejected with the given Future', async function () {
            var error = new Error('Bang!'),
                derivedFuture = factory.deriveFuture(futureFactory.createAsyncRejection(error));

            // Ensure the derived Future remains unsettled until the parent one is.
            expect(derivedFuture.isSettled()).to.be.false;
            await expect(derivedFuture.toPromise()).to.eventually.be.rejectedWith(error);
            expect(derivedFuture.isSettled()).to.be.true;
        });

        it('should create no more Future instances than required', async function () {
            futuresCreated = 0;

            await factory
                .deriveFuture(futureFactory.createAsyncPresent('my value'))
                .toPromise();

            expect(futuresCreated).to.equal(2);
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
