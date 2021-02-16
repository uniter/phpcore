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
    V8FrameStackHooker = require('../../../../src/FFI/Stack/V8FrameStackHooker');

describe('GlobalStackHooker', function () {
    var frame1,
        frame2,
        frame3,
        frameStackHooker,
        global,
        globalStackHooker;

    beforeEach(function () {
        frame1 = {frames: []};
        frame3 = {frames: []};
        frame2 = {frames: [frame3]}; // Frame3 is inside frame2
        global = {
            frames: [frame1, frame2]
        };
        frameStackHooker = sinon.createStubInstance(V8FrameStackHooker);

        global.top = global;

        globalStackHooker = new GlobalStackHooker(frameStackHooker, global);
    });

    describe('hook()', function () {
        describe('when the global context is also the top frame context', function () {
            it('should invoke the FrameStackHooker for the global context itself', function () {
                globalStackHooker.hook();

                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(global));
            });

            it('should invoke the FrameStackHooker for the sub-frames', function () {
                globalStackHooker.hook();

                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame1));
                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame2));
                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame3));
            });
        });

        describe('when the global context is not the top frame context', function () {
            var frame4,
                top;

            beforeEach(function () {
                frame4 = {frames: []};
                top = {frames: [frame4]};
                global.top = top;
            });

            it('should invoke the FrameStackHooker for the global context itself', function () {
                globalStackHooker.hook();

                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(global));
            });

            it('should invoke the FrameStackHooker for the sub-frames', function () {
                globalStackHooker.hook();

                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame1));
                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame2));
                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame3));
            });

            it('should also invoke the FrameStackHooker for the top context', function () {
                globalStackHooker.hook();

                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(top));
            });

            it('should also invoke the FrameStackHooker for the sub-frame of the top context', function () {
                globalStackHooker.hook();

                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame4));
            });
        });

        describe('when an error is raised by the FrameStackHooker', function () {
            beforeEach(function () {
                frameStackHooker.hook
                    .withArgs(sinon.match.same(global))
                    .throws(new Error('Cannot access frame'));
            });

            it('should be swallowed', function () {
                expect(function () {
                    globalStackHooker.hook();
                }).not.to.throw();
            });

            it('should still invoke the FrameStackHooker for the remaining frames', function () {
                globalStackHooker.hook();

                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame1));
                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame2));
                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame3));
            });
        });

        describe('when an error is raised accessing .frames', function () {
            beforeEach(function () {
                Object.defineProperty(frame3, 'frames', {
                    get: function () {
                        throw new Error('Cannot access .frames');
                    }
                });
            });

            it('should be swallowed', function () {
                expect(function () {
                    globalStackHooker.hook();
                }).not.to.throw();
            });

            it('should still invoke the FrameStackHooker for the remaining frames', function () {
                globalStackHooker.hook();

                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame1));
                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame2));
                expect(frameStackHooker.hook).to.have.been.calledWith(sinon.match.same(frame3));
            });
        });
    });
});
