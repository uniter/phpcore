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
    CallStack = require('../../../src/CallStack'),
    Class = require('../../../src/Class').sync(),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
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
            return stringValue;
        });

        this.classObject = sinon.createStubInstance(Class);
        this.nativeObject = {};
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
});
