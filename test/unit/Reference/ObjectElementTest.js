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
    ObjectElementReference = require('../../../src/Reference/ObjectElement'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    StringValue = require('../../../src/Value/String').sync(),
    Value = require('../../../src/Value').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('ObjectElementReference', function () {
    beforeEach(function () {
        this.keyValue = sinon.createStubInstance(StringValue);
        this.objectValue = sinon.createStubInstance(ObjectValue);
        this.valueFactory = new ValueFactory();

        this.objectValue.callMethod.withArgs(
            'offsetExists',
            sinon.match([sinon.match.same(this.keyValue)])
        ).returns(this.valueFactory.createBoolean(true));
        this.objectValue.callMethod.withArgs(
            'offsetGet',
            sinon.match([sinon.match.same(this.keyValue)])
        ).returns(this.valueFactory.createString('hello'));

        this.reference = new ObjectElementReference(this.valueFactory, this.objectValue, this.keyValue);
    });

    describe('concatWith()', function () {
        it('should append the given value to the result of the getter and pass it to the setter', function () {
            this.reference.concatWith(this.valueFactory.createString(' world'));

            expect(this.objectValue.callMethod).to.have.been.calledWith(
                'offsetSet',
                sinon.match([
                    sinon.match.same(this.keyValue),
                    sinon.match(function (value) {
                        return value instanceof Value && value.getNative() === 'hello world';
                    })
                ])
            );
        });
    });

    describe('decrementBy()', function () {
        it('should subtract the given value from the result of the getter and pass it to the setter', function () {
            this.objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(this.keyValue)])
            ).returns(this.valueFactory.createInteger(21));

            this.reference.decrementBy(this.valueFactory.createInteger(10));

            expect(this.objectValue.callMethod).to.have.been.calledWith(
                'offsetSet',
                sinon.match([
                    sinon.match.same(this.keyValue),
                    sinon.match(function (value) {
                        return value instanceof Value && value.getNative() === 11;
                    })
                ])
            );
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the result from ArrayAccess::offsetGet(...)', function () {
            expect(this.reference.getNative()).to.equal('hello');
        });
    });

    describe('incrementBy()', function () {
        it('should add the given value to the result of the getter and pass it to the setter', function () {
            this.objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(this.keyValue)])
            ).returns(this.valueFactory.createInteger(21));

            this.reference.incrementBy(this.valueFactory.createInteger(6));

            expect(this.objectValue.callMethod).to.have.been.calledWith(
                'offsetSet',
                sinon.match([
                    sinon.match.same(this.keyValue),
                    sinon.match(function (value) {
                        return value instanceof Value && value.getNative() === 27;
                    })
                ])
            );
        });
    });

    describe('isEmpty()', function () {
        it('should return true when ArrayAccess::offsetExists(...) returns false', function () {
            this.objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(this.keyValue)])
            ).returns(this.valueFactory.createBoolean(false));

            expect(this.reference.isEmpty()).to.be.true;
        });

        it('should return true when ArrayAccess::offsetExists(...) returns true but ::offsetGet(...) empty', function () {
            var offsetGetReturnValue = sinon.createStubInstance(Value);
            this.objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(this.keyValue)])
            ).returns(this.valueFactory.createBoolean(true));
            this.objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(this.keyValue)])
            ).returns(offsetGetReturnValue);
            offsetGetReturnValue.isEmpty.returns(true);

            expect(this.reference.isEmpty()).to.be.true;
        });

        it('should return false when ArrayAccess::offsetExists(...) returns true and ::offsetGet(...) not empty', function () {
            var offsetGetReturnValue = sinon.createStubInstance(Value);
            this.objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(this.keyValue)])
            ).returns(this.valueFactory.createBoolean(true));
            this.objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(this.keyValue)])
            ).returns(offsetGetReturnValue);
            offsetGetReturnValue.isEmpty.returns(false);

            expect(this.reference.isEmpty()).to.be.false;
        });
    });
});

