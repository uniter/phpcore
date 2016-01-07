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
    AccessorReference = require('../../../src/Reference/AccessorReference'),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('AccessorReference', function () {
    beforeEach(function () {
        this.valueFactory = sinon.createStubInstance(ValueFactory);
        this.coercedValue = sinon.createStubInstance(Value);
        this.valueFactory.coerce.returns(this.coercedValue);
        this.valueGetter = sinon.stub();
        this.valueSetter = sinon.spy();

        this.reference = new AccessorReference(this.valueFactory, this.valueGetter, this.valueSetter);
    });

    describe('getValue()', function () {
        it('should coerce the result of the getter to a PHP value', function () {
            this.valueGetter.returns(21);

            this.reference.getValue();

            expect(this.valueFactory.coerce).to.have.been.calledOnce;
            expect(this.valueFactory.coerce).to.have.been.calledWith(21);
        });

        it('should return the coerced result', function () {
            expect(this.reference.getValue()).to.equal(this.coercedValue);
        });
    });

    describe('setValue()', function () {
        it('should call the setter with the value unwrapped for native JS', function () {
            var newValue = sinon.createStubInstance(Value);
            newValue.unwrapForJS.returns(27);

            this.reference.setValue(newValue);

            expect(this.valueSetter).to.have.been.calledOnce;
            expect(this.valueSetter).to.have.been.calledWith(27);
        });

        it('should return the new value', function () {
            var newValue = sinon.createStubInstance(Value);

            expect(this.reference.setValue(newValue)).to.equal(newValue);
        });
    });
});
