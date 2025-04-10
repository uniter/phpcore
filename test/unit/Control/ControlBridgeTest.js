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
    ControlBridge = require('../../../src/Control/ControlBridge'),
    Future = require('../../../src/Control/Future'),
    LiePromise = require('lie'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    Present = require('../../../src/Control/Present'),
    PromiseBridge = require('../../../src/Control/PromiseBridge'),
    Reference = require('../../../src/Reference/Reference'),
    Value = require('../../../src/Value').sync(),
    Variable = require('../../../src/Variable').sync();

describe('ControlBridge', function () {
    var bridge,
        promiseBridge;

    beforeEach(function () {
        promiseBridge = new PromiseBridge();
        bridge = new ControlBridge(Future, Present, Reference, Value, Variable, promiseBridge);
    });

    describe('isChainable()', function () {
        it('should return true for Futures', function () {
            var future = sinon.createStubInstance(Future);

            expect(bridge.isChainable(future)).to.be.true;
        });

        it('should return true for Presents', function () {
            var present = sinon.createStubInstance(Present);

            expect(bridge.isChainable(present)).to.be.true;
        });

        it('should return true for References', function () {
            var reference = sinon.createStubInstance(Reference);

            expect(bridge.isChainable(reference)).to.be.true;
        });

        it('should return true for Values', function () {
            var value = sinon.createStubInstance(Value);

            expect(bridge.isChainable(value)).to.be.true;
        });

        it('should return true for Variables', function () {
            var variable = sinon.createStubInstance(Variable);

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
            var future = sinon.createStubInstance(Future);

            expect(bridge.isFuture(future)).to.be.true;
        });

        it('should return true for Presents', function () {
            var present = sinon.createStubInstance(Present);

            expect(bridge.isFuture(present)).to.be.true;
        });

        it('should return false for References', function () {
            var reference = sinon.createStubInstance(Reference);

            expect(bridge.isFuture(reference)).to.be.false;
        });

        it('should return false for Values', function () {
            var value = sinon.createStubInstance(Value);

            expect(bridge.isFuture(value)).to.be.false;
        });

        it('should return false for Variables', function () {
            var variable = sinon.createStubInstance(Variable);

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
            var future = sinon.createStubInstance(Future);

            expect(bridge.isThrowable(future)).to.be.false;
        });

        it('should return false for Presents', function () {
            var present = sinon.createStubInstance(Present);

            expect(bridge.isThrowable(present)).to.be.false;
        });

        it('should return false for References', function () {
            var reference = sinon.createStubInstance(Reference);

            expect(bridge.isThrowable(reference)).to.be.false;
        });

        it('should return true for Throwable ObjectValues', function () {
            var value = sinon.createStubInstance(ObjectValue);
            value.getType.returns('object');
            value.classIs.withArgs('Throwable').returns(true);

            expect(bridge.isThrowable(value)).to.be.true;
        });

        it('should return false for non-Throwable ObjectValues', function () {
            var value = sinon.createStubInstance(ObjectValue);
            value.getType.returns('object');
            value.classIs.withArgs('Throwable').returns(false);

            expect(bridge.isThrowable(value)).to.be.false;
        });

        it('should return false for non-object Values', function () {
            var value = sinon.createStubInstance(Value);
            value.getType.returns('string');

            expect(bridge.isThrowable(value)).to.be.false;
        });

        it('should return false for Variables', function () {
            var variable = sinon.createStubInstance(Variable);

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

    describe('isPromise()', function () {
        it('should return true for native Promises', function () {
            expect(bridge.isPromise(new Promise(function () {}))).to.be.true;
        });

        it('should return true for Lie Promises', function () {
            expect(bridge.isPromise(new LiePromise(function () {}))).to.be.true;
        });

        it('should return false for Futures', function () {
            var future = sinon.createStubInstance(Future);

            expect(bridge.isPromise(future)).to.be.false;
        });

        it('should return false for Presents', function () {
            var present = sinon.createStubInstance(Present);

            expect(bridge.isPromise(present)).to.be.false;
        });

        it('should return false for References', function () {
            var reference = sinon.createStubInstance(Reference);

            expect(bridge.isPromise(reference)).to.be.false;
        });

        it('should return false for Values', function () {
            var value = sinon.createStubInstance(Value);

            expect(bridge.isPromise(value)).to.be.false;
        });

        it('should return false for Variables', function () {
            var variable = sinon.createStubInstance(Variable);

            expect(bridge.isPromise(variable)).to.be.false;
        });

        it('should return false for boolean primitives', function () {
            expect(bridge.isPromise(true)).to.be.false;
        });

        it('should return false for null', function () {
            expect(bridge.isPromise(null)).to.be.false;
        });

        it('should return false for number primitives', function () {
            expect(bridge.isPromise(21)).to.be.false;
        });

        it('should return false for other objects', function () {
            expect(bridge.isPromise({my: 'object'})).to.be.false;
        });

        it('should return false for string primitives', function () {
            expect(bridge.isPromise('my string')).to.be.false;
        });

        it('should return false for symbols', function () {
            expect(bridge.isPromise(Symbol('my symbol'))).to.be.false;
        });

        it('should return false for undefined', function () {
            expect(bridge.isPromise(undefined)).to.be.false;
        });
    });
});
