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
    LoadFailedException = require('../../../src/Exception/LoadFailedException');

describe('LoadFailedException', function () {
    beforeEach(function () {
        this.previousError = new Error('My previous error that caused the load to fail');

        this.exception = new LoadFailedException(this.previousError);
    });

    describe('constructor', function () {
        it('should set the public <Error>.message property correctly', function () {
            expect(this.exception.message).to.equal(
                'Load failed :: My previous error that caused the load to fail'
            );
        });
    });

    describe('getPreviousError()', function () {
        it('should return the previous error', function () {
            expect(this.exception.getPreviousError()).to.equal(this.previousError);
        });
    });
});
