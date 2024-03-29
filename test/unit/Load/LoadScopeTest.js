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
    tools = require('../tools'),
    Coroutine = require('../../../src/Control/Coroutine'),
    LoadScope = require('../../../src/Load/LoadScope'),
    PHPError = phpCommon.PHPError,
    Scope = require('../../../src/Scope').sync();

describe('LoadScope', function () {
    var coroutine,
        effectiveScope,
        loadScope,
        state,
        valueFactory;

    beforeEach(function () {
        state = tools.createIsolatedState();
        coroutine = sinon.createStubInstance(Coroutine);
        valueFactory = state.getValueFactory();
        effectiveScope = sinon.createStubInstance(Scope);

        effectiveScope.getCoroutine.returns(coroutine);

        loadScope = new LoadScope(valueFactory, effectiveScope, '/path/to/my/caller.php', 'eval');
    });

    describe('enterCoroutine()', function () {
        it('should enter a new Coroutine via the effective scope', function () {
            loadScope.enterCoroutine();

            expect(effectiveScope.enterCoroutine).to.have.been.calledOnce;
        });
    });

    describe('getCoroutine()', function () {
        it('should fetch the current Coroutine from the effective scope', function () {
            expect(loadScope.getCoroutine()).to.equal(coroutine);
        });
    });

    describe('getFilePath()', function () {
        it('should return the caller\'s path when the given file path is null', function () {
            expect(loadScope.getFilePath(null)).to.equal('/path/to/my/caller.php');
        });

        it('should return the given file path when not null', function () {
            expect(loadScope.getFilePath('/my/given/caller_path.php')).to.equal('/my/given/caller_path.php');
        });
    });

    describe('getFunctionName()', function () {
        it('should return an empty string, as eval/include contexts do not report the calling function, if any', function () {
            expect(loadScope.getFunctionName().getNative()).to.equal('');
        });
    });

    describe('getMethodName()', function () {
        it('should return an empty string, as eval/include contexts do not report the calling method, if any', function () {
            expect(loadScope.getMethodName().getNative()).to.equal('');
        });
    });

    describe('getTraceFrameName()', function () {
        it('should return the type when "eval"', function () {
            expect(loadScope.getTraceFrameName()).to.equal('eval');
        });

        it('should return the type when "include"', function () {
            var loadScope = new LoadScope(valueFactory, effectiveScope, '/path/to/my/caller.php', 'include');

            expect(loadScope.getTraceFrameName()).to.equal('include');
        });
    });

    describe('raiseScopedTranslatedError()', function () {
        it('should forward the call onto the effective scope', function () {
            loadScope.raiseScopedTranslatedError(
                PHPError.E_WARNING,
                'my_group.my_warning',
                {
                    firstPlaceholder: 'first',
                    secondPlaceholder: 'second'
                },
                'MyError',
                true,
                '/path/to/my_module.php',
                123
            );

            expect(effectiveScope.raiseScopedTranslatedError).to.have.been.calledOnce;
            expect(effectiveScope.raiseScopedTranslatedError).to.have.been.calledWith(
                PHPError.E_WARNING,
                'my_group.my_warning',
                {
                    firstPlaceholder: 'first',
                    secondPlaceholder: 'second'
                },
                'MyError',
                true,
                '/path/to/my_module.php',
                123
            );
        });
    });

    describe('updateCoroutine()', function () {
        it('should update the effective scope with the new Coroutine', function () {
            var newCoroutine = sinon.createStubInstance(Coroutine);

            loadScope.updateCoroutine(newCoroutine);

            expect(effectiveScope.updateCoroutine).to.have.been.calledOnce;
            expect(effectiveScope.updateCoroutine).to.have.been.calledWith(
                sinon.match.same(newCoroutine)
            );
        });
    });
});
