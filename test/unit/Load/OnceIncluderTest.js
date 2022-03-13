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
    Environment = require('../../../src/Environment'),
    Includer = require('../../../src/Load/Includer').sync(),
    Loader = require('../../../src/Load/Loader').sync(),
    Module = require('../../../src/Module'),
    OnceIncluder = require('../../../src/Load/OnceIncluder').sync(),
    PHPError = phpCommon.PHPError,
    Scope = require('../../../src/Scope').sync(),
    ScopeFactory = require('../../../src/ScopeFactory'),
    ValueFactory = require('../../../src/ValueFactory').sync();

describe('OnceIncluder', function () {
    var enclosingScope,
        environment,
        includer,
        loader,
        module,
        onceIncluder,
        scopeFactory,
        valueFactory;

    beforeEach(function () {
        enclosingScope = sinon.createStubInstance(Scope);
        environment = sinon.createStubInstance(Environment);
        includer = sinon.createStubInstance(Includer);
        loader = sinon.createStubInstance(Loader);
        module = sinon.createStubInstance(Module);
        scopeFactory = sinon.createStubInstance(ScopeFactory);
        includer = sinon.createStubInstance(Includer);
        valueFactory = new ValueFactory();

        includer.hasModuleBeenIncluded.returns(false);

        onceIncluder = new OnceIncluder(valueFactory, includer);
    });

    describe('includeOnce()', function () {
        var callIncludeOnce;

        beforeEach(function () {
            callIncludeOnce = function (includedPath, type, errorLevel, options) {
                return onceIncluder.includeOnce(
                    type || 'include_once',
                    errorLevel || PHPError.E_WARNING,
                    environment,
                    module,
                    includedPath,
                    enclosingScope,
                    options || {}
                );
            };
        });

        it('should return the result of including via the Includer when not previously included', function () {
            var resultValue = valueFactory.createString('my result');
            includer.include
                .withArgs(
                    'require_once',
                    PHPError.E_ERROR, // For requires, a fatal error is raised on failure
                    sinon.match.same(environment),
                    sinon.match.same(module),
                    '/my/required_path.php',
                    sinon.match.same(enclosingScope),
                    {my: 'options'}
                )
                .returns(resultValue);

            expect(callIncludeOnce('/my/required_path.php', 'require_once', PHPError.E_ERROR, {my: 'options'}))
                .to.equal(resultValue);
        });

        it('should return bool(true) when previously included', function () {
            var resultValue;
            includer.hasModuleBeenIncluded
                .withArgs('/my/required_path.php')
                .returns(true);

            resultValue = callIncludeOnce('/my/required_path.php', 'require_once', PHPError.E_ERROR, {my: 'options'});

            expect(resultValue.getType()).to.equal('boolean');
            expect(resultValue.getNative()).to.be.true;
        });
    });
});
