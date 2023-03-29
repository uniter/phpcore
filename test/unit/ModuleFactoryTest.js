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
    RealModule  = require('../../src/Module'),
    ModuleFactory = require('../../src/ModuleFactory'),
    Namespace = require('../../src/Namespace').sync(),
    ScopeFactory = require('../../src/ScopeFactory');

describe('ModuleFactory', function () {
    var createdModule,
        factory,
        Module,
        namespace,
        scopeFactory;

    beforeEach(function () {
        Module = sinon.stub();
        createdModule = sinon.createStubInstance(RealModule);
        namespace = sinon.createStubInstance(Namespace);
        scopeFactory = sinon.createStubInstance(ScopeFactory);

        Module.returns(createdModule);

        factory = new ModuleFactory(Module, scopeFactory);
    });

    describe('create()', function () {
        it('should correctly create the Module', function () {
            factory.create(namespace, '/my/module/path.php');

            expect(Module).to.have.been.calledOnce;
            expect(Module).to.have.been.calledWith(
                sinon.match.same(scopeFactory),
                sinon.match.same(namespace),
                '/my/module/path.php'
            );
        });

        it('should return the created Module', function () {
            expect(factory.create(namespace, '/my/module.php')).to.equal(createdModule);
        });
    });

    describe('createGlobal()', function () {
        it('should correctly create the Module', function () {
            factory.createGlobal(namespace);

            expect(Module).to.have.been.calledOnce;
            expect(Module).to.have.been.calledWith(
                sinon.match.same(scopeFactory),
                sinon.match.same(namespace),
                null,
                true
            );
        });

        it('should return the created Module', function () {
            expect(factory.createGlobal(namespace)).to.equal(createdModule);
        });
    });
});
