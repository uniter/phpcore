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
    Promise = require('lie'),
    Result = require('../../../src/FFI/Result');

describe('FFI Result', function () {
    describe('getAsync()', function () {
        it('should return a resolved promise when only a sync callback is given', function () {
            this.syncCallback = sinon.stub();
            this.syncCallback.returns(21);

            this.result = new Result(this.syncCallback);

            return expect(this.result.getAsync()).to.eventually.equal(21);
        });

        it('should return a promise from the async callback when given', function () {
            this.asyncCallback = sinon.stub();
            this.syncCallback = sinon.stub();
            this.asyncCallback.callsFake(function () {
                return Promise.resolve(101);
            });

            this.result = new Result(this.syncCallback, this.asyncCallback);

            return expect(this.result.getAsync()).to.eventually.equal(101);
        });

        it('should throw when the async callback returns a non-Promise', function () {
            this.asyncCallback = sinon.stub();
            this.syncCallback = sinon.stub();
            this.asyncCallback.callsFake(function () {
                return 'I am not a promise';
            });

            this.result = new Result(this.syncCallback, this.asyncCallback);

            expect(function () {
                this.result.getAsync();
            }.bind(this)).to.throw('Async callback did not return a Promise');
        });
    });

    describe('getSync()', function () {
        it('should return a value from the sync callback', function () {
            this.syncCallback = sinon.stub();
            this.syncCallback.returns(99);

            this.result = new Result(this.syncCallback, this.asyncCallback);

            expect(this.result.getSync()).to.equal(99);
        });
    });
});
