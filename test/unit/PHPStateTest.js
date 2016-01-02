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
    PHPState = require('../../src/PHPState').sync(),
    Stream = require('../../src/Stream'),
    Value = require('../../src/Value').sync();

describe('PHPState', function () {
    beforeEach(function () {
        this.installedBuiltinTypes = {};
        this.stdin = sinon.createStubInstance(Stream);
        this.stdout = sinon.createStubInstance(Stream);
        this.stderr = sinon.createStubInstance(Stream);
        this.pausable = {};

        this.state = new PHPState(this.installedBuiltinTypes, this.stdin, this.stdout, this.stderr, this.pausable);
    });

    describe('getConstant()', function () {
        it('should return the native value of the constant from the global namespace when defined', function () {
            var value = sinon.createStubInstance(Value);
            value.getNative.returns('my value');
            this.state.getGlobalNamespace().defineConstant('MY_CONST', value);

            expect(this.state.getConstant('MY_CONST')).to.equal('my value');
        });

        it('should return null when the constant is not defined', function () {
            expect(this.state.getConstant('MY_UNDEFINED_CONST')).to.be.null;
        });
    });
});
