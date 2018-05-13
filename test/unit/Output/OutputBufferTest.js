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
    OutputBuffer = require('../../../src/Output/OutputBuffer'),
    OutputBufferInterface = require('../../../src/Output/OutputBufferInterface');

describe('OutputBuffer', function () {
    beforeEach(function () {
        this.previousBuffer = sinon.createStubInstance(OutputBufferInterface);

        this.buffer = new OutputBuffer(this.previousBuffer);
    });

    describe('clean()', function () {
        it('should set the contents of this buffer to the empty string', function () {
            this.buffer.clean();

            expect(this.buffer.getContents()).to.equal('');
        });

        it('should return true, for success', function () {
            expect(this.buffer.clean()).to.be.true;
        });
    });

    describe('flush()', function () {
        it('should write the contents of this buffer through to the previous one', function () {
            this.buffer.write('some contents');

            this.buffer.flush();

            expect(this.previousBuffer.write).to.have.been.calledOnce;
            expect(this.previousBuffer.write).to.have.been.calledWith('some contents');
        });

        it('should clean this buffer', function () {
            this.buffer.write('some contents to be flushed');

            this.buffer.flush();

            expect(this.buffer.getContents()).to.equal('');
        });

        it('should return true, for success', function () {
            expect(this.buffer.flush()).to.be.true;
        });
    });

    describe('getContents()', function () {
        it('should return the empty string initially', function () {
            expect(this.buffer.getContents()).to.equal('');
        });

        it('should return all data written to this buffer concatenated together', function () {
            this.buffer.write('first');
            this.buffer.write('second');

            expect(this.buffer.getContents()).to.equal('firstsecond');
        });
    });

    describe('getDepth()', function () {
        it('should return the previous buffer\'s depth plus one', function () {
            this.previousBuffer.getDepth.returns(5);

            expect(this.buffer.getDepth()).to.equal(6);
        });
    });

    describe('write()', function () {
        it('should append the written data to the buffer contents', function () {
            this.buffer.write('first');
            this.buffer.write('second');
            this.buffer.write('third');

            expect(this.buffer.getContents()).to.equal('firstsecondthird');
        });
    });
});
