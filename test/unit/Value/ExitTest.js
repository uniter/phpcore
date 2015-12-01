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
    BooleanValue = require('../../../src/Value/Boolean').sync(),
    CallStack = require('../../../src/CallStack'),
    ExitValue = require('../../../src/Value/Exit').sync(),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    StringValue = require('../../../src/Value/String').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Exit', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = sinon.createStubInstance(ValueFactory);
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
            return stringValue;
        }.bind(this));

        this.statusValue = this.factory.createInteger(21);

        this.value = new ExitValue(this.factory, this.callStack, this.statusValue);
    });

    describe('getStatus()', function () {
        it('should return the status when set', function () {
            expect(this.value.getStatus()).to.equal(21);
        });

        it('should return zero by default', function () {
            var value = new ExitValue(this.factory, this.callStack);

            expect(value.getStatus()).to.equal(0);
        });
    });
});
