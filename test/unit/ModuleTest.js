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
    Module = require('../../src/Module'),
    Namespace = require('../../src/Namespace').sync(),
    NamespaceScope = require('../../src/NamespaceScope').sync(),
    ScopeFactory = require('../../src/ScopeFactory');

describe('Module', function () {
    var createModule,
        module,
        namespace,
        scopeFactory,
        topLevelNamespaceScope;

    beforeEach(function () {
        namespace = sinon.createStubInstance(Namespace);
        scopeFactory = sinon.createStubInstance(ScopeFactory);
        topLevelNamespaceScope = sinon.createStubInstance(NamespaceScope);

        scopeFactory.createNamespaceScope
            .withArgs(sinon.match.same(namespace))
            .returns(topLevelNamespaceScope);

        createModule = function (filePath, global) {
            module = new Module(scopeFactory, namespace, filePath, global);
        };
    });

    describe('constructor()', function () {
        it('should correctly construct the top-level NamespaceScope when global', function () {
            createModule('/my/module_here.php', true);

            expect(scopeFactory.createNamespaceScope).to.have.been.calledOnce;
            expect(scopeFactory.createNamespaceScope).to.have.been.calledWith(
                sinon.match.same(namespace),
                sinon.match.same(module),
                true
            );
        });

        it('should correctly construct the top-level NamespaceScope when not global', function () {
            createModule('/my/module_here.php', false);

            expect(scopeFactory.createNamespaceScope).to.have.been.calledOnce;
            expect(scopeFactory.createNamespaceScope).to.have.been.calledWith(
                sinon.match.same(namespace),
                sinon.match.same(module),
                false
            );
        });
    });

    describe('getFilePath()', function () {
        it('should return the path to the file the module was defined in when specified', function () {
            createModule('/path/to/my/module.php');

            expect(module.getFilePath()).to.equal('/path/to/my/module.php');
        });

        it('should return null when no path is specified', function () {
            createModule(null);

            expect(module.getFilePath()).to.be.null;
        });
    });

    describe('getTopLevelNamespaceScope()', function () {
        it('should fetch the top-level NamespaceScope for the module', function () {
            createModule('/my/module_here.php');

            expect(module.getTopLevelNamespaceScope()).to.equal(topLevelNamespaceScope);
        });
    });
});
