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
    ExitValue = require('../../../src/Value/Exit').sync();

describe('Exit', function () {
    var callStack,
        factory,
        futureFactory,
        referenceFactory,
        state,
        statusValue,
        value;

    beforeEach(function () {
        state = tools.createIsolatedState();
        callStack = state.getCallStack();
        factory = state.getValueFactory();
        futureFactory = state.getFutureFactory();
        referenceFactory = state.getReferenceFactory();
        statusValue = factory.createInteger(21);

        value = new ExitValue(
            factory,
            referenceFactory,
            futureFactory,
            callStack,
            statusValue
        );
    });

    describe('getStatus()', function () {
        it('should return the status when set', function () {
            expect(value.getStatus()).to.equal(21);
        });

        it('should return zero by default', function () {
            var value = new ExitValue(
                factory,
                referenceFactory,
                futureFactory,
                callStack
            );

            expect(value.getStatus()).to.equal(0);
        });
    });
});
