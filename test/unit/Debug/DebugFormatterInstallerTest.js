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
        it('should define the devtools formatter global and add formatter if it does not exist', function () {
            formatter.install();

            expect(window.devtoolsFormatters).to.be.an('array');
            expect(window.devtoolsFormatters).to.have.length(1);
            expect(window.devtoolsFormatters[0]).to.equal(debugFormatter);
        });

        it('should append the formatter to devtools global if it does already exist', function () {
            window.devtoolsFormatters = [{}];

            formatter.install();

            expect(window.devtoolsFormatters).to.be.an('array');
            expect(window.devtoolsFormatters).to.have.length(2);
            expect(window.devtoolsFormatters[1]).to.equal(debugFormatter);
        });
    });
});
