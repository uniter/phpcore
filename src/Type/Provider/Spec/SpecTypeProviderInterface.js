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
 * @extends {TypeProviderInterface}
 */
function SpecTypeProviderInterface() {
    throw new Error('SpecTypeProviderInterface cannot be instantiated');
}

_.extend(SpecTypeProviderInterface.prototype, {
    /**
     * Registers a provider for a named type.
     *
     * @param {NamedTypeProviderInterface} namedProvider
     */
    addNamedProvider: throwUnimplemented('addNamedProvider')
});

module.exports = SpecTypeProviderInterface;
