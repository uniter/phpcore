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
 * @param {class} Parameter
 * @param {CallStack} callStack
 * @param {ValueFactory} valueFactory
 * @param {Translator} translator
 * @param {FutureFactory} futureFactory
 * @param {Flow} flow
 * @param {Userland} userland
 * @constructor
 */
function ParameterFactory(
    Parameter,
    callStack,
    valueFactory,
    translator,
    futureFactory,
    flow,
    userland
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {Flow}
     */
    this.flow = flow;
    /**
     * @type {FutureFactory}
     */
    this.futureFactory = futureFactory;
    /**
     * @type {class}
     */
    this.Parameter = Parameter;
    /**
     * @type {Translator}
     */
    this.translator = translator;
    /**
     * @type {Userland}
     */
    this.userland = userland;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(ParameterFactory.prototype, {
    /**
     * Creates a Parameter from the given spec data
     *
     * @param {string} name
     * @param {number} index
     * @param {TypeInterface} typeObject
     * @param {FunctionContextInterface} context
     * @param {NamespaceScope} namespaceScope
     * @param {boolean} passedByReference
     * @param {boolean} variadic
     * @param {Function|null} defaultValueProvider
     * @param {string|null} filePath
     * @param {number|null} lineNumber
     * @returns {Parameter}
     */
    createParameter: function (
        name,
        index,
        typeObject,
        context,
        namespaceScope,
        passedByReference,
        variadic,
        defaultValueProvider,
        filePath,
        lineNumber
    ) {
        var factory = this;

        return new factory.Parameter(
            factory.callStack,
            factory.valueFactory,
            factory.translator,
            factory.futureFactory,
            factory.flow,
            factory.userland,
            factory,
            name,
            index,
            typeObject,
            context,
            namespaceScope,
            passedByReference,
            variadic,
            defaultValueProvider,
            filePath,
            lineNumber
        );
    }
});

module.exports = ParameterFactory;
