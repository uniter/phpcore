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
    Result = require('../../../src/FFI/Result');

describe('FFIResult (sync mode)', function () {
    var state,
        syncCallback,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        valueFactory = state.getValueFactory();

        syncCallback = sinon.stub();
    });

    describe('getAsync()', function () {
        it('should return a resolved promise when only a sync callback is given', function () {
            var result;
            syncCallback.returns(21);

            result = new Result(syncCallback, null, valueFactory, 'sync');

            return expect(result.getAsync()).to.eventually.equal(21);
        });
    });

    describe('getSync()', function () {
        it('should return a value from the sync callback', function () {
            var asyncCallback = sinon.stub(),
                result;
            syncCallback.returns(99);

            result = new Result(syncCallback, asyncCallback, valueFactory, 'sync');

            expect(result.getSync()).to.equal(99);
        });
    });

    describe('resolve()', function () {
        it('should return the result from .getSync(), coerced to a Value object', function () {
            var ffiResult = new Result(syncCallback, null, valueFactory, 'sync'),
                resultValue;
            syncCallback.returns(1234);

            resultValue = ffiResult.resolve(valueFactory);

            expect(resultValue.getType()).to.equal('int');
            expect(resultValue.getNative()).to.equal(1234);
        });
    });
});
