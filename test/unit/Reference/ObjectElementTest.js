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
    Future = require('../../../src/Control/Future'),
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

    describe('asArrayElement()', function () {
        it('should return the value from ArrayAccess::offsetGet(...)', function () {
            var value = valueFactory.createString('my value');
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(value);

            expect(element.asArrayElement()).to.equal(value);
        });
    });

    describe('asEventualNative()', function () {
        it('should return a Future that resolves to the native value from ArrayAccess::offsetGet(...)', async function () {
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createString('my value'));

            expect(await element.asEventualNative().toPromise()).to.equal('my value');
        });
    });

    describe('getNative()', function () {
        it('should return the native value of the result from ArrayAccess::offsetGet(...)', function () {
            expect(element.getNative()).to.equal('hello');
        });
    });

    describe('getValueOrNativeNull()', function () {
        it('should return the value from ArrayAccess::offsetGet(...)', function () {
            var value = valueFactory.createString('my value');
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(value);

            expect(element.getValueOrNativeNull()).to.equal(value);
        });

        // ObjectElements are always defined, so native null should never be returned.
    });

    describe('getValueOrNull()', function () {
        it('should return the value from ArrayAccess::offsetGet(...)', function () {
            var value = valueFactory.createString('my value');
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(value);

            expect(element.getValueOrNull()).to.equal(value);
        });
    });

    describe('hasReferenceSetter()', function () {
        it('should return false', function () {
            expect(element.hasReferenceSetter()).to.be.false;
        });
    });

    describe('isDefined()', function () {
        it('should return true', function () {
            expect(element.isDefined()).to.be.true;
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

    describe('isReferenceable()', function () {
        it('should return true', function () {
            expect(element.isReferenceable()).to.be.true;
        });
    });

    describe('isReference()', function () {
        it('should return false as ObjectElements cannot have references assigned', function () {
            expect(element.isReference()).to.be.false;
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

    describe('setValue()', function () {
        var offsetSetResultFuture,
            value,
            valueForAssignment;

        beforeEach(function () {
            valueForAssignment = valueFactory.createAsyncPresent('my final assigned value');
            value = sinon.createStubInstance(StringValue);
            value.getForAssignment.returns(valueForAssignment);

            offsetSetResultFuture = valueFactory.createAsyncPresent('my discarded result');
            objectValue.callMethod
                .withArgs(
                    'offsetSet',
                    sinon.match([sinon.match.same(keyValue), sinon.match.same(valueForAssignment)])
                )
                // Result is discarded but may be async so should be awaited.
                .returns(offsetSetResultFuture);
        });

        it('should await any FutureValue returned by ->offsetSet(...)', async function () {
            var resultFuture = element.setValue(value);

            expect(offsetSetResultFuture.getType()).to.equal('future');
            expect(offsetSetResultFuture.isPending()).to.be.true;
            await resultFuture.toPromise();
            expect(offsetSetResultFuture.isSettled()).to.be.true;
        });

        it('should return the assigned value', async function () {
            var resultFuture = element.setValue(value),
                resultPresent = await resultFuture.toPromise();

            expect(resultPresent.getType()).to.equal('string');
            expect(resultPresent.getNative()).to.equal('my final assigned value');
        });
    });

    describe('toPromise()', function () {
        it('should return a Promise that resolves with the Value from ArrayAccess::offsetGet(...)', async function () {
            var resultValue;
            objectValue.callMethod.withArgs(
                'offsetGet',
                sinon.match([sinon.match.same(keyValue)])
            ).returns(valueFactory.createString('my value'));

            resultValue = await element.toPromise();

            expect(resultValue.getType()).to.equal('string');
            expect(resultValue.getNative()).to.equal('my value');
        });
    });

    describe('unset()', function () {
        var offsetUnsetResultFuture;

        beforeEach(function () {
            offsetUnsetResultFuture = valueFactory.createAsyncPresent('my discarded result');
            objectValue.callMethod
                .withArgs(
                    'offsetUnset',
                    sinon.match([sinon.match.same(keyValue)])
                )
                // Result is discarded but may be async so should be awaited.
                .returns(offsetUnsetResultFuture);
        });

        it('should return an unwrapped Future', function () {
            expect(element.unset()).to.be.an.instanceOf(Future);
        });

        it('should await any FutureValue returned by ->offsetUnset(...)', async function () {
            var resultFuture = element.unset();

            expect(offsetUnsetResultFuture.getType()).to.equal('future');
            expect(offsetUnsetResultFuture.isPending()).to.be.true;
            await resultFuture.toPromise();
            expect(offsetUnsetResultFuture.isSettled()).to.be.true;
        });
    });
});
