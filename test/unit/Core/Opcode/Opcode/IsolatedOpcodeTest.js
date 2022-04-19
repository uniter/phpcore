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
    phpCommon = require('phpcommon'),
    Exception = phpCommon.Exception,
    IsolatedOpcode = require('../../../../../src/Core/Opcode/Opcode/IsolatedOpcode');

describe('IsolatedOpcode', function () {
    var opcode;

    beforeEach(function () {
        opcode = new IsolatedOpcode();
    });

    describe('handle()', function () {
        it('should throw as these opcodes should not be handled', function () {
            expect(function () {
                opcode.handle();
            }).to.throw(Exception, 'IsolatedOpcode.handle() should not be called');
        });
    });

    describe('isTraced()', function () {
        it('should return false', function () {
            expect(opcode.isTraced()).to.be.false;
        });
    });

    describe('resume()', function () {
        it('should throw as these opcodes should not be resumed', function () {
            expect(function () {
                opcode.resume();
            }).to.throw(Exception, 'IsolatedOpcode.resume() should not be called');
        });
    });

    describe('traceResult()', function () {
        it('should throw as these opcodes should not be traced', function () {
            expect(function () {
                opcode.traceResult('my result');
            }).to.throw(Exception, 'IsolatedOpcode.traceResult() should not be called');
        });
    });

    describe('traceThrow()', function () {
        it('should throw as these opcodes should not be traced', function () {
            var error = new Error('Bang!');

            expect(function () {
                opcode.traceThrow(error);
            }).to.throw(Exception, 'IsolatedOpcode.traceThrow() should not be called');
        });
    });
});
