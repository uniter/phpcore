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
    tools = require('../tools'),
    Call = require('../../../src/FFI/Call'),
    Exception = phpCommon.Exception;

describe('FFI Call', function () {
    var arg1,
        arg2,
        call,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState('async');
        valueFactory = state.getValueFactory();

        arg1 = valueFactory.createString('first arg');
        arg2 = valueFactory.createString('second arg');

        call = new Call([arg1, arg2]);
    });

    describe('enableStrictTypes()', function () {
        it('should raise an exception', function () {
            expect(function () {
                call.enableStrictTypes();
            }).to.throw(
                Exception,
                'FFI calls cannot be switched into strict-types mode'
            );
        });
    });

    describe('isStrictTypesMode()', function () {
        it('should return false as FFI calls are always in weak type-checking mode', function () {
            expect(call.isStrictTypesMode()).to.be.false;
        });
    });
});
