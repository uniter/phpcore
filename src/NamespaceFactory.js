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
 * Creates objects related to Namespaces.
 *
 * @param {class} Namespace
 * @param {CallStack} callStack
 * @param {Flow} flow
 * @param {FunctionFactory} functionFactory
 * @param {FunctionSpecFactory} functionSpecFactory
 * @param {ValueFactory} valueFactory
 * @param {ClassAutoloader} classAutoloader
 * @param {ClassDefiner} classDefiner
 * @constructor
 */
function NamespaceFactory(
    Namespace,
    callStack,
    flow,
    functionFactory,
    functionSpecFactory,
    valueFactory,
    classAutoloader,
    classDefiner
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
     * @type {ClassDefiner}
     */
    this.classDefiner = classDefiner;
    /**
     * @type {FunctionFactory}
     */
    this.functionFactory = functionFactory;
    /**
     * @type {FunctionSpecFactory}
     */
    this.functionSpecFactory = functionSpecFactory;
    /**
     * @type {Flow}
     */
    this.flow = flow;
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
    /**
     * Creates a new Namespace.
     *
     * @param {Namespace|null} parentNamespace
     * @param {string|null} name
     * @returns {Namespace}
     */
    create: function (parentNamespace, name) {
        var factory = this;

        return new factory.Namespace(
            factory.callStack,
            factory.flow,
            factory.valueFactory,
            factory,
            factory.functionFactory,
            factory.functionSpecFactory,
            factory.classAutoloader,
            factory.classDefiner,
            parentNamespace || null,
            name || ''
        );
    }
});

module.exports = NamespaceFactory;
