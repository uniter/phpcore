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
    jsObjectClassFactory = require('../../../../src/builtin/classes/JSObject'),
    CallStack = require('../../../../src/CallStack');

describe('PHP builtin JSObject class', function () {
    var callStack,
        InternalJSObjectClass,
        internals;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        internals = {
            callStack: callStack,
            defineUnwrapper: sinon.stub()
        };

        InternalJSObjectClass = jsObjectClassFactory(internals);
    });

    describe('__call()', function () {
        it('should have the outbound stack marker as its name for stack cleaning', function () {
            expect(InternalJSObjectClass.prototype.__call.name).to.equal('__uniterOutboundStackMarker__');
        });
    });
});
