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
 * Creates the correct Type from a function, closure or method return type spec.
 *
 * @param {SpecTypeProvider} specTypeProvider
 * @constructor
 */
function ReturnTypeProvider(specTypeProvider) {
    /**
     * @type {SpecTypeProvider}
     */
    this.specTypeProvider = specTypeProvider;
}

_.extend(ReturnTypeProvider.prototype, {
    /**
     * Creates the correct Type from a function, closure or method return type spec.
     *
     * @param {Object} returnTypeSpecData
     * @param {NamespaceScope} namespaceScope
     * @returns {TypeInterface}
     */
    createReturnType: function (returnTypeSpecData, namespaceScope) {
        // TODO: Implement "void" and "never" types.
        return this.specTypeProvider.createType(returnTypeSpecData, namespaceScope);
    }
});

module.exports = ReturnTypeProvider;
