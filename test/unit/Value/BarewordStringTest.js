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
    FloatValue = require('../../../src/Value/Float').sync(),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    KeyValuePair = require('../../../src/KeyValuePair'),
    Namespace = require('../../../src/Namespace').sync(),
    NamespaceScope = require('../../../src/NamespaceScope').sync(),
    NullValue = require('../../../src/Value/Null').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    StringValue = require('../../../src/Value/String').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('BarewordString', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = sinon.createStubInstance(ValueFactory);
        this.factory.createBoolean.restore();
        sinon.stub(this.factory, 'createBoolean', function (nativeValue) {
            var booleanValue = sinon.createStubInstance(BooleanValue);
            booleanValue.getType.returns('boolean');
            booleanValue.coerceToKey.returns(booleanValue);
            booleanValue.coerceToNumber.restore();
            sinon.stub(booleanValue, 'coerceToNumber', function () {
                return this.factory.createInteger(nativeValue ? 1 : 0);
            }.bind(this));
            booleanValue.getForAssignment.returns(booleanValue);
            booleanValue.getNative.returns(nativeValue);
            return booleanValue;
        }.bind(this));
        this.factory.createFloat.restore();
        sinon.stub(this.factory, 'createFloat', function (nativeValue) {
            var floatValue = sinon.createStubInstance(FloatValue);
            floatValue.getType.returns('float');
            floatValue.coerceToKey.returns(floatValue);
            floatValue.coerceToNumber.returns(floatValue);
            floatValue.getForAssignment.returns(floatValue);
            floatValue.getNative.returns(nativeValue);
            return floatValue;
        }.bind(this));
        this.factory.createInteger.restore();
        sinon.stub(this.factory, 'createInteger', function (nativeValue) {
            var integerValue = sinon.createStubInstance(IntegerValue);
            integerValue.getType.returns('integer');
            integerValue.coerceToKey.returns(integerValue);
            integerValue.coerceToNumber.returns(integerValue);
            integerValue.getForAssignment.returns(integerValue);
            integerValue.getNative.returns(nativeValue);
            return integerValue;
        }.bind(this));
        this.factory.createNull.restore();
        sinon.stub(this.factory, 'createNull', function (nativeValue) {
            var nullValue = sinon.createStubInstance(NullValue);
            nullValue.getType.returns('null');
            nullValue.coerceToKey.returns(nullValue);
            nullValue.getForAssignment.returns(nullValue);
            nullValue.getNative.returns(nativeValue);
            return nullValue;
        }.bind(this));
        this.factory.createObject.restore();
        sinon.stub(this.factory, 'createObject', function (nativeValue) {
            var objectValue = sinon.createStubInstance(ObjectValue);
            objectValue.getType.returns('object');
            objectValue.coerceToKey.returns(objectValue);
            objectValue.getForAssignment.returns(objectValue);
            objectValue.getNative.returns(nativeValue);
            return objectValue;
        }.bind(this));
        this.factory.createString.restore();
        sinon.stub(this.factory, 'createString', function (nativeValue) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.getType.returns('string');
            stringValue.coerceToKey.returns(stringValue);
            stringValue.getForAssignment.returns(stringValue);
            stringValue.getNative.returns(nativeValue);
            stringValue.isEqualTo.restore();
            sinon.stub(stringValue, 'isEqualTo', function (otherValue) {
                return this.factory.createBoolean(otherValue.getNative() === nativeValue);
            }.bind(this));
            return stringValue;
        }.bind(this));

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

    describe('getCallableName()', function () {
        beforeEach(function () {
            this.namespace = sinon.createStubInstance(Namespace);
            this.namespace.getPrefix.returns('Full\\Path\\To\\Mine\\');
            this.namespaceScope = sinon.createStubInstance(NamespaceScope);
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

    describe('isTheClassOfObject()', function () {
        beforeEach(function () {
            this.namespace = sinon.createStubInstance(Namespace);
            this.namespace.getPrefix.returns('Full\\Path\\To\\Mine\\');
            this.namespaceScope = sinon.createStubInstance(NamespaceScope);
            this.namespaceScope.resolveClass.withArgs('Mine\\MyClass').returns({
                namespace: this.namespace,
                name: 'MyClass'
            });
            this.createValue('Mine\\MyClass');
        });

        it('should return bool(true) when the subject object\'s class is this class', function () {
            var subjectObjectValue = this.factory.createObject({}),
                result;
            subjectObjectValue.classIs.withArgs('Full\\Path\\To\\Mine\\MyClass').returns(true);

            result = this.value.isTheClassOfObject(subjectObjectValue, this.namespaceScope);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(true);
        });

        it('should return bool(false) when the subject object\'s class is not this class', function () {
            var subjectObjectValue = this.factory.createObject({}),
                result;
            subjectObjectValue.classIs.withArgs('Full\\Path\\To\\Mine\\MyClass').returns(false);

            result = this.value.isTheClassOfObject(subjectObjectValue, this.namespaceScope);

            expect(result).to.be.an.instanceOf(BooleanValue);
            expect(result.getNative()).to.equal(false);
        });
    });
});
