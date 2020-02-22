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
 * @param {Translator} translator
 * @constructor
 */
function ParameterFactory(Parameter, callStack, translator) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {class}
     */
    this.Parameter = Parameter;
    /**
     * @type {Translator}
     */
    this.translator = translator;
}

_.extend(ParameterFactory.prototype, {
    /**
     * Creates a Parameter from the given spec data
     *
     * @param {string|null} name
     * @param {number} index
     * @param {Type} typeObject
     * @param {FunctionContextInterface} context
     * @param {boolean} passedByReference
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
        passedByReference,
        defaultValueProvider,
        filePath,
        lineNumber
    ) {
        var factory = this;

        return new factory.Parameter(
            factory.callStack,
            factory.translator,
            name,
            index,
            typeObject,
            context,
            passedByReference,
            defaultValueProvider,
            filePath,
            lineNumber
        );
    }
});

module.exports = ParameterFactory;
