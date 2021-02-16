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
    GlobalStackHooker = require('../../../../src/FFI/Stack/GlobalStackHooker'),
    OptionSet = require('../../../../src/OptionSet'),
    StackHooker = require('../../../../src/FFI/Stack/StackHooker');

describe('StackHooker', function () {
    var globalStackHooker,
        optionSet,
        stackHooker;

    beforeEach(function () {
        globalStackHooker = sinon.createStubInstance(GlobalStackHooker);
        optionSet = sinon.createStubInstance(OptionSet);

        stackHooker = new StackHooker(globalStackHooker, optionSet);
    });

    describe('hook()', function () {
        it('should invoke the GlobalStackHooker when stackCleaning is enabled', function () {
            optionSet.getOption
                .withArgs('stackCleaning')
                .returns(true);

            stackHooker.hook();

            expect(globalStackHooker.hook).to.have.been.calledOnce;
        });

        it('should not invoke the GlobalStackHooker when stackCleaning is disabled', function () {
            optionSet.getOption
                .withArgs('stackCleaning')
                .returns(false);

            stackHooker.hook();

            expect(globalStackHooker.hook).not.to.have.been.called;
        });
    });
});
