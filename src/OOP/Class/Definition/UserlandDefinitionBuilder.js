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
     * @param {Trait[]} traits
     * @returns {ClassDefinition}
     */
    buildDefinition: function (
        name,
        definition,
        superClass,
        namespace,
        namespaceScope,
        interfaces,
        traits
    ) {
        var builder = this,
            constants = {},
            constructorName = null,
            instanceProperties,
            instrumentation,
            methods = {},
            rootInternalPrototype,
            staticProperties,
            InternalClass,
            valueCoercer;

        if (_.isFunction(definition)) {
            throw new Exception('UserlandDefinitionBuilder :: Expected a plain object');
        }

        valueCoercer = builder.ffiFactory.createValueCoercer(false);

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

        InternalClass = function () {};

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

        instanceProperties = definition.properties;
        staticProperties = definition.staticProperties;

        _.forOwn(definition.constants, function (valueProvider, constantName) {
            constants[constantName] = {
                value: valueProvider
            };
        });

        // Record the prototype object that we should stop at when walking up the chain.
        rootInternalPrototype = InternalClass.prototype;

        instrumentation = builder.callStack.getCurrentInstrumentation();

        return new ClassDefinition(
            name,
            namespace,
            namespaceScope,
            superClass,
            interfaces,
            traits,
            constants,
            constructorName,
            InternalClass,
            {},
            methods,
            rootInternalPrototype,
            instanceProperties,
            staticProperties,
            valueCoercer,
            null,
            instrumentation
        );
    }
});

module.exports = UserlandDefinitionBuilder;
