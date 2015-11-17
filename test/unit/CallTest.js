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
    Call = require('../../src/Call'),
    Scope = require('../../src/Scope').sync();

describe('Call', function () {
    beforeEach(function () {
        this.scope = sinon.createStubInstance(Scope);

        this.call = new Call(this.scope);
    });

    describe('getScope()', function () {
        it('should return the scope', function () {
            expect(this.call.getScope()).to.equal(this.scope);
        });
    });
});
