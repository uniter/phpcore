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
    var debugValue,
        value;

    beforeEach(function () {
        value = sinon.createStubInstance(Value);

        debugValue = new DebugValue(value);
    });

    describe('getValue()', function () {
        it('should return the wrapped Value', function () {
            expect(debugValue.getValue()).to.equal(value);
        });
    });

    describe('isDefined()', function () {
        it('should always return true for a DebugValue', function () {
            expect(debugValue.isDefined()).to.be.true;
        });
    });
});
