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
 * @param {class} Tools
 * @param {CallStack} callStack
 * @param {Translator} translator
 * @param {GlobalNamespace} globalNamespace
 * @param {Loader} loader
 * @param {Includer} includer
 * @param {OnceIncluder} onceIncluder
 * @param {ReferenceFactory} referenceFactory
 * @param {ScopeFactory} scopeFactory
 * @param {ValueFactory} valueFactory
 * @constructor
 */
function ToolsFactory(
    Tools,
    callStack,
    translator,
    globalNamespace,
    loader,
    includer,
    onceIncluder,
    referenceFactory,
    scopeFactory,
    valueFactory
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {GlobalNamespace}
     */
    this.globalNamespace = globalNamespace;
    /**
     * @type {Includer}
     */
    this.includer = includer;
    /**
     * @type {Loader}
     */
    this.loader = loader;
    /**
     * @type {OnceIncluder}
     */
    this.onceIncluder = onceIncluder;
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
    /**
     * @type {ScopeFactory}
     */
    this.scopeFactory = scopeFactory;
    /**
     * @type {class}
     */
    this.Tools = Tools;
    /**
     * @type {Translator}
     */
    this.translator = translator;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(ToolsFactory.prototype, {
    /**
     * Creates a new Tools instance
     *
     * @param {Environment} environment
     * @param {Module} module PHP module
     * @param {NamespaceScope} topLevelNamespaceScope
     * @param {Scope} topLevelScope
     * @param {Object} options
     * @returns {Tools}
     */
    create: function (
        environment,
        module,
        topLevelNamespaceScope,
        topLevelScope,
        options
    ) {
        var factory = this;

        return new factory.Tools(
            factory.callStack,
            environment,
            factory.translator,
            factory.globalNamespace,
            factory.loader,
            factory.includer,
            factory.onceIncluder,
            module,
            options,
            factory.referenceFactory,
            factory.scopeFactory,
            topLevelNamespaceScope,
            topLevelScope,
            factory.valueFactory
        );
    }
});

module.exports = ToolsFactory;
