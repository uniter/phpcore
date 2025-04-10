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
        var constants = {},
            promoter = this,
            InternalClass = classDefinition.getInternalClass(),
            sharedMethodData = classDefinition.getMethodData(),
            namespaceScope = classDefinition.getNamespaceScope(),
            instanceProperties = {},
            instrumentation = classDefinition.getInstrumentation() ||
                promoter.instrumentationFactory.createCallInstrumentation(null),
            classObject,
            staticProperties = {};

        _.each(classDefinition.getTraits(), function (traitObject) {
            // Mix the trait's members into the class.
            Object.assign(constants, traitObject.getConstants());
            Object.assign(staticProperties, traitObject.getStaticProperties());
            Object.assign(instanceProperties, traitObject.getInstanceProperties());
        });

        Object.assign(constants, classDefinition.getConstants());
        Object.assign(staticProperties, classDefinition.getStaticProperties());
        Object.assign(instanceProperties, classDefinition.getInstanceProperties());

        classObject = promoter.classFactory.createClass(
            classDefinition.getName(),
            classDefinition.getNamespace(),
            namespaceScope,
            classDefinition.getConstructorName(),
            classDefinition.hasDestructor(),
            InternalClass,
            classDefinition.getRootInternalPrototype(),
            instanceProperties,
            staticProperties,
            constants,
            classDefinition.getSuperClass(),
            classDefinition.getInterfaces(),
            classDefinition.getValueCoercer(),
            classDefinition.getMethodCaller(),
            instrumentation
        );

        _.each(classDefinition.getTraits(), function (traitObject) {
            // Mix the trait's methods into the class.
            _.forOwn(traitObject.getMethods(), function (methodDefinition, methodName) {
                InternalClass.prototype[methodName] = promoter.methodPromoter.promote(
                    methodName,
                    methodDefinition,
                    classObject,
                    traitObject,
                    namespaceScope,
                    sharedMethodData
                );
            });
        });

        _.forOwn(classDefinition.getMethods(), function (methodDefinition, methodName) {
            InternalClass.prototype[methodName] = promoter.methodPromoter.promote(
                methodName,
                methodDefinition,
                classObject,
                null, // No trait for this method.
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
