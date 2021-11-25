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

    MAGIC_CONSTRUCT = '__construct',

    ClassDefinition = require('./ClassDefinition'),
    Exception = phpCommon.Exception;

/**
 * Builds definitions for native classes (those defined using JavaScript code).
 *
 * @param {FFIFactory} ffiFactory
 * @constructor
 */
function NativeDefinitionBuilder(ffiFactory) {
    /**
     * @type {FFIFactory}
     */
    this.ffiFactory = ffiFactory;
}

_.extend(NativeDefinitionBuilder.prototype, {
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
            constructorName = null,
            methodData = {},
            proxyConstructor,
            rootInternalPrototype,
            InternalClass,
            valueCoercer;

        if (!_.isFunction(definition)) {
            throw new Exception('NativeDefinitionBuilder :: Expected a function');
        }

        valueCoercer = builder.ffiFactory.createValueCoercer(autoCoercionEnabled);

        // Create a new, empty native constructor so that we can avoid calling
        // the original if the derived class does not call parent::__construct(...)
        // - Unless the class defines the special `shadowConstructor` property, which
        //   is always called regardless of whether the parent constructor is called explicitly
        InternalClass = function () {
            var objectValue = this;

            if (definition.shadowConstructor) {
                definition.shadowConstructor.call(
                    // Use the native object as the `this` object inside the shadow constructor
                    // if auto-coercion is enabled, otherwise use the ObjectValue
                    valueCoercer.isAutoCoercionEnabled() ? objectValue.getObject() : objectValue
                );
            }

            if (superClass) {
                // Class has a parent, call the parent's internal constructor
                superClass.getInternalClass().call(objectValue);
            }
        };
        InternalClass.prototype = Object.create(definition.prototype);
        proxyConstructor = function () {
            var
                objectValue = this,
                // Will be the native object as the `this` object inside the (shadow) constructor
                // if auto-coercion is enabled, otherwise use the ObjectValue
                unwrappedThisObject = valueCoercer.isAutoCoercionEnabled() ?
                    objectValue.getObject() :
                    objectValue,
                unwrappedArgs = valueCoercer.coerceArguments(arguments);

            // Call the original native constructor
            definition.apply(unwrappedThisObject, unwrappedArgs);

            // Call magic __construct method if defined for the original native class
            if (definition.prototype[MAGIC_CONSTRUCT]) {
                definition.prototype[MAGIC_CONSTRUCT].apply(unwrappedThisObject, unwrappedArgs);
            }
        };
        proxyConstructor.neverCoerce = true;
        proxyConstructor.data = methodData;
        InternalClass.prototype[MAGIC_CONSTRUCT] = proxyConstructor;
        constructorName = MAGIC_CONSTRUCT;

        // Record the prototype object that we should stop at when walking up the chain
        rootInternalPrototype = definition.prototype;

        return new ClassDefinition(
            name,
            namespace,
            namespaceScope,
            superClass,
            interfaces,
            {},
            constructorName,
            InternalClass,
            methodData,
            {},
            rootInternalPrototype,
            {},
            valueCoercer
        );
    }
});

module.exports = NativeDefinitionBuilder;
