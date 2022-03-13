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
 * Creates the correct Type from a function, closure or method parameter spec.
 *
 * @param {SpecTypeProvider} specTypeProvider
 * @constructor
 */
function ParameterTypeFactory(specTypeProvider) {
    /**
     * @type {SpecTypeProvider}
     */
    this.specTypeProvider = specTypeProvider;
}

_.extend(ParameterTypeFactory.prototype, {
    /**
     * Creates the correct Type from a function, closure or method parameter spec.
     *
     * @param {Object} parameterSpecData
     * @param {NamespaceScope} namespaceScope
     * @returns {TypeInterface}
     */
    createParameterType: function (parameterSpecData, namespaceScope) {
        return this.specTypeProvider.createType(parameterSpecData, namespaceScope);
    }
});

module.exports = ParameterTypeFactory;
