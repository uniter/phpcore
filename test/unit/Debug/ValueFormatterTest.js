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
    FloatValue = require('../../../src/Value/Float').sync(),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    NullValue = require('../../../src/Value/Null').sync(),
    ObjectValue = require('../../../src/Value/Object').sync(),
    StringValue = require('../../../src/Value/String').sync(),
    ValueFormatter = require('../../../src/Debug/ValueFormatter');

describe('ValueFormatter', function () {
    beforeEach(function () {
        this.formatter = new ValueFormatter();
    });

    describe('format()', function () {
        it('should display a BooleanValue correctly', function () {
            var value = sinon.createStubInstance(BooleanValue);
            value.getNative.returns(false);
            value.getType.returns('boolean');

            expect(this.formatter.format(value)).to.deep.equal({
                style: 'color: blue;',
                displayValue: false
            });
        });

        it('should display a FloatValue correctly', function () {
            var value = sinon.createStubInstance(FloatValue);
            value.getNative.returns(27.412);
            value.getType.returns('float');

            expect(this.formatter.format(value)).to.deep.equal({
                style: 'color: blue;',
                displayValue: 27.412
            });
        });

        it('should display an IntegerValue correctly', function () {
            var value = sinon.createStubInstance(IntegerValue);
            value.getNative.returns(21);
            value.getType.returns('integer');

            expect(this.formatter.format(value)).to.deep.equal({
                style: 'color: blue;',
                displayValue: 21
            });
        });

        it('should display a NullValue correctly', function () {
            var value = sinon.createStubInstance(NullValue);
            value.getNative.returns(null);
            value.getType.returns('null');

            expect(this.formatter.format(value)).to.deep.equal({
                style: 'font-weight: bold;',
                displayValue: '<null>'
            });
        });

        it('should display a non-function JSObject with constructor ObjectValue correctly', function () {
            var MyClass = function MyClass() {},
                myObject = new MyClass(),
                value = sinon.createStubInstance(ObjectValue);
            value.getClassName.returns('JSObject');
            value.getNative.returns(myObject);
            value.getType.returns('object');

            expect(this.formatter.format(value)).to.deep.equal({
                style: '',
                displayValue: '<JS:MyClass>'
            });
        });

        it('should display a non-function JSObject without constructor ObjectValue correctly', function () {
            var MyClass = function MyClass() {},
                myObject = new MyClass(),
                value = sinon.createStubInstance(ObjectValue);
            delete MyClass.prototype.constructor;
            value.getClassName.returns('JSObject');
            value.getNative.returns(myObject);
            value.getType.returns('object');

            expect(this.formatter.format(value)).to.deep.equal({
                style: '',
                displayValue: '<JS:Object>'
            });
        });

        it('should display a function JSObject ObjectValue correctly', function () {
            var value = sinon.createStubInstance(ObjectValue);
            value.getClassName.returns('JSObject');
            value.getNative.returns(function myFunc() {});
            value.getType.returns('object');

            expect(this.formatter.format(value)).to.deep.equal({
                style: '',
                displayValue: '<JS:function myFunc()>'
            });
        });

        it('should display a non-JSObject ObjectValue correctly', function () {
            var value = sinon.createStubInstance(ObjectValue);
            value.getClassName.returns('My\\Space\\ThisIsMyClass');
            value.getNative.returns({});
            value.getType.returns('object');

            expect(this.formatter.format(value)).to.deep.equal({
                style: '',
                displayValue: '<My\\Space\\ThisIsMyClass>'
            });
        });

        it('should display a StringValue correctly', function () {
            var value = sinon.createStubInstance(StringValue);
            value.getNative.returns('this is my string');
            value.getType.returns('string');

            expect(this.formatter.format(value)).to.deep.equal({
                style: 'color: red;',
                displayValue: '"this is my string"'
            });
        });
    });
});
