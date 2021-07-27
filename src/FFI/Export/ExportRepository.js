/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash');

/**
 * Fetches the exported value for an ObjectValue, creating and caching it if needed
 *
 * @param {ExportFactory} exportFactory
 * @param {ValueStorage} valueStorage
 * @constructor
 */
function ExportRepository(exportFactory, valueStorage) {
    /**
     * @type {ExportFactory}
     */
    this.exportFactory = exportFactory;
    /**
     * @type {ValueStorage}
     */
    this.valueStorage = valueStorage;
}

_.extend(ExportRepository.prototype, {
    /**
     * Fetches an exported native object for the given object value
     *
     * @param {ObjectValue} objectValue
     * @returns {Object|*}
     */
    export: function (objectValue) {
        var exportedValue,
            repository = this;

        if (repository.valueStorage.hasExportForObjectValue(objectValue)) {
            // Cache the exported value for each ObjectValue for identity and to save on memory
            return repository.valueStorage.getExportForObjectValue(objectValue);
        }

        exportedValue = repository.exportFactory.create(objectValue);

        // Allow us to always map the source object value to this same exported value
        repository.valueStorage.setExportForObjectValue(objectValue, exportedValue);

        /*
         * If the exported value is an object that is ever passed back into PHP-land,
         * allow us to map it back to the source object value.
         * If a primitive value is exported instead then we can ignore, as it will just
         * be coerced to and from its native value and a scalar value object
         */
        if ((typeof exportedValue === 'object' && exportedValue !== null) || typeof exportedValue === 'function') {
            repository.valueStorage.setObjectValueForExport(exportedValue, objectValue);
        }

        return exportedValue;
    }
});

module.exports = ExportRepository;
