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
    phpCommon = require('phpcommon'),
    sinon = require('sinon'),
    tools = require('../tools'),
    Exception = phpCommon.Exception,
    Promise = require('lie'),
    Result = require('../../../src/FFI/Result');

describe('FFIResult (async mode)', function () {
    var asyncCallback,
        controlBridge,
        hostScheduler,
        state,
        syncCallback,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        controlBridge = state.getControlBridge();
        hostScheduler = state.getHostScheduler();
        valueFactory = state.getValueFactory();

        asyncCallback = sinon.stub();
        syncCallback = sinon.stub();
    });

    describe('getAsync()', function () {
        it('should return a promise from the async callback when given', function () {
            var asyncCallback = sinon.stub(),
                result;
            asyncCallback.callsFake(function () {
                return Promise.resolve(101);
            });

            result = new Result(syncCallback, asyncCallback, valueFactory, controlBridge, 'async');

            return expect(result.getAsync()).to.eventually.equal(101);
        });

        it('should throw when the async callback returns a non-Promise', function () {
            var asyncCallback = sinon.stub(),
                result;
            asyncCallback.callsFake(function () {
                return 'I am not a promise';
            });

            result = new Result(syncCallback, asyncCallback, valueFactory, controlBridge, 'async');

            expect(function () {
                result.getAsync();
            }).to.throw(
                Exception,
                'Async callback did not return a Promise'
            );
        });

        it('should fall back to sync callback when no async callback is provided', function () {
            var result;
            syncCallback.returns(42);

            result = new Result(syncCallback, null, valueFactory, controlBridge, 'async');

            return expect(result.getAsync()).to.eventually.equal(42);
        });
    });

    describe('resolve()', function () {
        it('should return the result from the Promise returned by .getAsync(), coerced to a Value object', async function () {
            var ffiResult = new Result(syncCallback, asyncCallback, valueFactory, controlBridge, 'async'),
                resultValue;
            asyncCallback.returns(new Promise(function (resolve) {
                hostScheduler.queueMacrotask(function () {
                    resolve(21);
                });
            }));

            resultValue = await ffiResult.resolve().toPromise();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(21);
        });

        it('should handle Promise rejection by propagating the error', async function () {
            var ffiResult = new Result(syncCallback, asyncCallback, valueFactory, controlBridge, 'async'),
                error = new Error('Test error');
            asyncCallback.returns(new Promise(function (resolve, reject) {
                hostScheduler.queueMacrotask(function () {
                    reject(error);
                });
            }));

            await expect(ffiResult.resolve().toPromise()).to.be.rejectedWith(error);
        });
    });
});
