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
    phpCommon = require('phpcommon'),

    CANNOT_IMPLEMENT_THROWABLE = 'core.cannot_implement_throwable',

    ClassDefinition = require('./ClassDefinition'),
    Exception = phpCommon.Exception,
    PHPError = phpCommon.PHPError;

/**
 * Builds definitions for userland classes (those defined using PHP code).
 *
 * @param {CallStack} callStack
 * @param {ValueFactory} valueFactory
 * @param {FFIFactory} ffiFactory
 * @constructor
 */
function UserlandDefinitionBuilder(
    callStack,
    valueFactory,
    ffiFactory
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {FFIFactory}
     */
    this.ffiFactory = ffiFactory;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(UserlandDefinitionBuilder.prototype, {
    /**
     * Defines a class in the given namespace, either from a JS class/function or from a transpiled PHP class,
     * where PHPToJS has generated an object containing all the information related to the class
     *
     * @param {string} name
     * @param {Function|object} definition Either a Function for a native JS class or a transpiled definition object
     * @param {Class|null} superClass
     * @param {Namespace} namespace
     * @param {NamespaceScope} namespaceScope
     * @param {Class[]} interfaces
     * @param {boolean} autoCoercionEnabled Whether the class should be auto-coercing
     * @returns {ClassDefinition}
     */
    buildDefinition: function (
        name,
        definition,
        superClass,
        namespace,
        namespaceScope,
        interfaces,
        autoCoercionEnabled
    ) {
        var builder = this,
            constants,
            constructorName = null,
            methods = {},
            rootInternalPrototype,
            staticProperties,
            InternalClass,
            valueCoercer;

        if (_.isFunction(definition)) {
            throw new Exception('UserlandDefinitionBuilder :: Expected a plain object');
        }

        valueCoercer = builder.ffiFactory.createValueCoercer(autoCoercionEnabled);

        // Ensure the class does not attempt to implement Throwable directly
        _.each(interfaces, function (interfaceObject) {
            if (interfaceObject.is('Throwable')) {
                builder.callStack.raiseUncatchableFatalError(
                    CANNOT_IMPLEMENT_THROWABLE,
                    {
                        className: namespace.getPrefix() + name
                    }
                );
            }
        });

        InternalClass = function () {
            var objectValue = this,
                // TODO: Remove need for this lookup
                classObject = namespaceScope.getClass(name).yieldSync(),
                properties = {};

            // Go through and declare the properties and their default values
            // on the object from the class definition
            _.forOwn(definition.properties, function (propertyData, name) {
                properties[name] = objectValue.declareProperty(name, classObject, propertyData.visibility);
            });

            if (superClass) {
                // Class has a parent, call the parent's internal constructor
                superClass.getInternalClass().call(objectValue);
            }

            // Go through and define the properties and their default values
            // on the object from the class definition by initialising them
            _.forOwn(definition.properties, function (propertyData, name) {
                var instanceProperty = properties[name],
                    // FIXME: Handle async? eg. what if default/initial property value
                    //        references a constant of an asynchronously autoloaded class?
                    initialValue = propertyData.value(classObject);

                if (initialValue === null) {
                    // If a property has no initialiser then its initial value is NULL
                    initialValue = builder.valueFactory.createNull();
                }

                instanceProperty.initialise(initialValue);
            });
        };

        // Prevent native 'constructor' property from erroneously being detected as PHP class method
        delete InternalClass.prototype.constructor;

        if (superClass) {
            InternalClass.prototype = Object.create(superClass.getInternalClass().prototype);
        }

        // NB: Ensure we use forOwn() and not each() as method could have the name "length"
        _.forOwn(definition.methods, function (data, methodName) {
            // PHP5-style __construct magic method takes precedence
            if (methodName === '__construct') {
                if (constructorName) {
                    // TODO: Change for PHP 7 (see https://www.php.net/manual/en/migration70.incompatible.php)
                    builder.callStack.raiseError(PHPError.E_STRICT, 'Redefining already defined constructor for class ' + name);
                }

                constructorName = methodName;
            }

            if (!constructorName && methodName === name) {
                constructorName = methodName;
            }

            methods[methodName] = data;
        });

        staticProperties = definition.staticProperties;
        constants = definition.constants;

        // Record the prototype object that we should stop at when walking up the chain
        rootInternalPrototype = InternalClass.prototype;

        return new ClassDefinition(
            name,
            namespace,
            namespaceScope,
            superClass,
            interfaces,
            constants,
            constructorName,
            InternalClass,
            {},
            methods,
            rootInternalPrototype,
            staticProperties,
            valueCoercer
        );
    }
});

module.exports = UserlandDefinitionBuilder;
