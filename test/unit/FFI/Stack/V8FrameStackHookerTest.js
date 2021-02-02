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
    V8FrameStackHooker = require('../../../../src/FFI/Stack/V8FrameStackHooker'),
    StackCleaner = require('../../../../src/FFI/Stack/StackCleaner');

describe('V8FrameStackHooker', function () {
    var captureStackTrace,
        frame,
        frameStackHooker,
        NativeError,
        stackCleaner;

    beforeEach(function () {
        captureStackTrace = sinon.stub();
        NativeError = sinon.stub();
        frame = {
            Error: NativeError,
            frames: []
        };
        stackCleaner = sinon.createStubInstance(StackCleaner);

        NativeError.captureStackTrace = captureStackTrace;
        NativeError.stackTraceLimit = 10;

        frameStackHooker = new V8FrameStackHooker(stackCleaner);
    });

    describe('hook()', function () {
        it('should set the native Error.stackTraceLimit to Infinity', function () {
            frameStackHooker.hook(frame);

            expect(NativeError.stackTraceLimit).to.equal(Infinity);
        });

        it('should replace the Error class global with a custom one', function () {
            frameStackHooker.hook(frame);

            expect(frame.Error).to.not.equal(NativeError);
            expect(frame.Error).to.be.a('function');
        });

        it('should ensure native errors have the custom Error class in their hierarchy', function () {
            var error = new NativeError('My native error');

            frameStackHooker.hook(frame);

            expect(error).to.be.an.instanceOf(frame.Error);
        });

        it('should install a native Error.prepareStackTrace(...) handler', function () {
            frameStackHooker.hook(frame);

            expect(NativeError.prepareStackTrace).to.be.a('function');
        });

        describe('the native Error.prepareStackTrace(...) handler installed', function () {
            var error;

            beforeEach(function () {
                error = new NativeError('My error');
                error.stack = 'my dirty stack';

                stackCleaner.cleanStack
                    .withArgs('my dirty stack')
                    .returns('my cleaned stack');
            });

            it('should return the error\'s stack cleaned via StackCleaner', function () {
                frameStackHooker.hook(frame);

                expect(NativeError.prepareStackTrace(error)).to.equal('my cleaned stack');
            });

            it('should pass the original value of Error.stackTraceLimit + 1 when not changed', function () {
                frameStackHooker.hook(frame);
                NativeError.prepareStackTrace(error);

                expect(stackCleaner.cleanStack).to.have.been.calledOnce;
                expect(stackCleaner.cleanStack).to.have.been.calledWith(sinon.match.any, 11);
            });

            it('should pass the new value of Error.stackTraceLimit + 1 when changed', function () {
                frameStackHooker.hook(frame);
                frame.Error.stackTraceLimit = 27;
                NativeError.prepareStackTrace(error);

                expect(stackCleaner.cleanStack).to.have.been.calledOnce;
                expect(stackCleaner.cleanStack).to.have.been.calledWith(sinon.match.any, 28);
            });
        });

        describe('the custom Error class installed', function () {
            it('should call the native Error.captureStackTrace(...) from its constructor', function () {
                var error;
                frameStackHooker.hook(frame);

                error = new frame.Error('My error');

                expect(error).to.be.an.instanceOf(frame.Error);
                expect(captureStackTrace).to.have.been.calledOnce;
                expect(captureStackTrace).to.have.been.calledWith(
                    sinon.match.same(error),
                    sinon.match.same(frame.Error)
                );
            });

            it('should set the .message property correctly', function () {
                var error;
                frameStackHooker.hook(frame);
                error = new frame.Error('My error');

                expect(error.message).to.equal('My error');
            });

            it('should prevent writes to .stackTraceLimit from writing to the native one', function () {
                frameStackHooker.hook(frame);
                frame.Error.stackTraceLimit = 1234;

                expect(NativeError.stackTraceLimit).to.equal(Infinity);
            });

            it('should allow the custom .stackTraceLimit to be fetched again after being set', function () {
                frameStackHooker.hook(frame);
                frame.Error.stackTraceLimit = 1234;

                expect(frame.Error.stackTraceLimit).to.equal(1234);
            });

            it('should extend the native Error class', function () {
                frameStackHooker.hook(frame);

                expect(new frame.Error('My error')).to.be.an.instanceOf(NativeError);
            });

            it('should expose the native .captureStackTrace', function () {
                frameStackHooker.hook(frame);

                expect(frame.Error.captureStackTrace).to.equal(captureStackTrace);
            });

            it('should allow .captureStackTrace to be set', function () {
                var newCaptureStackTrace = sinon.stub();
                frameStackHooker.hook(frame);
                frame.Error.captureStackTrace = newCaptureStackTrace;

                expect(frame.Error.captureStackTrace).to.equal(newCaptureStackTrace);
            });

            it('should return undefined for .prepareStackTrace', function () {
                frameStackHooker.hook(frame);

                expect(frame.Error.prepareStackTrace).to.be.undefined;
            });

            it('should throw if an attempt to set .prepareStackTrace is made, for now', function () {
                frameStackHooker.hook(frame);

                expect(function () {
                    frame.Error.prepareStackTrace = sinon.stub();
                }).to.throw('Uniter: Stacking of Error.prepareStackTrace not yet supported');
            });
        });
    });
});
