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
    tools = require('../tools'),
    ObjectElementReference = require('../../../src/Reference/ObjectElement'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    StringValue = require('../../../src/Value/String').sync();

describe('ObjectElementReference', function () {
    var element,
        futureFactory,
        keyValue,
        objectValue,
        referenceFactory,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
        keyValue = sinon.createStubInstance(StringValue);
        objectValue = sinon.createStubInstance(ObjectValue);
        referenceFactory = state.getReferenceFactory();
        valueFactory = state.getValueFactory();

        objectValue.callMethod.withArgs(
            'offsetExists',
            sinon.match([sinon.match.same(keyValue)])
        ).returns(valueFactory.createBoolean(true));
        objectValue.callMethod.withArgs(
            'offsetGet',
            sinon.match([sinon.match.same(keyValue)])
        ).returns(valueFactory.createString('hello'));

        element = new ObjectElementReference(valueFactory, referenceFactory, objectValue, keyValue);
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
        it('should return true when ArrayAccess::offsetExists(...) returns false', async function () {
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createPresent(false));

            expect(await element.isEmpty().toPromise()).to.be.true;
        });

        it('should return true when ArrayAccess::offsetExists(...) returns true but ::offsetGet(...) empty', async function () {
            var offsetGetReturnValue = valueFactory.createArray([]); // An empty value.
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createPresent(true));
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(offsetGetReturnValue);

            expect(await element.isEmpty().toPromise()).to.be.true;
        });

        it('should return false when ArrayAccess::offsetExists(...) returns true and ::offsetGet(...) not empty', async function () {
            var offsetGetReturnValue = valueFactory.createInteger(21); // A non-empty value.
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createPresent(true));
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(offsetGetReturnValue);

            expect(await element.isEmpty().toPromise()).to.be.false;
        });
    });

    describe('isSet()', function () {
        it('should return false when ArrayAccess::offsetExists(...) returns false', async function () {
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createBoolean(false));

            expect(await element.isSet().toPromise()).to.be.false;
        });

        it('should return false when ArrayAccess::offsetExists(...) returns true but ::offsetGet(...) is not set', async function () {
            var offsetGetReturnValue = valueFactory.createNull(); // An unset value.
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createPresent(true));
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(offsetGetReturnValue);

            expect(await element.isSet().toPromise()).to.be.false;
        });

        it('should return true when ArrayAccess::offsetExists(...) returns true and ::offsetGet(...) is set', async function () {
            var offsetGetReturnValue = valueFactory.createInteger(21); // A set value.
            objectValue.callMethod.withArgs(
                'offsetExists',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createPresent(true));
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(offsetGetReturnValue);

            expect(await element.isSet().toPromise()).to.be.true;
        });
    });
});
