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
    sinon = require('sinon'),
    ErrorConverter = require('../../../src/Error/ErrorConverter'),
    PHPError = phpCommon.PHPError;

describe('ErrorConverter', function () {
    beforeEach(function () {
        this.getConstant = sinon.stub();

        this.getConstant
            .withArgs('E_ERROR')
            .returns(1);
        this.getConstant
            .withArgs('E_NOTICE')
            .returns(8);

        this.errorConverter = new ErrorConverter(this.getConstant);
    });

    describe('errorLevelToBits()', function () {
        it('should return the constant value for the given level', function () {
            expect(this.errorConverter.errorLevelToBits(PHPError.E_NOTICE)).to.equal(8);
        });

        it('should throw when an unknown level is given', function () {
            expect(function () {
                this.errorConverter.errorLevelToBits('SOME_UNKNOWN_LEVEL');
            }.bind(this)).to.throw('Unknown error level "SOME_UNKNOWN_LEVEL"');
        });
    });
});
