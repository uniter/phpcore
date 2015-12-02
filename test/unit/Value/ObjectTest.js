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
    BooleanValue = require('../../../src/Value/Boolean').sync(),
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    PropertyReference = require('../../../src/Reference/Property'),
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Object', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = sinon.createStubInstance(ValueFactory);
        this.factory.coerce.restore();
        sinon.stub(this.factory, 'coerce', function (nativeValue) {
            var value = sinon.createStubInstance(Value);
            value.getNative.returns(nativeValue);
            return value;
        });
        this.factory.createBoolean.restore();
        sinon.stub(this.factory, 'createBoolean', function (nativeValue) {
            var booleanValue = sinon.createStubInstance(BooleanValue);
            booleanValue.getNative.returns(nativeValue);
            return booleanValue;
        });
        this.factory.createInteger.restore();
        sinon.stub(this.factory, 'createInteger', function (nativeValue) {
            var integerValue = sinon.createStubInstance(IntegerValue);
            integerValue.getNative.returns(nativeValue);
            return integerValue;
        });
        this.factory.createString.restore();
        sinon.stub(this.factory, 'createString', function (nativeValue) {
            var stringValue = sinon.createStubInstance(StringValue);
            stringValue.getNative.returns(nativeValue);
            stringValue.isEqualTo.restore();
            sinon.stub(stringValue, 'isEqualTo', function (otherValue) {
                return this.factory.createBoolean(otherValue.getNative() === nativeValue);
            }.bind(this));
            return stringValue;
        }.bind(this));

        this.classObject = sinon.createStubInstance(Class);
        this.prop1 = sinon.createStubInstance(PropertyReference);
        this.prop1.getKey.returns(this.factory.createString('firstProp'));
        this.prop1.getValue.returns(this.factory.createString('the value of firstProp'));
        this.prop2 = sinon.createStubInstance(PropertyReference);
        this.prop2.getKey.returns(this.factory.createString('secondProp'));
        this.prop2.getValue.returns(this.factory.createString('the value of secondProp'));
        this.nativeObject = {
            prop1: this.prop1,
            prop2: this.prop2
        };
        this.objectID = 21;

        this.value = new ObjectValue(
            this.factory,
            this.callStack,
            this.nativeObject,
            this.classObject,
            this.objectID
        );
    });

    describe('callMethod()', function () {
        describe('when a wrapped native function is called directly with __invoke()', function () {
            beforeEach(function () {
                this.nativeObject = sinon.stub();

                this.value = new ObjectValue(
                    this.factory,
                    this.callStack,
                    this.nativeObject,
                    this.classObject,
                    this.objectID
                );
            });

            it('should call the wrapped function once', function () {
                this.value.callMethod('__invoke', []);

                expect(this.nativeObject).to.have.been.calledOnce;
            });

            it('should use the wrapper ObjectValue as `this`', function () {
                this.value.callMethod('__invoke', []);

                expect(this.nativeObject).to.have.been.calledOn(sinon.match.same(this.value));
            });

            it('should be passed the arguments', function () {
                var arg1 = sinon.createStubInstance(Value),
                    arg2 = sinon.createStubInstance(Value);

                this.value.callMethod('__invoke', [arg1, arg2]);

                expect(this.nativeObject).to.have.been.calledWith(
                    sinon.match.same(arg1),
                    sinon.match.same(arg2)
                );
            });

            it('should return the result', function () {
                this.nativeObject.returns('my result');

                expect(this.value.callMethod('__invoke').getNative()).to.equal('my result');
            });
        });

        describe('when calling a method of the wrapped object', function () {
            beforeEach(function () {
                this.myMethod = sinon.stub();
                this.nativeObject.myMethod = this.myMethod;
            });

            it('should call the method once', function () {
                this.value.callMethod('myMethod', []);

                expect(this.myMethod).to.have.been.calledOnce;
            });

            it('should use the wrapper ObjectValue as `this`', function () {
                this.value.callMethod('myMethod', []);

                expect(this.myMethod).to.have.been.calledOn(sinon.match.same(this.value));
            });

            it('should be passed the arguments', function () {
                var arg1 = sinon.createStubInstance(Value),
                    arg2 = sinon.createStubInstance(Value);

                this.value.callMethod('myMethod', [arg1, arg2]);

                expect(this.myMethod).to.have.been.calledWith(
                    sinon.match.same(arg1),
                    sinon.match.same(arg2)
                );
            });

            it('should be case-insensitive', function () {
                this.value.callMethod('MYMEthoD', []);

                expect(this.myMethod).to.have.been.calledOnce;
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
                'Object of class MyClass could not be converted to int'
            );
        });

        it('should return int one', function () {
            var result = this.value.coerceToInteger();

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

    describe('pointToProperty()', function () {
        it('should set the pointer to the index of the property', function () {
            var element = sinon.createStubInstance(PropertyReference);
            element.getKey.returns(this.factory.createString('secondProp'));

            this.value.pointToProperty(element);

            expect(this.value.getPointer()).to.equal(1);
        });
    });
});
