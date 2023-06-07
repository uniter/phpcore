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
    IS_STATIC = 'isStatic';

/**
 * Creates a method from its definition.
 *
 * @param {CallStack} callStack
 * @param {FunctionFactory} functionFactory
 * @param {FunctionSpecFactory} functionSpecFactory
 * @constructor
 */
function MethodPromoter(
    callStack,
    functionFactory,
    functionSpecFactory
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {FunctionFactory}
     */
    this.functionFactory = functionFactory;
    /**
     * @type {FunctionSpecFactory}
     */
    this.functionSpecFactory = functionSpecFactory;
}

_.extend(MethodPromoter.prototype, {
    /**
     * Promotes a method definition data object to a method.
     *
     * @param {string} methodName
     * @param {Object} methodDefinition Definition of the method
     * @param {Class} classObject
     * @param {NamespaceScope} namespaceScope
     * @param {Object} sharedMethodData Method data object shared between all methods of a class
     * @returns {Function} Returns the wrapped method function created
     */
    promote: function (
        methodName,
        methodDefinition,
        classObject,
        namespaceScope,
        sharedMethodData
    ) {
        var promoter = this,
            functionSpec,
            lineNumber = methodDefinition.line,
            method,
            methodIsStatic = methodDefinition[IS_STATIC],
            // Parameter spec data may only be provided for PHP-transpiled functions.
            parametersSpecData = methodDefinition.args || [],
            // TODO: Userland return-by-reference (only NativeMethodDefinitionBuilder uses this at the moment).
            returnByReference = Boolean(methodDefinition.ref),
            returnTypeSpecData = methodDefinition.ret || null;

        functionSpec = promoter.functionSpecFactory.createMethodSpec(
            namespaceScope,
            classObject,
            methodName,
            parametersSpecData,
            returnTypeSpecData,
            returnByReference,
            promoter.callStack.getLastFilePath(),
            lineNumber || null
        );

        method = promoter.functionFactory.create(
            namespaceScope,
            classObject,
            methodDefinition.method,
            methodName,
            null, // Current object only applies to Closures, so nothing to set here.
            null, // No need to override the class for a method.
            functionSpec
        );

        method[IS_STATIC] = methodIsStatic;

        // TODO: Remove this and just use method.functionSpec in Class instead?
        method.data = sharedMethodData;

        return method;
    }
});

module.exports = MethodPromoter;
