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
 * Creates a class from its definition.
 *
 * @param {ClassFactory} classFactory
 * @param {MethodPromoter} methodPromoter
 * @param {InstrumentationFactory} instrumentationFactory
 * @constructor
 */
function ClassPromoter(
    classFactory,
    methodPromoter,
    instrumentationFactory
) {
    /**
     * @type {ClassFactory}
     */
    this.classFactory = classFactory;
    /**
     * @type {InstrumentationFactory}
     */
    this.instrumentationFactory = instrumentationFactory;
    /**
     * @type {MethodPromoter}
     */
    this.methodPromoter = methodPromoter;
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
            sharedMethodData = classDefinition.getMethodData(),
            namespaceScope = classDefinition.getNamespaceScope(),
            instrumentation = classDefinition.getInstrumentation() ||
                promoter.instrumentationFactory.createCallInstrumentation(null),
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
                classDefinition.getValueCoercer(),
                classDefinition.getMethodCaller(),
                instrumentation
            );

        _.forOwn(classDefinition.getMethods(), function (methodDefinition, methodName) {
            InternalClass.prototype[methodName] = promoter.methodPromoter.promote(
                methodName,
                methodDefinition,
                classObject,
                namespaceScope,
                sharedMethodData
            );
        });

        // Enable fetching the original class object (which may be different from the current class,
        // if the method was inherited) via methods.
        sharedMethodData.classObject = classObject;

        return classObject;
    }
});

module.exports = ClassPromoter;
