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
 * Creates FunctionSpec-related objects.
 *
 * @param {class} FunctionSpec
 * @param {class} FunctionContext
 * @param {class} MethodContext
 * @param {class} ClosureContext
 * @param {typeof OverloadedFunctionSpec} OverloadedFunctionSpec
 * @param {typeof InvalidOverloadedFunctionSpec} InvalidOverloadedFunctionSpec
 * @param {CallStack} callStack
 * @param {Translator} translator
 * @param {ParameterListFactory} parameterListFactory
 * @param {ReturnTypeProvider} returnTypeProvider
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @constructor
 */
function FunctionSpecFactory(
    FunctionSpec,
    FunctionContext,
    MethodContext,
    ClosureContext,
    OverloadedFunctionSpec,
    InvalidOverloadedFunctionSpec,
    callStack,
    translator,
    parameterListFactory,
    returnTypeProvider,
    valueFactory,
    referenceFactory,
    futureFactory,
    flow
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
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {class}
     */
    this.FunctionContext = FunctionContext;
    /**
     * @type {class}
     */
    this.FunctionSpec = FunctionSpec;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {typeof InvalidOverloadedFunctionSpec}
     */
    this.InvalidOverloadedFunctionSpec = InvalidOverloadedFunctionSpec;
    /**
     * @type {class}
     */
    this.MethodContext = MethodContext;
    /**
     * @type {typeof OverloadedFunctionSpec}
     */
    this.OverloadedFunctionSpec = OverloadedFunctionSpec;
    /**
     * @type {ParameterListFactory}
     */
    this.parameterListFactory = parameterListFactory;
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
    /**
     * @type {ReturnTypeProvider}
     */
    this.returnTypeProvider = returnTypeProvider;
    /**
     * @type {Translator}
     */
    this.translator = translator;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(FunctionSpecFactory.prototype, {
    /**
     * Creates a FunctionSpec for a function alias.
     *
     * @param {NamespaceScope} namespaceScope
     * @param {string} functionName
     * @param {Parameter[]} parameters
     * @param {Function} func
     * @param {TypeInterface|null} returnType
     * @param {boolean} returnByReference
     * @param {string|null} filePath
     * @param {number|null} lineNumber
     * @returns {FunctionSpec}
     */
    createAliasFunctionSpec: function (
        namespaceScope,
        functionName,
        parameters,
        func,
        returnType,
        returnByReference,
        filePath,
        lineNumber
    ) {
        var factory = this,
            context = new factory.FunctionContext(namespaceScope, functionName);

        return new factory.FunctionSpec(
            factory.callStack,
            factory.translator,
            factory.valueFactory,
            factory.referenceFactory,
            factory.futureFactory,
            factory.flow,
            context,
            namespaceScope,
            parameters,
            func,
            returnType,
            returnByReference,
            filePath,
            lineNumber
        );
    },

    /**
     * Creates a FunctionSpec from the given spec data for a closure.
     *
     * @param {NamespaceScope} namespaceScope
     * @param {Class|null} classObject
     * @param {ObjectValue|null} enclosingObject
     * @param {Array} parametersSpecData
     * @param {Function} func
     * @param {Object|null} returnTypeSpecData
     * @param {boolean} returnByReference
     * @param {Object.<string, ReferenceSlot>} referenceBindings
     * @param {Object.<string, Value>} valueBindings
     * @param {string|null} filePath
     * @param {number|null} lineNumber
     * @returns {FunctionSpec}
     */
    createClosureSpec: function (
        namespaceScope,
        classObject,
        enclosingObject,
        parametersSpecData,
        func,
        returnTypeSpecData,
        returnByReference,
        referenceBindings,
        valueBindings,
        filePath,
        lineNumber
    ) {
        var factory = this,
            context = new factory.ClosureContext(
                namespaceScope,
                classObject,
                enclosingObject,
                referenceBindings,
                valueBindings
            ),
            parameters = factory.parameterListFactory.createParameterList(
                context,
                parametersSpecData,
                namespaceScope,
                filePath,
                lineNumber
            ),
            returnType = returnTypeSpecData ?
                factory.returnTypeProvider.createReturnType(returnTypeSpecData, namespaceScope) :
                null;

        return new factory.FunctionSpec(
            factory.callStack,
            factory.translator,
            factory.valueFactory,
            factory.referenceFactory,
            factory.futureFactory,
            factory.flow,
            context,
            namespaceScope,
            parameters,
            func,
            returnType,
            returnByReference,
            filePath,
            lineNumber
        );
    },

    /**
     * Creates a FunctionSpec from the given spec data.
     *
     * @param {NamespaceScope} namespaceScope
     * @param {string} functionName
     * @param {Array} parametersSpecData
     * @param {Function} func
     * @param {Object|null} returnTypeSpecData
     * @param {boolean} returnByReference
     * @param {string|null} filePath
     * @param {number|null} lineNumber
     * @returns {FunctionSpec}
     */
    createFunctionSpec: function (
        namespaceScope,
        functionName,
        parametersSpecData,
        func,
        returnTypeSpecData,
        returnByReference,
        filePath,
        lineNumber
    ) {
        var factory = this,
            context = new factory.FunctionContext(namespaceScope, functionName),
            parameters = factory.parameterListFactory.createParameterList(
                context,
                parametersSpecData,
                namespaceScope,
                filePath,
                lineNumber
            ),
            returnType = returnTypeSpecData ?
                factory.returnTypeProvider.createReturnType(returnTypeSpecData, namespaceScope) :
                null;

        return new factory.FunctionSpec(
            factory.callStack,
            factory.translator,
            factory.valueFactory,
            factory.referenceFactory,
            factory.futureFactory,
            factory.flow,
            context,
            namespaceScope,
            parameters,
            func,
            returnType,
            returnByReference,
            filePath,
            lineNumber
        );
    },

    /**
     * Creates an InvalidOverloadedFunctionSpec.
     *
     * @param {OverloadedFunctionSpec} overloadedFunctionSpec
     * @param {number} argumentCount
     * @returns {InvalidOverloadedFunctionSpec}
     */
    createInvalidOverloadedFunctionSpec: function (
        overloadedFunctionSpec,
        argumentCount
    ) {
        var factory = this;

        return new factory.InvalidOverloadedFunctionSpec(
            factory.callStack,
            factory.translator,
            factory.flow,
            overloadedFunctionSpec,
            argumentCount
        );
    },

    /**
     * Creates a FunctionSpec from the given spec data for a method.
     *
     * @param {NamespaceScope} namespaceScope
     * @param {Class} classObject
     * @param {string} methodName
     * @param {Array} parametersSpecData
     * @param {Function} func
     * @param {Object|null} returnTypeSpecData
     * @param {boolean} returnByReference
     * @param {string|null} filePath
     * @param {number|null} lineNumber
     * @returns {FunctionSpec}
     */
    createMethodSpec: function (
        namespaceScope,
        classObject,
        methodName,
        parametersSpecData,
        func,
        returnTypeSpecData,
        returnByReference,
        filePath,
        lineNumber
    ) {
        var factory = this,
            context = new factory.MethodContext(classObject, methodName),
            parameters = factory.parameterListFactory.createParameterList(
                context,
                parametersSpecData,
                namespaceScope,
                filePath,
                lineNumber
            ),
            returnType = returnTypeSpecData ?
                factory.returnTypeProvider.createReturnType(returnTypeSpecData, namespaceScope) :
                null;

        return new factory.FunctionSpec(
            factory.callStack,
            factory.translator,
            factory.valueFactory,
            factory.referenceFactory,
            factory.futureFactory,
            factory.flow,
            context,
            namespaceScope,
            parameters,
            func,
            returnType,
            returnByReference,
            filePath,
            lineNumber
        );
    },

    /**
     * Creates an OverloadedFunctionSpec.
     *
     * @param {string} name
     * @param {Array.<number, FunctionSpec>} variantFunctionSpecsByParameterCount
     * @param {number} minimumParameterCount
     * @param {number} maximumParameterCount
     * @returns {OverloadedFunctionSpec}
     */
    createOverloadedFunctionSpec: function (
        name,
        variantFunctionSpecsByParameterCount,
        minimumParameterCount,
        maximumParameterCount
    ) {
        var factory = this;

        return new factory.OverloadedFunctionSpec(
            factory,
            name,
            variantFunctionSpecsByParameterCount,
            minimumParameterCount,
            maximumParameterCount
        );
    }
});

module.exports = FunctionSpecFactory;
