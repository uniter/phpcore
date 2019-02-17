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
    NoActiveOutputBufferException = require('../../../src/Exception/NoActiveOutputBufferException'),
    Output = require('../../../src/Output/Output'),
    OutputBuffer = require('../../../src/Output/OutputBuffer'),
    OutputFactory = require('../../../src/Output/OutputFactory'),
    StdoutBuffer = require('../../../src/Output/StdoutBuffer');

describe('Output', function () {
    beforeEach(function () {
        this.outputFactory = sinon.createStubInstance(OutputFactory);
        this.stdoutBuffer = sinon.createStubInstance(StdoutBuffer);

        this.outputFactory.createOutputBuffer.callsFake(function (previousBuffer) {
            var newBuffer = sinon.createStubInstance(OutputBuffer);

            newBuffer.getDepth.returns(previousBuffer.getDepth() + 1);

            return newBuffer;
        }.bind(this));
        this.stdoutBuffer.getDepth.returns(0);

        this.output = new Output(this.outputFactory, this.stdoutBuffer);
    });

    describe('cleanCurrentBuffer()', function () {
        describe('when none have been pushed', function () {
            it('should clean the stdout buffer', function () {
                this.output.cleanCurrentBuffer();

                expect(this.stdoutBuffer.clean).to.have.been.calledOnce;
            });
        });

        describe('when one additional buffer has been pushed', function () {
            beforeEach(function () {
                this.pushedBuffer = this.output.pushBuffer();
            });

            it('should clean the pushed buffer', function () {
                this.output.cleanCurrentBuffer();

                expect(this.pushedBuffer.clean).to.have.been.calledOnce;
            });

            it('should not clean the stdout buffer', function () {
                this.output.cleanCurrentBuffer();

                expect(this.stdoutBuffer.clean).not.to.have.been.called;
            });
        });

        describe('when two additional buffers have been pushed', function () {
            beforeEach(function () {
                this.firstPushedBuffer = this.output.pushBuffer();
                this.secondPushedBuffer = this.output.pushBuffer();
            });

            it('should clean the second pushed buffer', function () {
                this.output.cleanCurrentBuffer();

                expect(this.secondPushedBuffer.clean).to.have.been.calledOnce;
            });

            it('should not clean the first pushed buffer', function () {
                this.output.cleanCurrentBuffer();

                expect(this.firstPushedBuffer.clean).not.to.have.been.called;
            });

            it('should not clean the stdout buffer', function () {
                this.output.cleanCurrentBuffer();

                expect(this.stdoutBuffer.clean).not.to.have.been.called;
            });
        });
    });

    describe('flushCurrentBuffer()', function () {
        describe('when none have been pushed', function () {
            it('should flush the stdout buffer', function () {
                this.output.flushCurrentBuffer();

                expect(this.stdoutBuffer.flush).to.have.been.calledOnce;
            });
        });

        describe('when one additional buffer has been pushed', function () {
            beforeEach(function () {
                this.pushedBuffer = this.output.pushBuffer();
            });

            it('should flush the pushed buffer', function () {
                this.output.flushCurrentBuffer();

                expect(this.pushedBuffer.flush).to.have.been.calledOnce;
            });

            it('should not flush the stdout buffer', function () {
                this.output.flushCurrentBuffer();

                expect(this.stdoutBuffer.flush).not.to.have.been.called;
            });
        });

        describe('when two additional buffers have been pushed', function () {
            beforeEach(function () {
                this.firstPushedBuffer = this.output.pushBuffer();
                this.secondPushedBuffer = this.output.pushBuffer();
            });

            it('should flush the second pushed buffer', function () {
                this.output.flushCurrentBuffer();

                expect(this.secondPushedBuffer.flush).to.have.been.calledOnce;
            });

            it('should not flush the first pushed buffer', function () {
                this.output.flushCurrentBuffer();

                expect(this.firstPushedBuffer.flush).not.to.have.been.called;
            });

            it('should not flush the stdout buffer', function () {
                this.output.flushCurrentBuffer();

                expect(this.stdoutBuffer.flush).not.to.have.been.called;
            });
        });
    });

    describe('getCurrentBufferContents()', function () {
        describe('when none have been pushed', function () {
            it('should fetch the contents of the stdout buffer', function () {
                this.stdoutBuffer.getContents.returns('contents of stdout buffer');

                expect(this.output.getCurrentBufferContents()).to.equal('contents of stdout buffer');
            });
        });

        describe('when one additional buffer has been pushed', function () {
            beforeEach(function () {
                this.pushedBuffer = this.output.pushBuffer();
            });

            it('should fetch the contents of the pushed buffer', function () {
                this.pushedBuffer.getContents.returns('contents of pushed buffer');

                expect(this.output.getCurrentBufferContents()).to.equal('contents of pushed buffer');
            });
        });

        describe('when two additional buffers have been pushed', function () {
            beforeEach(function () {
                this.output.pushBuffer();
                this.secondPushedBuffer = this.output.pushBuffer();
            });

            it('should fetch the contents of the second pushed buffer', function () {
                this.secondPushedBuffer.getContents.returns('contents of second pushed buffer');

                expect(this.output.getCurrentBufferContents()).to.equal('contents of second pushed buffer');
            });
        });
    });

    describe('getDepth()', function () {
        describe('when none have been pushed', function () {
            it('should return 0', function () {
                expect(this.output.getDepth()).to.equal(0);
            });
        });

        describe('when one additional buffer has been pushed', function () {
            beforeEach(function () {
                this.pushedBuffer = this.output.pushBuffer();
            });

            it('should return 1', function () {
                expect(this.output.getDepth()).to.equal(1);
            });
        });

        describe('when two additional buffers have been pushed', function () {
            beforeEach(function () {
                this.output.pushBuffer();
                this.output.pushBuffer();
            });

            it('should return 2', function () {
                expect(this.output.getDepth()).to.equal(2);
            });
        });
    });

    describe('popBuffer()', function () {
        describe('when none have been pushed', function () {
            it('should throw an error', function () {
                expect(function () {
                    this.output.popBuffer();
                }.bind(this)).to.throw(NoActiveOutputBufferException, 'No output buffer is active');
            });
        });

        describe('when one additional buffer has been pushed', function () {
            beforeEach(function () {
                this.output.pushBuffer();
            });

            it('should restore the depth to 0', function () {
                this.output.popBuffer();

                expect(this.output.getDepth()).to.equal(0);
            });
        });

        describe('when two additional buffers have been pushed', function () {
            beforeEach(function () {
                this.output.pushBuffer();
                this.output.pushBuffer();
            });

            it('should restore the depth to 1', function () {
                this.output.popBuffer();

                expect(this.output.getDepth()).to.equal(1);
            });
        });
    });

    describe('pushBuffer()', function () {
        it('should return the created output buffer', function () {
            var buffer = this.output.pushBuffer();

            expect(buffer).to.be.an.instanceOf(OutputBuffer);
        });
    });

    describe('write()', function () {
        describe('when none have been pushed', function () {
            it('should write to the stdout buffer', function () {
                this.output.write('my data written to stdout');

                expect(this.stdoutBuffer.write).to.have.been.calledOnce;
                expect(this.stdoutBuffer.write).to.have.been.calledWith('my data written to stdout');
            });
        });

        describe('when one additional buffer has been pushed', function () {
            beforeEach(function () {
                this.pushedBuffer = this.output.pushBuffer();
            });

            it('should write to the pushed buffer', function () {
                this.output.write('my data written to a buffer');

                expect(this.pushedBuffer.write).to.have.been.calledOnce;
                expect(this.pushedBuffer.write).to.have.been.calledWith('my data written to a buffer');
            });

            it('should not write to the stdout buffer', function () {
                this.output.write('my data written to a buffer');

                expect(this.stdoutBuffer.write).not.to.have.been.called;
            });
        });

        describe('when two additional buffers have been pushed', function () {
            beforeEach(function () {
                this.firstPushedBuffer = this.output.pushBuffer();
                this.secondPushedBuffer = this.output.pushBuffer();
            });

            it('should write to the second pushed buffer', function () {
                this.output.write('my data written to the second buffer');

                expect(this.secondPushedBuffer.write).to.have.been.calledOnce;
                expect(this.secondPushedBuffer.write).to.have.been.calledWith('my data written to the second buffer');
            });

            it('should not write to the first pushed buffer', function () {
                this.output.write('my data written to the second buffer');

                expect(this.firstPushedBuffer.write).not.to.have.been.called;
            });

            it('should not write to the stdout buffer', function () {
                this.output.write('my data written to the second buffer');

                expect(this.stdoutBuffer.write).not.to.have.been.called;
            });
        });
    });
});
