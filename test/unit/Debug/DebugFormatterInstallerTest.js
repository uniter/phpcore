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
    DebugFormatterInstaller = require('../../../src/Debug/DebugFormatterInstaller');

describe('DebugFormatterInstaller', function () {
    beforeEach(function () {
        this.DebugFormatter = sinon.stub();
        this.ValueFormatter = sinon.stub();
        this.window = {};

        this.formatter = new DebugFormatterInstaller(this.window, this.DebugFormatter, this.ValueFormatter);
    });

    describe('install()', function () {
        it('should define the devtools formatter global and add formatter if it does not exist', function () {
            var debugFormatter = sinon.createStubInstance(this.DebugFormatter);
            this.DebugFormatter.returns(debugFormatter);

            this.formatter.install();

            expect(this.window.devtoolsFormatters).to.be.an('array');
            expect(this.window.devtoolsFormatters).to.have.length(1);
            expect(this.window.devtoolsFormatters[0]).to.equal(debugFormatter);
        });

        it('should append the formatter to devtools global if it does already exist', function () {
            var debugFormatter = sinon.createStubInstance(this.DebugFormatter);
            this.DebugFormatter.returns(debugFormatter);
            this.window.devtoolsFormatters = [{}];

            this.formatter.install();

            expect(this.window.devtoolsFormatters).to.be.an('array');
            expect(this.window.devtoolsFormatters).to.have.length(2);
            expect(this.window.devtoolsFormatters[1]).to.equal(debugFormatter);
        });

        it('should pass the created ValueFormatter to the DebugFormatter', function () {
            var valueFormatter = sinon.createStubInstance(this.ValueFormatter);
            this.ValueFormatter.returns(valueFormatter);

            this.formatter.install();

            expect(this.DebugFormatter).to.have.been.calledOnce;
            expect(this.DebugFormatter).to.have.been.calledWith(sinon.match.same(valueFormatter));
        });
    });
});
