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
    ControlBridge = require('../../../src/Control/ControlBridge'),
    ObjectValue = require('../../../src/Value/Object').sync();

describe('ControlBridge', function () {
    var bridge,
        state,
        StubFuture,
        StubPresent,
        StubReference,
        StubValue,
        StubVariable;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        StubFuture = sinon.stub();
        StubPresent = sinon.stub();
        StubReference = sinon.stub();
        StubValue = sinon.stub();
        StubVariable = sinon.stub();

        StubValue.prototype.getType = sinon.stub();

        bridge = new ControlBridge(StubFuture, StubPresent, StubReference, StubValue, StubVariable);
    });

    describe('isChainable()', function () {
        it('should return true for Futures', function () {
            var future = sinon.createStubInstance(StubFuture);

            expect(bridge.isChainable(future)).to.be.true;
        });

        it('should return true for Presents', function () {
            var present = sinon.createStubInstance(StubPresent);

            expect(bridge.isChainable(present)).to.be.true;
        });

        it('should return true for References', function () {
            var reference = sinon.createStubInstance(StubReference);

            expect(bridge.isChainable(reference)).to.be.true;
        });

        it('should return true for Values', function () {
            var value = sinon.createStubInstance(StubValue);

            expect(bridge.isChainable(value)).to.be.true;
        });

        it('should return true for Variables', function () {
            var variable = sinon.createStubInstance(StubVariable);

            expect(bridge.isChainable(variable)).to.be.true;
        });

        it('should return false for boolean primitives', function () {
            expect(bridge.isChainable(true)).to.be.false;
        });

        it('should return false for null', function () {
            expect(bridge.isChainable(null)).to.be.false;
        });

        it('should return false for number primitives', function () {
            expect(bridge.isChainable(21)).to.be.false;
        });

        it('should return false for other objects', function () {
            expect(bridge.isChainable({my: 'object'})).to.be.false;
        });

        it('should return false for string primitives', function () {
            expect(bridge.isChainable('my string')).to.be.false;
        });

        it('should return false for symbols', function () {
            expect(bridge.isChainable(Symbol('my symbol'))).to.be.false;
        });

        it('should return false for undefined', function () {
            expect(bridge.isChainable(undefined)).to.be.false;
        });
    });

    describe('isFuture()', function () {
        it('should return true for Futures', function () {
            var future = sinon.createStubInstance(StubFuture);

            expect(bridge.isFuture(future)).to.be.true;
        });

        it('should return true for Presents', function () {
            var present = sinon.createStubInstance(StubPresent);

            expect(bridge.isFuture(present)).to.be.true;
        });

        it('should return false for References', function () {
            var reference = sinon.createStubInstance(StubReference);

            expect(bridge.isFuture(reference)).to.be.false;
        });

        it('should return false for Values', function () {
            var value = sinon.createStubInstance(StubValue);

            expect(bridge.isFuture(value)).to.be.false;
        });

        it('should return false for Variables', function () {
            var variable = sinon.createStubInstance(StubVariable);

            expect(bridge.isFuture(variable)).to.be.false;
        });

        it('should return false for boolean primitives', function () {
            expect(bridge.isFuture(true)).to.be.false;
        });

        it('should return false for null', function () {
            expect(bridge.isFuture(null)).to.be.false;
        });

        it('should return false for number primitives', function () {
            expect(bridge.isFuture(21)).to.be.false;
        });

        it('should return false for other objects', function () {
            expect(bridge.isFuture({my: 'object'})).to.be.false;
        });

        it('should return false for string primitives', function () {
            expect(bridge.isFuture('my string')).to.be.false;
        });

        it('should return false for symbols', function () {
            expect(bridge.isFuture(Symbol('my symbol'))).to.be.false;
        });

        it('should return false for undefined', function () {
            expect(bridge.isFuture(undefined)).to.be.false;
        });
    });

    describe('isThrowable()', function () {
        it('should return false for Futures', function () {
            var future = sinon.createStubInstance(StubFuture);

            expect(bridge.isThrowable(future)).to.be.false;
        });

        it('should return false for Presents', function () {
            var present = sinon.createStubInstance(StubPresent);

            expect(bridge.isThrowable(present)).to.be.false;
        });

        it('should return false for References', function () {
            var reference = sinon.createStubInstance(StubReference);

            expect(bridge.isThrowable(reference)).to.be.false;
        });

        it('should return true for Throwable ObjectValues', function () {
            var value = sinon.createStubInstance(StubValue);
            value.classIs = sinon.stub();
            value.classIs.withArgs('Throwable').returns(true);
            value.classIs.returns(false);
            value.getType.returns('object');

            expect(bridge.isThrowable(value)).to.be.true;
        });

        it('should return false for non-Throwable ObjectValues', function () {
            var value = sinon.createStubInstance(StubValue);
            value.classIs = sinon.stub();
            value.classIs.withArgs('Throwable').returns(false);
            value.classIs.returns(false);
            value.getType.returns('object');

            expect(bridge.isThrowable(value)).to.be.false;
        });

        it('should return false for non-object Values', function () {
            var value = sinon.createStubInstance(StubValue);
            value.getType.returns('string');

            expect(bridge.isThrowable(value)).to.be.false;
        });

        it('should return false for Variables', function () {
            var variable = sinon.createStubInstance(StubVariable);

            expect(bridge.isThrowable(variable)).to.be.false;
        });

        it('should return false for boolean primitives', function () {
            expect(bridge.isThrowable(true)).to.be.false;
        });

        it('should return false for null', function () {
            expect(bridge.isThrowable(null)).to.be.false;
        });

        it('should return false for number primitives', function () {
            expect(bridge.isThrowable(21)).to.be.false;
        });

        it('should return false for other objects', function () {
            expect(bridge.isThrowable({my: 'object'})).to.be.false;
        });

        it('should return false for string primitives', function () {
            expect(bridge.isThrowable('my string')).to.be.false;
        });

        it('should return false for symbols', function () {
            expect(bridge.isThrowable(Symbol('my symbol'))).to.be.false;
        });

        it('should return false for undefined', function () {
            expect(bridge.isThrowable(undefined)).to.be.false;
        });
    });
});
