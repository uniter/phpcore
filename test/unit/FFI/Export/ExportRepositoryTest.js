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
    ExportFactory = require('../../../../src/FFI/Export/ExportFactory'),
    ExportRepository = require('../../../../src/FFI/Export/ExportRepository'),
    ObjectValue = require('../../../../src/Value/Object').sync(),
    ValueFactory = require('../../../../src/ValueFactory').sync(),
    ValueStorage = require('../../../../src/FFI/Value/ValueStorage');

describe('ExportRepository', function () {
    var exportFactory,
        objectValue,
        repository,
        valueFactory,
        valueStorage;

    beforeEach(function () {
        exportFactory = sinon.createStubInstance(ExportFactory);
        objectValue = sinon.createStubInstance(ObjectValue);
        valueFactory = new ValueFactory();
        valueStorage = sinon.createStubInstance(ValueStorage);

        valueStorage.hasExportForObjectValue.returns(false);

        repository = new ExportRepository(exportFactory, valueStorage);
    });

    describe('export()', function () {
        it('should return a previously-cached export value', function () {
            valueStorage.hasExportForObjectValue
                .withArgs(sinon.match.same(objectValue))
                .returns(true);
            valueStorage.getExportForObjectValue
                .withArgs(sinon.match.same(objectValue))
                .returns(21);

            expect(repository.export(objectValue)).to.equal(21);
        });

        it('should map the source ObjectValue to its export value', function () {
            exportFactory.create
                .withArgs(sinon.match.same(objectValue))
                .returns('my export');

            repository.export(objectValue);

            expect(valueStorage.setExportForObjectValue).to.have.been.calledOnce;
            expect(valueStorage.setExportForObjectValue).to.have.been.calledWith(
                sinon.match.same(objectValue),
                'my export'
            );
        });

        it('should map an exported object value back to the source ObjectValue', function () {
            var exportObject = {my: 'export'};
            exportFactory.create
                .withArgs(sinon.match.same(objectValue))
                .returns(exportObject);

            repository.export(objectValue);

            expect(valueStorage.setObjectValueForExport).to.have.been.calledOnce;
            expect(valueStorage.setObjectValueForExport).to.have.been.calledWith(
                sinon.match.same(exportObject),
                sinon.match.same(objectValue)
            );
        });

        it('should not map an exported non-object value back to the source ObjectValue', function () {
            exportFactory.create
                .withArgs(sinon.match.same(objectValue))
                .returns('not an object');

            repository.export(objectValue);

            expect(valueStorage.setObjectValueForExport).not.to.have.been.called;
        });
    });
});
