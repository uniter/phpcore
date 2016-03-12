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
    CallStack = require('../../src/CallStack'),
    Class = require('../../src/Class').sync(),
    ArrayValue = require('../../src/Value/Array').sync(),
    IntegerValue = require('../../src/Value/Integer').sync(),
    Namespace = require('../../src/Namespace').sync(),
    ObjectValue = require('../../src/Value/Object').sync(),
    Value = require('../../src/Value').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('ValueFactory', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.globalNamespace = sinon.createStubInstance(Namespace);
        this.pausable = {};

        this.factory = new ValueFactory(this.pausable, this.callStack);
        this.factory.setGlobalNamespace(this.globalNamespace);
    });

    describe('coerceObject()', function () {
        it('should return Value instances untouched', function () {
            var value = sinon.createStubInstance(Value);

            expect(this.factory.coerceObject(value)).to.equal(value);
        });

        it('should wrap other native values as JSObjects', function () {
            var nativeArray = [21],
                JSObjectClass = sinon.createStubInstance(Class),
                objectValue;
            JSObjectClass.is.withArgs('JSObject').returns(true);
            JSObjectClass.is.returns(false);
            this.globalNamespace.getClass.withArgs('JSObject').returns(JSObjectClass);

            objectValue = this.factory.coerceObject(nativeArray);

            expect(objectValue).to.be.an.instanceOf(ObjectValue);
            expect(objectValue.classIs('JSObject')).to.be.true;
            expect(objectValue.getNative()).to.equal(nativeArray);
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
            JSObjectClass.is.withArgs('JSObject').returns(true);
            JSObjectClass.is.returns(false);
            this.globalNamespace.getClass.withArgs('JSObject').returns(JSObjectClass);

            objectValue = this.factory.createFromNative(nativeFunction);

            expect(objectValue).to.be.an.instanceOf(ObjectValue);
            expect(objectValue.classIs('JSObject')).to.be.true;
            expect(objectValue.getNative()).to.equal(nativeFunction);
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

    describe('createStdClassObject()', function () {
        it('should return an ObjectValue wrapping the created stdClass instance', function () {
            var value = sinon.createStubInstance(ObjectValue),
                stdClassClass = sinon.createStubInstance(Class);
            this.globalNamespace.getClass.withArgs('stdClass').returns(stdClassClass);
            stdClassClass.instantiate.returns(value);

            expect(this.factory.createStdClassObject()).to.equal(value);
        });
    });
});
