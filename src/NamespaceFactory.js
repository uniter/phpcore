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
 * @param {Flow} flow
 * @param {FunctionFactory} functionFactory
 * @param {FunctionSpecFactory} functionSpecFactory
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @param {ClassAutoloader} classAutoloader
 * @param {ExportRepository} exportRepository
 * @param {FFIFactory} ffiFactory
 * @constructor
 */
function NamespaceFactory(
    Namespace,
    callStack,
    flow,
    functionFactory,
    functionSpecFactory,
    valueFactory,
    referenceFactory,
    classAutoloader,
    exportRepository,
    ffiFactory
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
     * @type {ExportRepository}
     */
    this.exportRepository = exportRepository;
    /**
     * @type {FFIFactory}
     */
    this.ffiFactory = ffiFactory;
    /**
     * @type {Flow}
     */
    this.flow = flow;
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
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(NamespaceFactory.prototype, {
    /**
     * Creates a new Namespace
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
            factory.referenceFactory,
            factory,
            factory.functionFactory,
            factory.functionSpecFactory,
            factory.classAutoloader,
            factory.exportRepository,
            factory.ffiFactory,
            parentNamespace || null,
            name || ''
        );
    }
});

module.exports = NamespaceFactory;
