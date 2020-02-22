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
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    ArrayIterator = require('../../src/Iterator/ArrayIterator'),
    ArrayValue = require('../../src/Value/Array').sync(),
    ElementProvider = require('../../src/Reference/Element/ElementProvider'),
    IntegerValue = require('../../src/Value/Integer').sync(),
    Namespace = require('../../src/Namespace').sync(),
    NullValue = require('../../src/Value/Null').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    PHPObject = require('../../src/PHPObject').sync(),
    Translator = phpCommon.Translator,
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('ValueFactory', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.elementProvider = new ElementProvider();
        this.globalNamespace = sinon.createStubInstance(Namespace);
        this.pausable = {};
        this.translator = sinon.createStubInstance(Translator);

        this.translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });

        this.factory = new ValueFactory(this.pausable, 'async', this.elementProvider, this.translator);
        this.factory.setCallStack(this.callStack);
        this.factory.setGlobalNamespace(this.globalNamespace);
    });

    describe('coerceObject()', function () {
        it('should return Value instances untouched', function () {
            var value = sinon.createStubInstance(Value);

            expect(this.factory.coerceObject(value)).to.equal(value);
        });

        it('should wrap native arrays as JSObjects', function () {
            var nativeArray = [21],
                JSObjectClass = sinon.createStubInstance(Class),
                objectValue;
            JSObjectClass.getName.returns('JSObject');
            JSObjectClass.getSuperClass.returns(null);
            JSObjectClass.is.withArgs('JSObject').returns(true);
            JSObjectClass.is.returns(false);
            this.globalNamespace.getClass.withArgs('JSObject').returns(JSObjectClass);

            objectValue = this.factory.coerceObject(nativeArray);

            expect(objectValue).to.be.an.instanceOf(ObjectValue);
            expect(objectValue.classIs('JSObject')).to.be.true;
            expect(objectValue.getNative()).to.equal(nativeArray);
        });

        it('should coerce native null to a NullValue', function () {
            expect(this.factory.coerceObject(null)).to.be.an.instanceOf(NullValue);
        });

        it('should coerce native undefined to a NullValue', function () {
            expect(this.factory.coerceObject(void 0)).to.be.an.instanceOf(NullValue);
        });

        it('should throw an error when a string value is provided', function () {
            expect(function () {
                this.factory.coerceObject('hello');
            }.bind(this)).to.throw(
                'Only objects, null or undefined may be coerced to an object'
            );
        });
    });

    describe('createArrayIterator()', function () {
        it('should return an ArrayIterator on the specified value', function () {
            var arrayValue = sinon.createStubInstance(ArrayValue),
                iterator = this.factory.createArrayIterator(arrayValue);

            expect(iterator).to.be.an.instanceOf(ArrayIterator);
            expect(iterator.getIteratedValue()).to.equal(arrayValue);
        });
    });

    describe('createErrorObject()', function () {
        beforeEach(function () {
            this.myClassObject = sinon.createStubInstance(Class);
            this.objectValue = sinon.createStubInstance(ObjectValue);
            this.globalNamespace.getClass.withArgs('My\\Stuff\\MyErrorClass').returns(this.myClassObject);

            this.objectValue.getInternalProperty
                .withArgs('reportsOwnContext')
                .returns(false);
            this.objectValue.setInternalProperty
                .withArgs('reportsOwnContext')
                .callsFake(function (name, value) {
                    this.objectValue.getInternalProperty
                        .withArgs(name)
                        .returns(value);
                }.bind(this));
            this.objectValue.getProperty
                .returns(this.factory.createNull());
            this.objectValue.setProperty
                .callsFake(function (name, value) {
                    this.objectValue.getProperty
                        .withArgs(name)
                        .returns(value);
                }.bind(this));
        });

        it('should return a correctly instantiated instance of the Error subclass', function () {
            this.myClassObject.instantiate
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
                .returns(this.objectValue);

            expect(this.factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                true
            )).to.equal(this.objectValue);
        });

        it('should set the reportsOwnContext internal property to true when specified', function () {
            this.myClassObject.instantiate.returns(this.objectValue);

            this.factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                true
            );

            expect(this.objectValue.getInternalProperty('reportsOwnContext')).to.be.true;
        });

        it('should leave the reportsOwnContext internal property as false when specified', function () {
            this.myClassObject.instantiate.returns(this.objectValue);

            this.factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                false
            );

            expect(this.objectValue.getInternalProperty('reportsOwnContext')).to.be.false;
        });

        it('should override the "file" property if specified', function () {
            var value;
            this.myClassObject.instantiate.returns(this.objectValue);

            this.factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                false
            );
            value = this.objectValue.getProperty('file');

            expect(value.getType()).to.equal('string');
            expect(value.getNative()).to.equal('/path/to/my_module.php');
        });

        it('should override the "line" property if specified', function () {
            var value;
            this.myClassObject.instantiate.returns(this.objectValue);

            this.factory.createErrorObject(
                'My\\Stuff\\MyErrorClass',
                'My error message',
                21,
                null,
                '/path/to/my_module.php',
                1234,
                false
            );
            value = this.objectValue.getProperty('line');

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(1234);
        });
    });

    describe('createExit()', function () {
        it('should return an ExitValue with the specified status value', function () {
            var statusValue = sinon.createStubInstance(IntegerValue);
            statusValue.getNative.returns(21);

            expect(this.factory.createExit(statusValue).getStatus()).to.equal(21);
        });
    });

    describe('createFromNative()', function () {
        it('should return an indexed array when an indexed native array is given', function () {
            var nativeArray = [25, 28],
                arrayValue = this.factory.createFromNative(nativeArray);

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
                arrayValue = this.factory.createFromNative(nativeObject);

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
                    return this.factory.createString('world');
                }
                if (argValues[0].getNative() === 'a-method') {
                    return this.factory.coerce(aMethod);
                }
            }.bind(this));
            JSObjectClass.getMethodSpec.withArgs('__get').returns({});
            JSObjectClass.getName.returns('JSObject');
            JSObjectClass.getSuperClass.returns(null);
            JSObjectClass.is.withArgs('JSObject').returns(true);
            JSObjectClass.is.returns(false);
            this.globalNamespace.getClass.withArgs('JSObject').returns(JSObjectClass);

            objectValue = this.factory.createFromNative(nativeObject);

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
            JSObjectClass.getName.returns('JSObject');
            JSObjectClass.getSuperClass.returns(null);
            JSObjectClass.is.withArgs('JSObject').returns(true);
            JSObjectClass.is.returns(false);
            this.globalNamespace.getClass.withArgs('JSObject').returns(JSObjectClass);

            objectValue = this.factory.createFromNative(nativeFunction);

            expect(objectValue).to.be.an.instanceOf(ObjectValue);
            expect(objectValue.classIs('JSObject')).to.be.true;
            expect(objectValue.getNative()).to.equal(nativeFunction);
        });

        it('should unwrap an object exported as a PHPObject instance back to its original ObjectValue', function () {
            var objectValue = sinon.createStubInstance(ObjectValue),
                phpObject = sinon.createStubInstance(PHPObject);
            phpObject.getObjectValue.returns(objectValue);

            expect(this.factory.createFromNative(phpObject)).to.equal(objectValue);
        });

        it('should unwrap an object exported as an Unwrapped back to its original ObjectValue', function () {
            var objectValue = sinon.createStubInstance(ObjectValue),
                unwrappedObject = {};
            this.factory.mapUnwrappedObjectToValue(unwrappedObject, objectValue);

            expect(this.factory.createFromNative(unwrappedObject)).to.equal(objectValue);
        });
    });

    describe('createFromNativeArray()', function () {
        it('should push any non-indexed elements onto the end as KeyValuePair objects', function () {
            var arrayValue,
                nativeArray = [21, 27];
            nativeArray.anotherProp = 'hello';

            arrayValue = this.factory.createFromNativeArray(nativeArray);

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

    describe('createObject()', function () {
        it('should return a correctly constructed ObjectValue', function () {
            var classObject = sinon.createStubInstance(Class),
                nativeObject = {myProp: 'my value'},
                value;

            value = this.factory.createObject(nativeObject, classObject);

            expect(value.getType()).to.equal('object');
            expect(value.getObject()).to.equal(nativeObject);
            expect(value.getID()).to.equal(1);
        });
    });

    describe('createPHPObject()', function () {
        it('should return a PHPObject wrapping the ObjectValue', function () {
            var value = sinon.createStubInstance(ObjectValue),
                phpObject;

            phpObject = this.factory.createPHPObject(value);

            expect(phpObject).to.be.an.instanceOf(PHPObject);
            expect(phpObject.getObjectValue()).to.equal(value);
        });
    });

    describe('createStdClassObject()', function () {
        it('should return an ObjectValue wrapping the created stdClass instance', function () {
            var value = sinon.createStubInstance(ObjectValue),
                stdClassClass = sinon.createStubInstance(Class);
            this.globalNamespace.getClass.withArgs('stdClass').returns(stdClassClass);
            stdClassClass.getSuperClass.returns(null);
            stdClassClass.instantiate.returns(value);

            expect(this.factory.createStdClassObject()).to.equal(value);
        });
    });

    describe('createTranslatedErrorObject()', function () {
        beforeEach(function () {
            this.myClassObject = sinon.createStubInstance(Class);
            this.objectValue = sinon.createStubInstance(ObjectValue);
            this.globalNamespace.getClass.withArgs('My\\Stuff\\MyErrorClass').returns(this.myClassObject);

            this.objectValue.getInternalProperty
                .withArgs('reportsOwnContext')
                .returns(false);
            this.objectValue.setInternalProperty
                .withArgs('reportsOwnContext')
                .callsFake(function (name, value) {
                    this.objectValue.getInternalProperty
                        .withArgs(name)
                        .returns(value);
                }.bind(this));
            this.objectValue.getProperty
                .returns(this.factory.createNull());
            this.objectValue.setProperty
                .callsFake(function (name, value) {
                    this.objectValue.getProperty
                        .withArgs(name)
                        .returns(value);
                }.bind(this));
        });

        it('should return a correctly instantiated instance of the Error subclass', function () {
            this.myClassObject.instantiate
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
                .returns(this.objectValue);

            expect(this.factory.createTranslatedErrorObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null,
                '/path/to/my_module.php',
                1234
            )).to.equal(this.objectValue);
        });

        it('should set the reportsOwnContext internal property to false', function () {
            this.myClassObject.instantiate.returns(this.objectValue);

            this.factory.createTranslatedErrorObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null,
                '/path/to/my_module.php',
                1234
            );

            expect(this.objectValue.getInternalProperty('reportsOwnContext')).to.be.false;
        });

        it('should override the "file" property if specified', function () {
            var value;
            this.myClassObject.instantiate.returns(this.objectValue);

            this.factory.createTranslatedErrorObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null,
                '/path/to/my_module.php',
                1234
            );
            value = this.objectValue.getProperty('file');

            expect(value.getType()).to.equal('string');
            expect(value.getNative()).to.equal('/path/to/my_module.php');
        });

        it('should override the "line" property if specified', function () {
            var value;
            this.myClassObject.instantiate.returns(this.objectValue);

            this.factory.createTranslatedErrorObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null,
                '/path/to/my_module.php',
                1234
            );
            value = this.objectValue.getProperty('line');

            expect(value.getType()).to.equal('int');
            expect(value.getNative()).to.equal(1234);
        });
    });

    describe('createTranslatedExceptionObject()', function () {
        beforeEach(function () {
            this.myClassObject = sinon.createStubInstance(Class);
            this.objectValue = sinon.createStubInstance(ObjectValue);
            this.globalNamespace.getClass.withArgs('My\\Stuff\\MyErrorClass').returns(this.myClassObject);

            this.objectValue.getInternalProperty
                .withArgs('reportsOwnContext')
                .returns(false);
            this.objectValue.setInternalProperty
                .withArgs('reportsOwnContext')
                .callsFake(function (name, value) {
                    this.objectValue.getInternalProperty
                        .withArgs(name)
                        .returns(value);
                }.bind(this));
            this.objectValue.getProperty
                .returns(this.factory.createNull());
            this.objectValue.setProperty
                .callsFake(function (name, value) {
                    this.objectValue.getProperty
                        .withArgs(name)
                        .returns(value);
                }.bind(this));
        });

        it('should return a correctly instantiated instance of the Error subclass', function () {
            this.myClassObject.instantiate
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
                .returns(this.objectValue);

            expect(this.factory.createTranslatedExceptionObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null
            )).to.equal(this.objectValue);
        });

        it('should set the reportsOwnContext internal property to false', function () {
            this.myClassObject.instantiate.returns(this.objectValue);

            this.factory.createTranslatedExceptionObject(
                'My\\Stuff\\MyErrorClass',
                'my_translation',
                {'my_placeholder': 'my value'},
                21,
                null
            );

            expect(this.objectValue.getInternalProperty('reportsOwnContext')).to.be.false;
        });
    });

    describe('getUnwrappedObjectFromValue()', function () {
        it('should return the unwrapped object for an object that has been mapped before', function () {
            var objectValue = sinon.createStubInstance(ObjectValue),
                unwrappedObject = {unwrapped: 'yes'};
            this.factory.mapUnwrappedObjectToValue(unwrappedObject, objectValue);

            expect(this.factory.getUnwrappedObjectFromValue(objectValue)).to.equal(unwrappedObject);
        });

        it('should return null for a value that has not been mapped before', function () {
            var objectValue = sinon.createStubInstance(ObjectValue);

            expect(this.factory.getUnwrappedObjectFromValue(objectValue)).to.be.null;
        });
    });

    describe('instantiateObject()', function () {
        beforeEach(function () {
            this.myClassObject = sinon.createStubInstance(Class);
            this.objectValue = sinon.createStubInstance(ObjectValue);
            this.globalNamespace.getClass.withArgs('My\\Stuff\\MyClass').returns(this.myClassObject);
            this.myClassObject.getSuperClass.returns(null);
            this.myClassObject.instantiate.returns(this.objectValue);
        });

        it('should return an instance of the specified class with constructor args coerced', function () {
            expect(this.factory.instantiateObject('My\\Stuff\\MyClass')).to.equal(this.objectValue);
        });

        it('should coerce the arguments to Value objects', function () {
            this.factory.instantiateObject('My\\Stuff\\MyClass', [
                21,
                'second arg'
            ]);

            expect(this.myClassObject.instantiate).to.have.been.calledOnce;
            expect(this.myClassObject.instantiate.args[0][0][0].getType()).to.equal('int');
            expect(this.myClassObject.instantiate.args[0][0][0].getNative()).to.equal(21);
            expect(this.myClassObject.instantiate.args[0][0][1].getType()).to.equal('string');
            expect(this.myClassObject.instantiate.args[0][0][1].getNative()).to.equal('second arg');
        });
    });
});
