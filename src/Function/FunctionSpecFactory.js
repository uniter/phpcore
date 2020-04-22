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
 * Creates FunctionSpec-related objects
 *
 * @param {class} FunctionSpec
 * @param {class} FunctionContext
 * @param {class} MethodContext
 * @param {class} ClosureContext
 * @param {CallStack} callStack
 * @param {ParameterListFactory} parameterListFactory
 * @param {ValueFactory} valueFactory
 * @constructor
 */
function FunctionSpecFactory(
    FunctionSpec,
    FunctionContext,
    MethodContext,
    ClosureContext,
    callStack,
    parameterListFactory,
    valueFactory
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {class}
     */
    this.ClosureContext = ClosureContext;
    /**
     * @type {class}
     */
    this.FunctionContext = FunctionContext;
    /**
     * @type {class}
     */
    this.FunctionSpec = FunctionSpec;
    /**
     * @type {class}
     */
    this.MethodContext = MethodContext;
    /**
     * @type {ParameterListFactory}
     */
    this.parameterListFactory = parameterListFactory;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(FunctionSpecFactory.prototype, {
    /**
     * Creates a FunctionSpec for a function alias
     *
     * @param {NamespaceScope} namespaceScope
     * @param {string} functionName
     * @param {Parameter[]} parameters
     * @param {string|null} filePath
     * @param {number|null} lineNumber
     * @returns {FunctionSpec}
     */
    createAliasFunctionSpec: function (namespaceScope, functionName, parameters, filePath, lineNumber) {
        var factory = this,
            context = new factory.FunctionContext(namespaceScope, functionName);

        return new factory.FunctionSpec(
            factory.callStack,
            factory.valueFactory,
            context,
            namespaceScope,
            parameters,
            filePath,
            lineNumber
        );
    },

    /**
     * Creates a FunctionSpec from the given spec data for a closure
     *
     * @param {NamespaceScope} namespaceScope
     * @param {Class|null} classObject
     * @param {Array} parametersSpecData
     * @param {string|null} filePath
     * @param {number|null} lineNumber
     * @returns {FunctionSpec}
     */
    createClosureSpec: function (namespaceScope, classObject, parametersSpecData, filePath, lineNumber) {
        var factory = this,
            context = new factory.ClosureContext(namespaceScope, classObject),
            parameters = factory.parameterListFactory.createParameterList(
                context,
                parametersSpecData,
                namespaceScope,
                filePath,
                lineNumber
            );

        return new factory.FunctionSpec(
            factory.callStack,
            factory.valueFactory,
            context,
            namespaceScope,
            parameters,
            filePath,
            lineNumber
        );
    },

    /**
     * Creates a FunctionSpec from the given spec data
     *
     * @param {NamespaceScope} namespaceScope
     * @param {string} functionName
     * @param {Array} parametersSpecData
     * @param {string|null} filePath
     * @param {number|null} lineNumber
     * @returns {FunctionSpec}
     */
    createFunctionSpec: function (namespaceScope, functionName, parametersSpecData, filePath, lineNumber) {
        var factory = this,
            context = new factory.FunctionContext(namespaceScope, functionName),
            parameters = factory.parameterListFactory.createParameterList(
                context,
                parametersSpecData,
                namespaceScope,
                filePath,
                lineNumber
            );

        return new factory.FunctionSpec(
            factory.callStack,
            factory.valueFactory,
            context,
            namespaceScope,
            parameters,
            filePath,
            lineNumber
        );
    },

    /**
     * Creates a FunctionSpec from the given spec data for a method
     *
     * @param {NamespaceScope} namespaceScope
     * @param {Class} classObject
     * @param {string} methodName
     * @param {Array} parametersSpecData
     * @param {string|null} filePath
     * @param {number|null} lineNumber
     * @returns {FunctionSpec}
     */
    createMethodSpec: function (namespaceScope, classObject, methodName, parametersSpecData, filePath, lineNumber) {
        var factory = this,
            context = new factory.MethodContext(classObject, methodName),
            parameters = factory.parameterListFactory.createParameterList(
                context,
                parametersSpecData,
                namespaceScope,
                filePath,
                lineNumber
            );

        return new factory.FunctionSpec(
            factory.callStack,
            factory.valueFactory,
            context,
            namespaceScope,
            parameters,
            filePath,
            lineNumber
        );
    }
});

module.exports = FunctionSpecFactory;
