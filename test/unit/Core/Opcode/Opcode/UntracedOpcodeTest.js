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
    UntracedOpcode = require('../../../../../src/Core/Opcode/Opcode/UntracedOpcode');

describe('UntracedOpcode', function () {
    var handler,
        opcode;

    beforeEach(function () {
        handler = sinon.stub();

        opcode = new UntracedOpcode(handler, ['first arg', 'second arg']);
    });

    describe('handle()', function () {
        it('should invoke the handler correctly', function () {
            handler.returns('my result');

            opcode.handle();

            expect(handler).to.have.been.calledOnce;
            expect(handler).to.have.been.calledOn(null);
            expect(handler).to.have.been.calledWith('first arg', 'second arg');
        });

        it('should return the result', function () {
            handler
                .withArgs('first arg', 'second arg')
                .returns('my result');

            expect(opcode.handle()).to.equal('my result');
        });
    });

    describe('isTraced()', function () {
        it('should return false', function () {
            expect(opcode.isTraced()).to.be.false;
        });
    });

    describe('resume()', function () {
        it('should return null as UntracedOpcodes are untraced', function () {
            expect(opcode.resume()).to.be.null;
        });
    });
});
