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
    },
    util = require('util'),
    TypeProviderInterface = require('./TypeProviderInterface');

/**
 * Creates the correct Type from a type spec.
 *
 * @interface
 * @extends {TypeProviderInterface}
 */
function NamedTypeProviderInterface() {
    throw new Error('NamedTypeProviderInterface cannot be instantiated');
}

util.inherits(NamedTypeProviderInterface, TypeProviderInterface);

_.extend(NamedTypeProviderInterface.prototype, {
    /**
     * Fetches the type name.
     *
     * @returns {string}
     */
    getTypeName: throwUnimplemented('getTypeName')
});

module.exports = NamedTypeProviderInterface;
