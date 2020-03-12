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
    var element,
        keyValue,
        objectValue,
        valueFactory;

    beforeEach(function () {
        keyValue = sinon.createStubInstance(StringValue);
        objectValue = sinon.createStubInstance(ObjectValue);
        valueFactory = new ValueFactory();

        objectValue.callMethod.withArgs(
            'offsetExists',
            sinon.match([sinon.match.same(keyValue)])
        ).returns(valueFactory.createBoolean(true));
        objectValue.callMethod.withArgs(
            'offsetGet',
            sinon.match([sinon.match.same(keyValue)])
        ).returns(valueFactory.createString('hello'));

        element = new ObjectElementReference(valueFactory, objectValue, keyValue);
    });

    describe('concatWith()', function () {
        it('should append the given value to the result of the getter and pass it to the setter', function () {
            element.concatWith(valueFactory.createString(' world'));

            expect(objectValue.callMethod).to.have.been.calledWith(
                'offsetSet',
                sinon.match([
                    sinon.match.same(keyValue),
                    sinon.match(function (value) {
                        return value instanceof Value && value.getNative() === 'hello world';
                    })
                ])
            );
        });
    });

    describe('decrementBy()', function () {
        it('should subtract the given value from the result of the getter and pass it to the setter', function () {
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createInteger(21));

            element.decrementBy(valueFactory.createInteger(10));

            expect(objectValue.callMethod).to.have.been.calledWith(
                'offsetSet',
                sinon.match([
                    sinon.match.same(keyValue),
                    sinon.match(function (value) {
                        return value instanceof Value && value.getNative() === 11;
                    })
                ])
            );
        });
    });

    describe('divideBy()', function () {
        it('should divide the result of the getter by the given value and pass it to the setter', function () {
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createInteger(40));

            element.divideBy(valueFactory.createInteger(2));

            expect(objectValue.callMethod).to.have.been.calledWith(
                'offsetSet',
                sinon.match([
                    sinon.match.same(keyValue),
                    sinon.match(function (value) {
                        return value instanceof Value && value.getNative() === 20;
                    })
                ])
            );
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the result from ArrayAccess::offsetGet(...)', function () {
            expect(element.getNative()).to.equal('hello');
        });
    });

    describe('getValueOrNull()', function () {
        it('should return the value when the element is defined', function () {
            var value = valueFactory.createString('my value');
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(value);

            expect(element.getValueOrNull()).to.equal(value);
        });

        it('should return a NullValue when the element is not defined', function () {
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createBoolean(false));

            expect(element.getValueOrNull().getType()).to.equal('null');
        });
    });

    describe('incrementBy()', function () {
        it('should add the given value to the result of the getter and pass it to the setter', function () {
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createInteger(21));

            element.incrementBy(valueFactory.createInteger(6));

            expect(objectValue.callMethod).to.have.been.calledWith(
                'offsetSet',
                sinon.match([
                    sinon.match.same(keyValue),
                    sinon.match(function (value) {
                        return value instanceof Value && value.getNative() === 27;
                    })
                ])
            );
        });
    });

    describe('isDefined()', function () {
        it('should return true when ArrayAccess::offsetExists(...) returns true', function () {
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createBoolean(true));

            expect(element.isDefined()).to.be.true;
        });

        it('should return false when ArrayAccess::offsetExists(...) returns false', function () {
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createBoolean(false));

            expect(element.isDefined()).to.be.false;
        });
    });

    describe('isEmpty()', function () {
        it('should return true when ArrayAccess::offsetExists(...) returns false', function () {
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createBoolean(false));

            expect(element.isEmpty()).to.be.true;
        });

        it('should return true when ArrayAccess::offsetExists(...) returns true but ::offsetGet(...) empty', function () {
            var offsetGetReturnValue = sinon.createStubInstance(Value);
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createBoolean(true));
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(offsetGetReturnValue);
            offsetGetReturnValue.isEmpty.returns(true);

            expect(element.isEmpty()).to.be.true;
        });

        it('should return false when ArrayAccess::offsetExists(...) returns true and ::offsetGet(...) not empty', function () {
            var offsetGetReturnValue = sinon.createStubInstance(Value);
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createBoolean(true));
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(offsetGetReturnValue);
            offsetGetReturnValue.isEmpty.returns(false);

            expect(element.isEmpty()).to.be.false;
        });
    });

    describe('isSet()', function () {
        it('should return false when ArrayAccess::offsetExists(...) returns false', function () {
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createBoolean(false));

            expect(element.isSet()).to.be.false;
        });

        it('should return false when ArrayAccess::offsetExists(...) returns true but ::offsetGet(...) is not set', function () {
            var offsetGetReturnValue = sinon.createStubInstance(Value);
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createBoolean(true));
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(offsetGetReturnValue);
            offsetGetReturnValue.isSet.returns(false);

            expect(element.isSet()).to.be.false;
        });

        it('should return true when ArrayAccess::offsetExists(...) returns true and ::offsetGet(...) is set', function () {
            var offsetGetReturnValue = sinon.createStubInstance(Value);
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createBoolean(true));
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(offsetGetReturnValue);
            offsetGetReturnValue.isSet.returns(true);

            expect(element.isSet()).to.be.true;
        });
    });

    describe('multiplyBy()', function () {
        it('should multiply the result of the getter by the given value and pass it to the setter', function () {
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createInteger(2));

            element.multiplyBy(valueFactory.createInteger(7));

            expect(objectValue.callMethod).to.have.been.calledWith(
                'offsetSet',
                sinon.match([
                    sinon.match.same(keyValue),
                    sinon.match(function (value) {
                        return value instanceof Value && value.getNative() === 14;
                    })
                ])
            );
        });
    });
});

