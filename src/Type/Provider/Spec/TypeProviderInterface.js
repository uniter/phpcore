/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

var _ = require('microdash'),
    throwUnimplemented = function (functionName) {
        return function () {
            throw new Error(functionName + '() :: Not implemented');
        };
    };

/**
 * Creates the correct Type from a type spec.
 *
 * @interface
 */
function TypeProviderInterface() {
    throw new Error('TypeProviderInterface cannot be instantiated');
}

_.extend(TypeProviderInterface.prototype, {
    /**
     * Creates the correct Type from a type spec.
     *
     * @param {Object} typeSpecData
     * @param {NamespaceScope} namespaceScope
     * @param {boolean} nullable
     * @returns {TypeInterface}
     */
    createType: throwUnimplemented('createType')
});

module.exports = TypeProviderInterface;
