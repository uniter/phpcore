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
    ErrorConfiguration = require('../../../src/Error/ErrorConfiguration'),
    ErrorConverter = require('../../../src/Error/ErrorConverter'),
    ErrorReporting = require('../../../src/Error/ErrorReporting'),
    PHPError = phpCommon.PHPError,
    Stream = require('../../../src/Stream'),
    TraceFormatter = require('../../../src/Error/TraceFormatter'),
    Translator = phpCommon.Translator;

describe('ErrorReporting', function () {
    beforeEach(function () {
        this.errorConfiguration = sinon.createStubInstance(ErrorConfiguration);
        this.errorConverter = sinon.createStubInstance(ErrorConverter);
        this.stdout = sinon.createStubInstance(Stream);
        this.stderr = sinon.createStubInstance(Stream);
        this.traceFormatter = sinon.createStubInstance(TraceFormatter);
        this.translator = sinon.createStubInstance(Translator);

        this.errorConverter.errorLevelToBits
            .withArgs(PHPError.E_ERROR)
            .returns(1);
        this.errorConverter.errorLevelToBits
            .withArgs(PHPError.E_NOTICE)
            .returns(8);

        this.translator.translate
            .callsFake(function (translationKey, placeholderVariables) {
                return '[Translated] ' + translationKey + ' ' + JSON.stringify(placeholderVariables || {});
            });

        this.errorReporting = new ErrorReporting(
            this.errorConfiguration,
            this.errorConverter,
            this.traceFormatter,
            this.translator,
            this.stdout,
            this.stderr
        );
    });

    describe('reportError()', function () {
        describe('for an E_ERROR, when the error reporting level is E_ALL and error display is turned on, without trace', function () {
            beforeEach(function () {
                this.errorConfiguration.getDisplayErrors.returns(true);
                this.errorConfiguration.getErrorReportingLevel.returns(32767);
            });

            it('should write the correct data to stderr', function () {
                this.errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234
                );

                expect(this.stderr.write).to.have.been.calledOnce;
                expect(this.stderr.write).to.have.been.calledWith(
                    'PHP Fatal error:  Oh dear[Translated] core.error_without_trace {"filePath":"/path/to/my_module.php","line":1234}\n'
                );
            });

            it('should also write the correct data to stdout', function () {
                this.errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234
                );

                expect(this.stdout.write).to.have.been.calledOnce;
                expect(this.stdout.write).to.have.been.calledWith(
                    // NB: A leading newline should be written out to stdout
                    '\nFatal error: Oh dear[Translated] core.error_without_trace {"filePath":"/path/to/my_module.php","line":1234}\n'
                );
            });
        });

        describe('for an E_NOTICE, when the error reporting level is E_ALL and error display is turned on and reporting own context', function () {
            beforeEach(function () {
                this.errorConfiguration.getDisplayErrors.returns(true);
                this.errorConfiguration.getErrorReportingLevel.returns(32767);
            });

            it('should write the correct data to stderr', function () {
                this.errorReporting.reportError(
                    PHPError.E_NOTICE,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234,
                    null,
                    true
                );

                expect(this.stderr.write).to.have.been.calledOnce;
                expect(this.stderr.write).to.have.been.calledWith(
                    'PHP Notice:  Oh dear\n'
                );
            });

            it('should also write the correct data to stdout', function () {
                this.errorReporting.reportError(
                    PHPError.E_NOTICE,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234,
                    null,
                    true
                );

                expect(this.stdout.write).to.have.been.calledOnce;
                expect(this.stdout.write).to.have.been.calledWith(
                    // NB: A leading newline should be written out to stdout
                    '\nNotice: Oh dear\n'
                );
            });

            it('should not attempt to format the trace', function () {
                this.errorReporting.reportError(
                    PHPError.E_NOTICE,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234,
                    null,
                    true
                );

                expect(this.traceFormatter.format).not.to.have.been.called;
            });
        });

        describe('for an E_NOTICE, when the error reporting level is E_ALL and error display is turned on, reporting own context and a trace is given', function () {
            beforeEach(function () {
                this.errorConfiguration.getDisplayErrors.returns(true);
                this.errorConfiguration.getErrorReportingLevel.returns(32767);
                this.trace = [{file: 'first'}, {file: 'second'}];
            });

            it('should write the correct data to stderr', function () {
                this.errorReporting.reportError(
                    PHPError.E_NOTICE,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234,
                    this.trace,
                    true
                );

                expect(this.stderr.write).to.have.been.calledOnce;
                expect(this.stderr.write).to.have.been.calledWith(
                    'PHP Notice:  Oh dear\n'
                );
            });

            it('should also write the correct data to stdout', function () {
                this.errorReporting.reportError(
                    PHPError.E_NOTICE,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234,
                    this.trace,
                    true
                );

                expect(this.stdout.write).to.have.been.calledOnce;
                expect(this.stdout.write).to.have.been.calledWith(
                    // NB: A leading newline should be written out to stdout
                    '\nNotice: Oh dear\n'
                );
            });

            it('should not attempt to format the trace', function () {
                this.errorReporting.reportError(
                    PHPError.E_NOTICE,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234,
                    this.trace,
                    true
                );

                expect(this.traceFormatter.format).not.to.have.been.called;
            });
        });

        describe('for an E_NOTICE, when the error reporting level is E_ALL and error display is turned on but not reporting own context', function () {
            beforeEach(function () {
                this.errorConfiguration.getDisplayErrors.returns(true);
                this.errorConfiguration.getErrorReportingLevel.returns(32767);
            });

            it('should write the correct data to stderr', function () {
                this.errorReporting.reportError(
                    PHPError.E_NOTICE,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234
                );

                expect(this.stderr.write).to.have.been.calledOnce;
                expect(this.stderr.write).to.have.been.calledWith(
                    'PHP Notice:  Oh dear[Translated] core.error_without_trace {"filePath":"/path/to/my_module.php","line":1234}\n'
                );
            });

            it('should also write the correct data to stdout', function () {
                this.errorReporting.reportError(
                    PHPError.E_NOTICE,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234
                );

                expect(this.stdout.write).to.have.been.calledOnce;
                expect(this.stdout.write).to.have.been.calledWith(
                    // NB: A leading newline should be written out to stdout
                    '\nNotice: Oh dear[Translated] core.error_without_trace {"filePath":"/path/to/my_module.php","line":1234}\n'
                );
            });

            it('should not attempt to format the trace', function () {
                this.errorReporting.reportError(
                    PHPError.E_NOTICE,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234,
                    null,
                    true
                );

                expect(this.traceFormatter.format).not.to.have.been.called;
            });
        });

        describe('for an E_ERROR, when the error reporting level is E_ALL and error display is turned off, without trace', function () {
            beforeEach(function () {
                this.errorConfiguration.getDisplayErrors.returns(false);
                this.errorConfiguration.getErrorReportingLevel.returns(32767);
            });

            it('should write the correct data to stderr', function () {
                this.errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234
                );

                expect(this.stderr.write).to.have.been.calledOnce;
                expect(this.stderr.write).to.have.been.calledWith(
                    'PHP Fatal error:  Oh dear[Translated] core.error_without_trace {"filePath":"/path/to/my_module.php","line":1234}\n'
                );
            });

            it('should not write anything to stdout', function () {
                this.errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234
                );

                expect(this.stdout.write).not.to.have.been.called;
            });
        });

        describe('for an E_ERROR, when the error reporting level is E_ALL and error display is turned off, with trace and reporting own context', function () {
            beforeEach(function () {
                this.errorConfiguration.getDisplayErrors.returns(false);
                this.errorConfiguration.getErrorReportingLevel.returns(32767);
                this.trace = [{file: 'first'}, {file: 'second'}];
                this.traceFormatter.format
                    .withArgs(this.trace)
                    .returns('[My formatted trace]');
            });

            it('should write the correct data to stderr', function () {
                this.errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234,
                    this.trace,
                    true
                );

                expect(this.stderr.write).to.have.been.calledOnce;
                expect(this.stderr.write).to.have.been.calledWith(
                    'PHP Fatal error:  Oh dear[Translated] core.error_without_context_but_with_trace {"filePath":"/path/to/my_module.php","line":1234,"formattedTrace":"[My formatted trace]"}\n'
                );
            });

            it('should not write anything to stdout', function () {
                this.errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234,
                    this.trace,
                    true
                );

                expect(this.stdout.write).not.to.have.been.called;
            });
        });

        describe('for an E_ERROR, when the error reporting level is E_ALL and error display is turned off, with trace but not reporting own context', function () {
            beforeEach(function () {
                this.errorConfiguration.getDisplayErrors.returns(false);
                this.errorConfiguration.getErrorReportingLevel.returns(32767);
                this.trace = [{file: 'first'}, {file: 'second'}];
                this.traceFormatter.format
                    .withArgs(this.trace)
                    .returns('[My formatted trace]');
            });

            it('should write the correct data to stderr', function () {
                this.errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234,
                    this.trace
                );

                expect(this.stderr.write).to.have.been.calledOnce;
                expect(this.stderr.write).to.have.been.calledWith(
                    'PHP Fatal error:  Oh dear[Translated] core.error_with_context_and_trace {"filePath":"/path/to/my_module.php","line":1234,"formattedTrace":"[My formatted trace]"}\n'
                );
            });

            it('should not write anything to stdout', function () {
                this.errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234,
                    this.trace
                );

                expect(this.stdout.write).not.to.have.been.called;
            });
        });

        describe('for an E_ERROR, when the error reporting level is 0 and error display is turned off', function () {
            beforeEach(function () {
                this.errorConfiguration.getDisplayErrors.returns(false);
                this.errorConfiguration.getErrorReportingLevel.returns(0);
            });

            it('should not write anything to stderr', function () {
                this.errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234
                );

                expect(this.stderr.write).not.to.have.been.called;
            });

            it('should not write anything to stdout', function () {
                this.errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234
                );

                expect(this.stdout.write).not.to.have.been.called;
            });
        });

        describe('for an E_ERROR, when the error reporting level is 0 and error display is turned off', function () {
            beforeEach(function () {
                this.errorConfiguration.getDisplayErrors.returns(false);
                this.errorConfiguration.getErrorReportingLevel.returns(0);
            });

            it('should not write anything to stderr', function () {
                this.errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234
                );

                expect(this.stderr.write).not.to.have.been.called;
            });

            it('should not write anything to stdout', function () {
                this.errorReporting.reportError(
                    PHPError.E_ERROR,
                    'Oh dear',
                    '/path/to/my_module.php',
                    1234
                );

                expect(this.stdout.write).not.to.have.been.called;
            });
        });
    });
});
