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
    Module  = require('../../src/Module'),
    ModuleFactory = require('../../src/ModuleFactory');

describe('ModuleFactory', function () {
    beforeEach(function () {
        this.Module = sinon.stub();
        this.createdModule = sinon.createStubInstance(Module);
        this.Module.returns(this.createdModule);

        this.factory = new ModuleFactory(this.Module);
    });

    describe('create()', function () {
        it('should create one Module with the provided file path', function () {
            this.factory.create('/my/module/path.php');

            expect(this.Module).to.have.been.calledOnce;
            expect(this.Module).to.have.been.calledWith('/my/module/path.php');
        });

        it('should return the created Module', function () {
            expect(this.factory.create('/my/module.php')).to.equal(this.createdModule);
        });
    });
});
