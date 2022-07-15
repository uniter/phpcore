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
        defineMethodCaller,
        InternalJSObjectClass,
        internals;

    beforeEach(function () {
        callStack = sinon.createStubInstance(CallStack);
        defineMethodCaller = sinon.stub();
        internals = {
            callStack: callStack,
            defineMethodCaller: defineMethodCaller,
            defineUnwrapper: sinon.stub(),
            disableAutoCoercion: sinon.stub()
        };

        InternalJSObjectClass = jsObjectClassFactory(internals);
    });

    describe('custom method caller via .defineMethodCaller(...)', function () {
        it('should have the outbound stack marker as its name for stack cleaning', function () {
            expect(defineMethodCaller.args[0][0].name).to.equal('__uniterOutboundStackMarker__');
        });
    });
});
