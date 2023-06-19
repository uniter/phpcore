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
    CallStack = require('../../../src/CallStack'),
    Future = require('../../../src/Control/Future'),
    Present = require('../../../src/Control/Present');

describe('Present', function () {
    var callStack,
        chainifier,
        futureFactory,
        present,
        state,
        valueFactory;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        chainifier = state.getService('chainifier');
        futureFactory = state.getFutureFactory();
        valueFactory = state.getValueFactory();

        present = new Present(
            futureFactory,
            chainifier,
            valueFactory,
            'my value'
        );
    });

    describe('asFuture()', function () {
        it('should return a Future that resolves to this present\'s value', async function () {
            var future = present.asFuture();

            expect(future).to.be.an.instanceOf(Future);
            expect(await present.asFuture().toPromise()).to.equal('my value');
        });
    });

    describe('asValue()', function () {
        it('should coerce the value of this present to a Value', async function () {
            var value = present.asValue();

            expect(value.getType()).to.equal('string');
            expect(value.getNative()).to.equal('my value');
        });
    });

    describe('catch()', function () {
        it('should return the present', async function () {
            expect(present.catch(sinon.stub())).to.equal(present);
        });
    });

    describe('concatString()', function () {
        it('should return a new present that appends the given text to its resolved value', async function () {
            var resultPresent = present.concatString(' with a suffix');

            expect(resultPresent.yieldSync()).to.equal('my value with a suffix');
        });
    });

    describe('finally()', function () {
        var finallyHandler;

        beforeEach(function () {
            finallyHandler = sinon.stub();
        });

        it('should call the finally handler once with the present value', function () {
            present.finally(finallyHandler);

            expect(finallyHandler).to.have.been.calledOnce;
            expect(finallyHandler).to.have.been.calledWith('my value');
        });

        it('should return the original value when finally handler returns undefined', function () {
            expect(present.finally(finallyHandler)).to.equal('my value');
        });

        it('should chainify the result of the finally handler', function () {
            var result;
            finallyHandler.returns('my string');

            result = present.finally(finallyHandler);

            expect(result.yieldSync()).to.equal('my string');
        });

        it('should return a rejected Future when finally handler throws', async function () {
            finallyHandler.throws(new Error('Bang!'));

            await expect(present.finally(finallyHandler).toPromise())
                .to.eventually.be.rejectedWith('Bang!');
        });
    });

    describe('isFuture()', function () {
        it('should return true', function () {
            expect(present.isFuture()).to.be.true;
        });
    });

    describe('isPending()', function () {
        it('should always return false', function () {
            expect(present.isPending()).to.be.false;
        });
    });

    describe('isSettled()', function () {
        it('should always return true', function () {
            expect(present.isSettled()).to.be.true;
        });
    });

    describe('next()', function () {
        var resolveHandler;

        beforeEach(function () {
            resolveHandler = sinon.stub();
        });

        it('should return the present when no resolve handler given', async function () {
            expect(present.next()).to.equal(present);
        });

        it('should call the resolve handler once with the present value', function () {
            present.next(resolveHandler);

            expect(resolveHandler).to.have.been.calledOnce;
            expect(resolveHandler).to.have.been.calledWith('my value');
        });

        it('should chainify the result of the resolve handler', function () {
            var result;
            resolveHandler.returns('my string');

            result = present.next(resolveHandler);

            expect(result.yieldSync()).to.equal('my string');
        });

        it('should return a rejected Future when resolve handler throws', async function () {
            resolveHandler.throws(new Error('Bang!'));

            await expect(present.finally(resolveHandler).toPromise())
                .to.eventually.be.rejectedWith('Bang!');
        });
    });

    describe('nextIsolated()', function () {
        var resolveHandler;

        beforeEach(function () {
            resolveHandler = sinon.stub();
        });

        it('should call the resolve handler once with the present value when given', function () {
            present.nextIsolated(resolveHandler);

            expect(resolveHandler).to.have.been.calledOnce;
            expect(resolveHandler).to.have.been.calledWith('my value');
        });

        it('should not throw when no resolve handler is given', function () {
            expect(function () {
                present.nextIsolated();
            }).not.to.throw();
        });
    });

    describe('toPromise()', function () {
        it('should return a Promise resolved with the present value', async function () {
            expect(await present.toPromise()).to.equal('my value');
        });
    });

    describe('yield()', function () {
        it('should return the present value', function () {
            expect(present.yield()).to.equal('my value');
        });
    });

    describe('yieldSync()', function () {
        it('should return the present value', function () {
            expect(present.yieldSync()).to.equal('my value');
        });
    });
});
