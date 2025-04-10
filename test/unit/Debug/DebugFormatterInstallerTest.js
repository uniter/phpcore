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
    DebugFactory = require('../../../src/Debug/DebugFactory'),
    DebugFormatter = require('../../../src/Debug/DebugFormatter'),
    DebugFormatterInstaller = require('../../../src/Debug/DebugFormatterInstaller');

describe('DebugFormatterInstaller', function () {
    var debugFactory,
        debugFormatter,
        formatter,
        window;

    beforeEach(function () {
        debugFormatter = sinon.createStubInstance(DebugFormatter);
        debugFactory = sinon.createStubInstance(DebugFactory);
        window = {};

        debugFactory.createDebugFormatter.returns(debugFormatter);

        formatter = new DebugFormatterInstaller(window, debugFactory);
    });

    describe('install()', function () {
        describe('when devtoolsFormatters does not exist', function () {
            it('should define the devtools formatter global', function () {
                formatter.install();

                expect(window.devtoolsFormatters).to.be.an('array');
                expect(window.devtoolsFormatters).to.have.length(1);
                expect(window.devtoolsFormatters[0]).to.be.an('object');
                expect(window.devtoolsFormatters[0].body).to.be.a('function');
                expect(window.devtoolsFormatters[0].hasBody).to.be.a('function');
                expect(window.devtoolsFormatters[0].header).to.be.a('function');
            });

            it('should delegate body() calls to the debug formatter', function () {
                const testValue = {};

                formatter.install();
                window.devtoolsFormatters[0].body(testValue);

                expect(debugFormatter.body).to.have.been.calledOnce;
                expect(debugFormatter.body).to.have.been.calledWith(testValue);
            });

            it('should delegate hasBody() calls to the debug formatter', function () {
                const testValue = {};

                formatter.install();
                window.devtoolsFormatters[0].hasBody(testValue);

                expect(debugFormatter.hasBody).to.have.been.calledOnce;
                expect(debugFormatter.hasBody).to.have.been.calledWith(testValue);
            });

            it('should delegate header() calls to the debug formatter', function () {
                const testValue = {};

                formatter.install();
                window.devtoolsFormatters[0].header(testValue);

                expect(debugFormatter.header).to.have.been.calledOnce;
                expect(debugFormatter.header).to.have.been.calledWith(testValue);
            });
        });

        describe('when devtoolsFormatters already exists', function () {
            beforeEach(function () {
                window.devtoolsFormatters = [{}];
            });

            it('should append the formatter to the existing array', function () {
                formatter.install();

                expect(window.devtoolsFormatters).to.be.an('array');
                expect(window.devtoolsFormatters).to.have.length(2);
                expect(window.devtoolsFormatters[1]).to.be.an('object');
                expect(window.devtoolsFormatters[1].body).to.be.a('function');
                expect(window.devtoolsFormatters[1].hasBody).to.be.a('function');
                expect(window.devtoolsFormatters[1].header).to.be.a('function');
            });

            it('should delegate body() calls to the debug formatter', function () {
                const testValue = {};

                formatter.install();
                window.devtoolsFormatters[1].body(testValue);

                expect(debugFormatter.body).to.have.been.calledOnce;
                expect(debugFormatter.body).to.have.been.calledWith(testValue);
            });

            it('should delegate hasBody() calls to the debug formatter', function () {
                const testValue = {};

                formatter.install();
                window.devtoolsFormatters[1].hasBody(testValue);

                expect(debugFormatter.hasBody).to.have.been.calledOnce;
                expect(debugFormatter.hasBody).to.have.been.calledWith(testValue);
            });

            it('should delegate header() calls to the debug formatter', function () {
                const testValue = {};

                formatter.install();
                window.devtoolsFormatters[1].header(testValue);

                expect(debugFormatter.header).to.have.been.calledOnce;
                expect(debugFormatter.header).to.have.been.calledWith(testValue);
            });
        });
    });
});
