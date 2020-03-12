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
 * Creates the correct Parameters from a function, closure or method parameter list spec
 *
 * @param {ParameterFactory} parameterFactory
 * @param {ParameterTypeFactory} parameterTypeFactory
 * @constructor
 */
function ParameterListFactory(parameterFactory, parameterTypeFactory) {
    /**
     * @type {ParameterFactory}
     */
    this.parameterFactory = parameterFactory;
    /**
     * @type {ParameterTypeFactory}
     */
    this.parameterTypeFactory = parameterTypeFactory;
}

_.extend(ParameterListFactory.prototype, {
    /**
     * Creates the correct Parameters from a function, closure or method parameter list spec
     *
     * @param {FunctionContextInterface} context
     * @param {Array} parametersSpecData
     * @param {NamespaceScope} namespaceScope
     * @param {string|null} filePath
     * @param {number|null} lineNumber
     * @returns {Parameter[]|null[]}
     */
    createParameterList: function (
        context,
        parametersSpecData,
        namespaceScope,
        filePath,
        lineNumber
    ) {
        var factory = this,
            parameters = [];

        _.each(parametersSpecData, function (parameterSpecData, parameterIndex) {
            var parameterType;

            if (!parameterSpecData) {
                // Parameter is omitted due to bundle-size optimisations or similar, ignore
                parameters.push(null);

                return;
            }

            parameterType = factory.parameterTypeFactory.createParameterType(parameterSpecData, namespaceScope);

            parameters.push(factory.parameterFactory.createParameter(
                parameterSpecData.name,
                parameterIndex,
                parameterType,
                context,
                parameterSpecData.ref,
                parameterSpecData.value || null,
                filePath,
                lineNumber
            ));
        });

        return parameters;
    }
});

module.exports = ParameterListFactory;
