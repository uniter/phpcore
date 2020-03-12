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
    LoadScope = require('../../src/LoadScope'),
    Scope = require('../../src/Scope').sync(),
    ValueFactory = require('../../src/ValueFactory').sync();

describe('LoadScope', function () {
    beforeEach(function () {
        this.valueFactory = new ValueFactory();
        this.effectiveScope = sinon.createStubInstance(Scope);

        this.loadScope = new LoadScope(this.valueFactory, this.effectiveScope, '/path/to/my/caller.php', 'eval');
    });

    describe('getFilePath()', function () {
        it('should return the caller\'s path', function () {
            expect(this.loadScope.getFilePath()).to.equal('/path/to/my/caller.php');
        });
    });

    describe('getFunctionName()', function () {
        it('should return an empty string, as eval/include contexts do not report the calling function, if any', function () {
            expect(this.loadScope.getFunctionName().getNative()).to.equal('');
        });
    });

    describe('getMethodName()', function () {
        it('should return an empty string, as eval/include contexts do not report the calling method, if any', function () {
            expect(this.loadScope.getMethodName().getNative()).to.equal('');
        });
    });

    describe('getTraceFrameName()', function () {
        it('should return the type when "eval"', function () {
            expect(this.loadScope.getTraceFrameName()).to.equal('eval');
        });

        it('should return the type when "include"', function () {
            var loadScope = new LoadScope(this.valueFactory, this.effectiveScope, '/path/to/my/caller.php', 'include');

            expect(loadScope.getTraceFrameName()).to.equal('include');
        });
    });
});
