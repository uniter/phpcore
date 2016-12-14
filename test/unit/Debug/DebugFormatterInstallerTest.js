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
    beforeEach(function () {
        this.debugFormatter = sinon.createStubInstance(DebugFormatter);
        this.debugFactory = sinon.createStubInstance(DebugFactory);
        this.window = {};

        this.debugFactory.createDebugFormatter.returns(this.debugFormatter);

        this.formatter = new DebugFormatterInstaller(this.window, this.debugFactory);
    });

    describe('install()', function () {
        it('should define the devtools formatter global and add formatter if it does not exist', function () {
            this.formatter.install();

            expect(this.window.devtoolsFormatters).to.be.an('array');
            expect(this.window.devtoolsFormatters).to.have.length(1);
            expect(this.window.devtoolsFormatters[0]).to.equal(this.debugFormatter);
        });

        it('should append the formatter to devtools global if it does already exist', function () {
            this.window.devtoolsFormatters = [{}];

            this.formatter.install();

            expect(this.window.devtoolsFormatters).to.be.an('array');
            expect(this.window.devtoolsFormatters).to.have.length(2);
            expect(this.window.devtoolsFormatters[1]).to.equal(this.debugFormatter);
        });
    });
});
