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
    DebugValue = require('../../../src/Debug/DebugValue'),
    Value = require('../../../src/Value').sync();

describe('DebugValue', function () {
    beforeEach(function () {
        this.value = sinon.createStubInstance(Value);

        this.debugValue = new DebugValue(this.value);
    });

    describe('getValue()', function () {
        it('should return the wrapped Value', function () {
            expect(this.debugValue.getValue()).to.equal(this.value);
        });
    });

    describe('isDefined()', function () {
        it('should always return true for a DebugValue', function () {
            expect(this.debugValue.isDefined()).to.be.true;
        });
    });
});
