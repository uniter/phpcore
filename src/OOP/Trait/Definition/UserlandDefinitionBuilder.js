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

    TraitDefinition = require('./TraitDefinition'),
    Exception = phpCommon.Exception;

/**
 * Builds definitions for userland traits (those defined using PHP code).
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
     * Defines a trait in the given namespace, either from a JS class/function or from a transpiled PHP trait,
     * where PHPToJS has generated an object containing all the information related to the trait.
     *
     * @param {string} name
     * @param {Function|object} definition Either a Function for a native JS trait or a transpiled definition object
     * @param {Namespace} namespace
     * @param {NamespaceScope} namespaceScope
     * @param {Trait[]} traits
     * @returns {TraitDefinition}
     */
    buildDefinition: function (
        name,
        definition,
        namespace,
        namespaceScope,
        traits
    ) {
        var builder = this,
            constants = {},
            instanceProperties,
            instrumentation,
            methods,
            staticProperties,
            valueCoercer;

        if (_.isFunction(definition)) {
            throw new Exception('UserlandDefinitionBuilder :: Expected a plain object');
        }

        valueCoercer = builder.ffiFactory.createValueCoercer(false);

        instanceProperties = definition.properties;
        methods = definition.methods;
        staticProperties = definition.staticProperties;

        _.forOwn(definition.constants, function (valueProvider, constantName) {
            constants[constantName] = {
                value: valueProvider
            };
        });

        instrumentation = builder.callStack.getCurrentInstrumentation();

        return new TraitDefinition(
            name,
            namespace,
            namespaceScope,
            traits,
            constants,
            instanceProperties,
            staticProperties,
            methods,
            valueCoercer,
            null,
            instrumentation
        );
    }
});

module.exports = UserlandDefinitionBuilder;
