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
    LiePromise = require('lie'),
    PromiseBridge = require('../../../src/Control/PromiseBridge');

describe('PromiseBridge', function () {
    let promiseBridge;

    beforeEach(function () {
        promiseBridge = new PromiseBridge();
    });

    describe('isPromise()', function () {
        it('should return true for native Promise instances', function () {
            const promise = new Promise(function () {});

            expect(promiseBridge.isPromise(promise)).to.be.true;
        });

        it('should return true for LiePromise instances', function () {
            const promise = new LiePromise(function () {});

            expect(promiseBridge.isPromise(promise)).to.be.true;
        });

        it('should return false for non-Promise values', function () {
            expect(promiseBridge.isPromise(null)).to.be.false;
            expect(promiseBridge.isPromise(undefined)).to.be.false;
            expect(promiseBridge.isPromise(123)).to.be.false;
            expect(promiseBridge.isPromise('string')).to.be.false;
            expect(promiseBridge.isPromise({})).to.be.false;
            expect(promiseBridge.isPromise([])).to.be.false;
            expect(promiseBridge.isPromise(function () {})).to.be.false;
        });

        it('should return false for Promise-like objects', function () {
            const promiseLike = {
                then: function () {},
                catch: function () {}
            };

            expect(promiseBridge.isPromise(promiseLike)).to.be.false;
        });
    });
});
