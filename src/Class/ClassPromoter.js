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
 * Creates a class from its definition
 *
 * @param {CallStack} callStack
 * @param {ClassFactory} classFactory
 * @param {FunctionFactory} functionFactory
 * @param {FunctionSpecFactory} functionSpecFactory
 * @constructor
 */
function ClassPromoter(
    callStack,
    classFactory,
    functionFactory,
    functionSpecFactory
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {ClassFactory}
     */
    this.classFactory = classFactory;
    /**
     * @type {FunctionFactory}
     */
    this.functionFactory = functionFactory;
    /**
     * @type {FunctionSpecFactory}
     */
    this.functionSpecFactory = functionSpecFactory;
}

_.extend(ClassPromoter.prototype, {
    /**
     * Promotes a ClassDefinition to a Class
     *
     * @param {ClassDefinition} classDefinition
     * @returns {Class} Returns the internal Class instance created
     */
    promoteDefinition: function (classDefinition) {
        var promoter = this,
            InternalClass = classDefinition.getInternalClass(),
            methodData = classDefinition.getMethodData(),
            namespaceScope = classDefinition.getNamespaceScope(),
            classObject = promoter.classFactory.createClass(
                classDefinition.getName(),
                classDefinition.getNamespace(),
                namespaceScope,
                classDefinition.getConstructorName(),
                InternalClass,
                classDefinition.getRootInternalPrototype(),
                classDefinition.getInstanceProperties(),
                classDefinition.getStaticProperties(),
                classDefinition.getConstants(),
                classDefinition.getSuperClass(),
                classDefinition.getInterfaces(),
                classDefinition.getValueCoercer()
            );

        _.forOwn(classDefinition.getMethods(), function (data, methodName) {
            // TODO: For JS-defined functions, `methods` is always empty - see above.
            //       Consider building it up with processed methods/specs etc., indexed by lowercased name,
            //       to also solve the performance issue with the current method lookup logic.
            var functionSpec,
                lineNumber = data.line,
                method,
                methodIsStatic = data[IS_STATIC],
                // Parameter spec data may only be provided for PHP-transpiled functions
                parametersSpecData = data.args;

            functionSpec = promoter.functionSpecFactory.createMethodSpec(
                namespaceScope,
                classObject,
                methodName,
                parametersSpecData || [],
                promoter.callStack.getLastFilePath(),
                lineNumber || null
            );

            method = promoter.functionFactory.create(
                namespaceScope,
                classObject,
                data.method,
                methodName,
                null,
                null, // NB: No need to override the class for a method
                functionSpec
            );

            method[IS_STATIC] = methodIsStatic;
            method.data = methodData;

            InternalClass.prototype[methodName] = method;
        });

        methodData.classObject = classObject;

        return classObject;
    }
});

module.exports = ClassPromoter;
