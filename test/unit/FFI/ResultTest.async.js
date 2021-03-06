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
    pausable = require('pausable'),
    sinon = require('sinon'),
    Promise = require('lie'),
    Result = require('../../../src/FFI/Result'),
    ValueFactory = require('../../../src/ValueFactory').async(pausable);

describe('FFIResult (async mode)', function () {
    var asyncCallback,
        syncCallback;

    beforeEach(function () {
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

            result = new Result(syncCallback, asyncCallback);

            return expect(result.getAsync()).to.eventually.equal(101);
        });

        it('should throw when the async callback returns a non-Promise', function () {
            var asyncCallback = sinon.stub(),
                result;
            asyncCallback.callsFake(function () {
                return 'I am not a promise';
            });

            result = new Result(syncCallback, asyncCallback);

            expect(function () {
                result.getAsync();
            }.bind(this)).to.throw('Async callback did not return a Promise');
        });
    });

    describe('resolve()', function () {
        var valueFactory;

        beforeEach(function () {
            valueFactory = new ValueFactory();
        });

        it('should return the result from the Promise returned by .getAsync(), coerced to a Value object, blocking via Pausable', function (done) {
            var func = pausable.executeSync([
                done,
                expect,
                pausable,
                asyncCallback,
                syncCallback,
                valueFactory,
                Result
            ], function (done, expect, pausable, asyncCallback, syncCallback, valueFactory, Result) {
                return function () {
                    var ffiResult = new Result(syncCallback, asyncCallback, pausable),
                        resultValue;
                    asyncCallback.returns(new Promise(function (resolve) {
                        setTimeout(function () {
                            resolve(21);
                        }, 1);
                    }));

                    resultValue = ffiResult.resolve(valueFactory);

                    expect(resultValue.getType()).to.equal('int');
                    expect(resultValue.getNative()).to.equal(21);
                    done();
                };
            });

            pausable.call(func);
        });
    });
});
