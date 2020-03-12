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
 * Creates objects related to Namespaces
 *
 * @param {class} Namespace
 * @param {CallStack} callStack
 * @param {FunctionFactory} functionFactory
 * @param {FunctionSpecFactory} functionSpecFactory
 * @param {ValueFactory} valueFactory
 * @param {ClassAutoloader} classAutoloader
 * @constructor
 */
function NamespaceFactory(
    Namespace,
    callStack,
    functionFactory,
    functionSpecFactory,
    valueFactory,
    classAutoloader
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {ClassAutoloader}
     */
    this.classAutoloader = classAutoloader;
    /**
     * @type {FunctionFactory}
     */
    this.functionFactory = functionFactory;
    /**
     * @type {FunctionSpecFactory}
     */
    this.functionSpecFactory = functionSpecFactory;
    /**
     * @type {class}
     */
    this.Namespace = Namespace;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(NamespaceFactory.prototype, {
    create: function (parentNamespace, name) {
        var factory = this;

        return new factory.Namespace(
            factory.callStack,
            factory.valueFactory,
            factory,
            factory.functionFactory,
            factory.functionSpecFactory,
            factory.classAutoloader,
            parentNamespace || null,
            name || ''
        );
    }
});

module.exports = NamespaceFactory;
