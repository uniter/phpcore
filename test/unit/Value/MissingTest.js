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
    CallStack = require('../../../src/CallStack'),
    MissingValue = require('../../../src/Value/Missing');

describe('MissingValue', function () {
    var callStack,
        factory,
        flow,
        futureFactory,
        referenceFactory,
        state,
        value;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        state = tools.createIsolatedState('async', {
            'call_stack': callStack
        });
        factory = state.getValueFactory();
        flow = state.getFlow();
        futureFactory = state.getFutureFactory();
        referenceFactory = state.getReferenceFactory();

        value = new MissingValue(factory, referenceFactory, futureFactory, callStack, flow);
    });

    describe('getType()', function () {
        it('should return "null"', function () {
            expect(value.getType()).to.equal('null');
        });
    });

    describe('getUnderlyingType()', function () {
        it('should return "missing"', function () {
            expect(value.getUnderlyingType()).to.equal('missing');
        });
    });
});
