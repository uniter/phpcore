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
    var callStack,
        factory,
        statusValue,
        value;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        factory = new ValueFactory();
        statusValue = factory.createInteger(21);

        value = new ExitValue(factory, callStack, statusValue);
    });

    describe('getStatus()', function () {
        it('should return the status when set', function () {
            expect(value.getStatus()).to.equal(21);
        });

        it('should return zero by default', function () {
            var value = new ExitValue(factory, callStack);

            expect(value.getStatus()).to.equal(0);
        });
    });
});
