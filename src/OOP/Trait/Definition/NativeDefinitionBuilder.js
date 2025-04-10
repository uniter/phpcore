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

    Exception = phpCommon.Exception,
    TraitDefinition = require('./TraitDefinition');

/**
 * Builds definitions for native traits (those defined using JavaScript code).
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
     * Defines a trait in the given namespace, either from a JS class/function or from a transpiled PHP trait,
     * where PHPToJS has generated an object containing all the information related to the trait.
     *
     * @param {string} name
     * @param {Function|object} definition Either a Function for a native JS trait or a transpiled definition object
     * @param {Namespace} namespace
     * @param {NamespaceScope} namespaceScope
     * @param {Trait[]} traits
     * @param {boolean} autoCoercionEnabled Whether the trait should be auto-coercing
     * @returns {TraitDefinition}
     */
    buildDefinition: function (
        name,
        definition,
        namespace,
        namespaceScope,
        traits,
        autoCoercionEnabled
    ) {
        var builder = this,
            constants = {},
            valueCoercer;

        if (!_.isFunction(definition)) {
            throw new Exception('NativeDefinitionBuilder :: Expected a function');
        }

        valueCoercer = builder.ffiFactory.createValueCoercer(autoCoercionEnabled);

        /**
         * Builds a map of methods from name to definition object.
         *
         * @returns {Object.<string, Object>}
         */
        function buildMethods() {
            var method,
                methodName,
                methods = {},
                prototype = definition.prototype;

            /* jshint forin:false, loopfunc: true */
            for (methodName in prototype) {
                method = builder.nativeMethodDefinitionBuilder.buildMethod(
                    prototype[methodName],
                    valueCoercer
                );

                if (!method) {
                    continue;
                }

                methods[methodName] = method;
            }

            return methods;
        }

        _.forOwn(definition.constants, function (valueProvider, constantName) {
            constants[constantName] = {
                value: valueProvider
            };
        });

        return new TraitDefinition(
            name,
            namespace,
            namespaceScope,
            traits,
            constants,
            {},
            {},
            buildMethods(),
            valueCoercer,
            null
        );
    }
});

module.exports = NativeDefinitionBuilder;
