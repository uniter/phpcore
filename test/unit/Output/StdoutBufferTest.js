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
    StdoutBuffer = require('../../../src/Output/StdoutBuffer'),
    Stream = require('../../../src/Stream');

describe('StdoutBuffer', function () {
    beforeEach(function () {
        this.stdout = sinon.createStubInstance(Stream);

        this.buffer = new StdoutBuffer(this.stdout);
    });

    describe('clean()', function () {
        it('should return false, for failure, as this does not actually buffer', function () {
            expect(this.buffer.clean()).to.be.false;
        });
    });

    describe('flush()', function () {
        it('should return false, for failure, as this does not actually buffer', function () {
            expect(this.buffer.flush()).to.be.false;
        });
    });

    describe('getContents()', function () {
        it('should return null, as this does not actually buffer', function () {
            expect(this.buffer.getContents()).to.be.null;
        });
    });

    describe('getDepth()', function () {
        it('should return 0', function () {
            expect(this.buffer.getDepth()).to.equal(0);
        });
    });

    describe('write()', function () {
        it('should write the data straight through to stdout, unbuffered', function () {
            var allStdout = '';
            this.stdout.write.callsFake(function (data) {
                allStdout += data;
            });

            this.buffer.write('first');
            this.buffer.write('second');

            expect(allStdout).to.equal('firstsecond');
        });
    });
});
