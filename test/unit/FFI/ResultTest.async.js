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
    Promise = require('lie'),
    Result = require('../../../src/FFI/Result');

describe('FFIResult (async mode)', function () {
    var asyncCallback,
        state,
        syncCallback,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
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

            result = new Result(syncCallback, asyncCallback, valueFactory, 'async');

            return expect(result.getAsync()).to.eventually.equal(101);
        });

        it('should throw when the async callback returns a non-Promise', function () {
            var asyncCallback = sinon.stub(),
                result;
            asyncCallback.callsFake(function () {
                return 'I am not a promise';
            });

            result = new Result(syncCallback, asyncCallback, valueFactory, 'async');

            expect(function () {
                result.getAsync();
            }.bind(this)).to.throw('Async callback did not return a Promise');
        });
    });

    describe('resolve()', function () {
        it('should return the result from the Promise returned by .getAsync(), coerced to a Value object', async function () {
            var ffiResult = new Result(syncCallback, asyncCallback, valueFactory, 'async'),
                resultValue;
            asyncCallback.returns(new Promise(function (resolve) {
                setImmediate(function () {
                    resolve(21);
                });
            }));

            resultValue = await ffiResult.resolve().toPromise();

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(21);
        });
    });
});
