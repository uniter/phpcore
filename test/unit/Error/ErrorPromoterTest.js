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
    ErrorPromoter = require('../../../src/Error/ErrorPromoter'),
    ErrorReporting = require('../../../src/Error/ErrorReporting'),
    ObjectValue = require('../../../src/Value/Object').sync(),
    PHPError = phpCommon.PHPError,
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('ErrorPromoter', function () {
    var errorObjectValue,
        errorReporting,
        nativeError,
        promoter,
        valueFactory;

    beforeEach(function () {
        errorObjectValue = sinon.createStubInstance(ObjectValue);
        errorReporting = sinon.createStubInstance(ErrorReporting);
        nativeError = sinon.createStubInstance(PHPError);
        valueFactory = new ValueFactory();

        errorObjectValue.classIs
            .withArgs('ParseError')
            .returns(false);
        errorObjectValue.classIs
            .returns(true);
        errorObjectValue.coerceToNativeError.returns(nativeError);
        errorObjectValue.getInternalProperty
            .withArgs('trace')
            .returns([
                {file: 'first.php', line: 21},
                {file: 'second.php', line: 100}
            ]);
        errorObjectValue.getProperty
            .withArgs('message')
            .returns(valueFactory.createString('My parse error message'));
        errorObjectValue.getProperty
            .withArgs('file')
            .returns(valueFactory.createString('/path/to/my_module.php'));
        errorObjectValue.getProperty
            .withArgs('line')
            .returns(valueFactory.createInteger(121));
        errorObjectValue.getInternalProperty
            .withArgs('reportsOwnContext')
            .returns(false);

        nativeError.getMessage.returns('My normal error message');

        promoter = new ErrorPromoter(errorReporting);
    });

    describe('promote()', function () {
        it('should return the native error coerced from the Error instance', function () {
            expect(promoter.promote(errorObjectValue)).to.equal(nativeError);
        });

        it('should report normal errors correctly via ErrorReporting', function () {
            promoter.promote(errorObjectValue);

            expect(errorReporting.reportError).to.have.been.calledOnce;
            expect(errorReporting.reportError).to.have.been.calledWith(
                PHPError.E_ERROR,
                'My normal error message',
                '/path/to/my_module.php',
                121,
                [
                    {file: 'first.php', line: 21},
                    {file: 'second.php', line: 100}
                ],
                false
            );
        });

        it('should report parse errors correctly via ErrorReporting', function () {
            errorObjectValue.classIs
                .withArgs('ParseError')
                .returns(true);

            promoter.promote(errorObjectValue);

            expect(errorReporting.reportError).to.have.been.calledOnce;
            expect(errorReporting.reportError).to.have.been.calledWith(
                PHPError.E_PARSE,
                'My parse error message',
                '/path/to/my_module.php',
                121,
                [
                    {file: 'first.php', line: 21},
                    {file: 'second.php', line: 100}
                ],
                false
            );
        });
    });
});
