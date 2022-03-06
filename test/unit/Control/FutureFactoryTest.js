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
    tools = require('../tools'),
    Future = require('../../../src/Control/Future');

describe('FutureFactory', function () {
    var futureFactory,
        state;

    beforeEach(function () {
        state = tools.createIsolatedState();
        futureFactory = state.getFutureFactory();
    });

    describe('createAsyncPresent()', function () {
        it('should return a pending Future', function () {
            var future = futureFactory.createAsyncPresent('my value');

            expect(future).to.be.an.instanceOf(Future);
            expect(future.isPending()).to.be.true;
        });

        it('should return a Future that eventually resolves with the given value', async function () {
            var future = futureFactory.createAsyncPresent('my value');

            expect(await future.toPromise()).to.equal('my value');
        });
    });

    describe('createAsyncRejection()', function () {
        it('should return a pending Future', function () {
            var future = futureFactory.createAsyncRejection(new Error('my error'));

            expect(future).to.be.an.instanceOf(Future);
            expect(future.isPending()).to.be.true;
        });

        it('should return a Future that eventually rejects with the given error', function () {
            var error = new Error('my error'),
                future = futureFactory.createAsyncRejection(error);

            return expect(future.toPromise()).to.eventually.be.rejectedWith(error);
        });
    });
});
