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
    NonV8FrameStackHooker = require('../../../../src/FFI/Stack/NonV8FrameStackHooker'),
    StackCleaner = require('../../../../src/FFI/Stack/StackCleaner');

describe('NonV8FrameStackHooker', function () {
    var frame,
        frameStackHooker,
        NativeError,
        stackCleaner;

    beforeEach(function () {
        NativeError = sinon.stub();
        frame = {
            Error: NativeError,
            frames: []
        };
        stackCleaner = sinon.createStubInstance(StackCleaner);

        frameStackHooker = new NonV8FrameStackHooker(stackCleaner);
    });

    describe('hook()', function () {
        describe('when Error.prototype.stack was previously defined as an accessor', function () {
            var getStack,
                setStack;

            beforeEach(function () {
                getStack = sinon.stub().returns('my dirty stack');
                setStack = sinon.stub();

                Object.defineProperty(NativeError.prototype, 'stack', {
                    configurable: true,
                    enumerable: false,
                    get: getStack,
                    set: setStack
                });

                stackCleaner.cleanStack
                    .withArgs('my dirty stack')
                    .returns('my cleaned stack');
            });

            it('should override its getter with one that processes via StackCleaner', function () {
                var error;
                frameStackHooker.hook(frame);
                error = new NativeError('My error');

                expect(error.stack).to.equal('my cleaned stack');
            });

            it('should override its setter with one that just proxies through to the original', function () {
                var error;
                frameStackHooker.hook(frame);
                error = new NativeError('My error');

                error.stack = 'my changed stack';

                expect(setStack).to.have.been.calledOnce;
                expect(setStack).to.have.been.calledWith('my changed stack');
            });
        });

        describe('when Error.prototype.stack was previously defined as a value', function () {
            var getStack,
                setStack;

            beforeEach(function () {
                getStack = sinon.stub().returns('my dirty stack');
                setStack = sinon.stub();

                Object.defineProperty(NativeError.prototype, 'stack', {
                    configurable: true,
                    enumerable: false,
                    value: 'my static stack',
                    writable: true
                });
            });

            it('should not override fetches of the property', function () {
                var error;
                frameStackHooker.hook(frame);
                error = new NativeError('My error');

                expect(error.stack).to.equal('my static stack');
            });

            it('should not override assignments to the property', function () {
                var error;
                frameStackHooker.hook(frame);
                error = new NativeError('My error');

                error.stack = 'my changed stack';

                expect(error.stack).to.equal('my changed stack');
            });
        });
    });
});
