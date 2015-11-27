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
    ArrayValue = require('../../../src/Value/Array').sync(),
    CallStack = require('../../../src/CallStack'),
    ElementReference = require('../../../src/Reference/Element'),
    IntegerValue = require('../../../src/Value/Integer').sync(),
    StringValue = require('../../../src/Value/String').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync(),
    Variable = require('../../../src/Variable').sync();

describe('ElementReference', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = sinon.createStubInstance(ValueFactory);
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

        this.arrayValue = sinon.createStubInstance(ArrayValue);
        this.keyValue = this.factory.createString('my_element');

        this.element = new ElementReference(
            this.factory,
            this.callStack,
            this.arrayValue,
            this.keyValue,
            this.value
        );
    });

    describe('setValue()', function () {
        describe('when the element is not a reference', function () {
            it('should define the element in its array', function () {
                var newValue = this.factory.createString('my new value');

                this.element.setValue(newValue);

                expect(this.arrayValue.defineElement).to.have.been.calledOnce;
                expect(this.arrayValue.defineElement).to.have.been.calledWith(sinon.match.same(this.element));
            });
        });

        describe('when the element is a reference', function () {
            beforeEach(function () {
                this.reference = sinon.createStubInstance(Variable);
                this.element.setReference(this.reference);
            });

            it('should define the element in its array', function () {
                var newValue = this.factory.createString('my new value');

                this.element.setValue(newValue);

                expect(this.arrayValue.defineElement).to.have.been.calledOnce;
                expect(this.arrayValue.defineElement).to.have.been.calledWith(sinon.match.same(this.element));
            });
        });
    });
});
