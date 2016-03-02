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
    NullReference = require('../../../src/Reference/Null'),
    NullValue = require('../../../src/Value/Null').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('NullReference', function () {
    beforeEach(function () {
        this.valueFactory = sinon.createStubInstance(ValueFactory);
        this.onSet = sinon.spy();

        this.reference = new NullReference(this.valueFactory, {
            onSet: this.onSet
        });
    });

    describe('getValue()', function () {
        it('should return the value Null', function () {
            var nullValue = sinon.createStubInstance(NullValue);
            this.valueFactory.createNull.returns(nullValue);

            expect(this.reference.getValue()).to.equal(nullValue);
        });
    });

    describe('isSet()', function () {
        it('should return false', function () {
            expect(this.reference.isSet()).to.be.false;
        });
    });

    describe('setValue()', function () {
        it('should call the `onSet()` callback once', function () {
            this.reference.setValue(sinon.createStubInstance(Value));

            expect(this.onSet).to.have.been.calledOnce;
        });
    });
});
