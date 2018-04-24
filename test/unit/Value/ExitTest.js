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
    CallStack = require('../../../src/CallStack'),
    ExitValue = require('../../../src/Value/Exit').sync(),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('Exit', function () {
    beforeEach(function () {
        this.callStack = sinon.createStubInstance(CallStack);
        this.factory = new ValueFactory();
        this.statusValue = this.factory.createInteger(21);

        this.value = new ExitValue(this.factory, this.callStack, this.statusValue);
    });

    describe('getStatus()', function () {
        it('should return the status when set', function () {
            expect(this.value.getStatus()).to.equal(21);
        });

        it('should return zero by default', function () {
            var value = new ExitValue(this.factory, this.callStack);

            expect(value.getStatus()).to.equal(0);
        });
    });
});
