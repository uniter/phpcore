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
    ORIGINAL_MAGIC_CONSTRUCTOR = '__@_original_construct',

    ClassDefinition = require('./ClassDefinition'),
    Exception = phpCommon.Exception;

/**
 * Builds definitions for native classes (those defined using JavaScript code).
 *
 * @param {ValueFactory} valueFactory
 * @param {FFIFactory} ffiFactory
 * @param {NativeMethodDefinitionBuilder} nativeMethodDefinitionBuilder
 * @constructor
 */
function NativeDefinitionBuilder(valueFactory, ffiFactory, nativeMethodDefinitionBuilder) {
    /**
     * @type {FFIFactory}
     */
    this.ffiFactory = ffiFactory;
    /**
     * @type {NativeMethodDefinitionBuilder}
     */
    this.nativeMethodDefinitionBuilder = nativeMethodDefinitionBuilder;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
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
     * @param {Trait[]} traits
     * @param {boolean} autoCoercionEnabled Whether the class should be auto-coercing
     * @param {Function|null} methodCaller Custom method call handler
     * @returns {ClassDefinition}
     */
    buildDefinition: function (
        name,
        definition,
        superClass,
        namespace,
        namespaceScope,
        interfaces,
        traits,
        autoCoercionEnabled,
        methodCaller
    ) {
        var builder = this,
            constants = {},
            constructorName = null,
            hasMagicConstructor = false,
            methodData = {},
            methods = {},
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
        //   is always called regardless of whether the parent constructor is called explicitly.
        InternalClass = function (...shadowConstructorArgs) {
            var objectValue = this;

            if (definition.shadowConstructor) {
                definition.shadowConstructor.apply(
                    // Use the native object as the `this` object inside the shadow constructor
                    // if auto-coercion is enabled, otherwise use the ObjectValue.
                    autoCoercionEnabled ? objectValue.getObject() : objectValue,
                    // Pass arguments through to the shadow constructor.
                    shadowConstructorArgs
                );
            }
        };
        InternalClass.prototype = Object.create(definition.prototype);
        proxyConstructor = function (...positionalArgs) {
            var objectValue = this.getThisObject(),
                // Will be the native object as the `this` object inside the (shadow) constructor
                // if auto-coercion is enabled, otherwise use the ObjectValue.
                unwrappedThisObject = autoCoercionEnabled ?
                    objectValue.getObject() :
                    objectValue;

            return valueCoercer.coerceArguments(positionalArgs)
                .next(function (unwrappedPositionalArgs) {
                    // Call the original native constructor, returning its result
                    // in case a Future is returned so that it may be awaited.
                    return definition.apply(unwrappedThisObject, unwrappedPositionalArgs);
                })
                .next(function () {
                    // Call magic __construct method if defined for the original native class.
                    if (hasMagicConstructor) {
                        // Note that although constructors' return values are discarded, it may pause, in which case
                        // a Future would be returned, which we then need to return in order to await.
                        return objectValue.callMethod(ORIGINAL_MAGIC_CONSTRUCTOR, positionalArgs/*, namedArgs*/);
                    }

                    return builder.valueFactory.createNull();
                })
                .asValue();
        };
        proxyConstructor.data = methodData;
        constructorName = MAGIC_CONSTRUCT;

        // Record the prototype object that we should stop at when walking up the chain
        rootInternalPrototype = definition.prototype;

        /**
         * Builds a map of methods from name to definition object.
         *
         * @returns {Object.<string, Object>}
         */
        function buildMethods() {
            var method,
                methodName,
                methods = {};

            /* jshint forin:false, loopfunc: true */
            for (methodName in rootInternalPrototype) {
                method = builder.nativeMethodDefinitionBuilder.buildMethod(
                    rootInternalPrototype[methodName],
                    valueCoercer
                );

                if (!method) {
                    continue;
                }

                if (methodName.toLowerCase() === MAGIC_CONSTRUCT) {
                    hasMagicConstructor = true;
                    methodName = ORIGINAL_MAGIC_CONSTRUCTOR;
                }

                methods[methodName] = method;
            }

            methods[MAGIC_CONSTRUCT] = {
                line: null,
                args: null,
                isStatic: false,
                method: proxyConstructor,
                ref: false,
                ret: null
            };

            return methods;
        }

        _.forOwn(definition.constants, function (valueProvider, constantName) {
            constants[constantName] = {
                value: valueProvider
            };
        });

        methods = buildMethods();

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
            methodData,
            methods,
            rootInternalPrototype,
            {},
            {},
            valueCoercer,
            methodCaller,
            null
        );
    }
});

module.exports = NativeDefinitionBuilder;
