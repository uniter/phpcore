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
 * @param {class} EngineScope
 * @param {class} LoadScope
 * @param {class} Scope
 * @param {class} NamespaceScope
 * @param {CallStack} callStack
 * @param {ControlScope} controlScope
 * @param {Translator} translator
 * @param {SuperGlobalScope} superGlobalScope
 * @param {FunctionSpecFactory} functionSpecFactory
 * @param {ValueFactory} valueFactory
 * @param {VariableFactory} variableFactory
 * @param {ReferenceFactory} referenceFactory
 * @constructor
 */
function ScopeFactory(
    EngineScope,
    LoadScope,
    Scope,
    NamespaceScope,
    callStack,
    controlScope,
    translator,
    superGlobalScope,
    functionSpecFactory,
    valueFactory,
    variableFactory,
    referenceFactory
) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {ClosureFactory}
     */
    this.closureFactory = null;
    /**
     * @type {ControlScope}
     */
    this.controlScope = controlScope;
    /**
     * @type {class}
     */
    this.EngineScope = EngineScope;
    /**
     * @type {FunctionSpecFactory}
     */
    this.functionSpecFactory = functionSpecFactory;
    /**
     * @type {Namespace}
     */
    this.globalNamespace = null;
    /**
     * @type {Scope}
     */
    this.globalScope = null;
    /**
     * @type {class}
     */
    this.LoadScope = LoadScope;
    /**
     * @type {class}
     */
    this.NamespaceScope = NamespaceScope;
    /**
     * @type {ReferenceFactory}
     */
    this.referenceFactory = referenceFactory;
    /**
     * @type {class}
     */
    this.Scope = Scope;
    /**
     * @type {SuperGlobalScope}
     */
    this.superGlobalScope = superGlobalScope;
    /**
     * @type {Translator}
     */
    this.translator = translator;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
    /**
     * @type {VariableFactory}
     */
    this.variableFactory = variableFactory;
}

_.extend(ScopeFactory.prototype, {
    /**
     * Creates a new Scope
     *
     * @param {Class|null=} currentClass
     * @param {Function|null=} currentFunction
     * @param {ObjectValue|null=} thisObject
     * @returns {Scope}
     */
    create: function (currentClass, currentFunction, thisObject) {
        var factory = this;

        return new factory.Scope(
            factory.callStack,
            factory.translator,
            factory.globalScope,
            factory.superGlobalScope,
            factory.closureFactory,
            factory.functionSpecFactory,
            factory.valueFactory,
            factory.variableFactory,
            factory.referenceFactory,
            factory.controlScope,
            factory.controlScope.inCoroutine() ? factory.controlScope.getCoroutine() : null,
            currentClass || null,
            currentFunction || null,
            thisObject || null
        );
    },

    /**
     * Creates a new EngineScope.
     *
     * @param {Scope} effectiveScope
     * @returns {EngineScope}
     */
    createEngineScope: function (effectiveScope) {
        var factory = this;

        return new factory.EngineScope(
            effectiveScope,
            factory.controlScope,
            effectiveScope.getCoroutine()
        );
    },

    /**
     * Creates a new LoadScope
     *
     * @param {Scope} effectiveScope
     * @param {string} callerFilePath
     * @param {string} type The type of load, eg. `eval` or `include`
     * @returns {LoadScope}
     */
    createLoadScope: function (effectiveScope, callerFilePath, type) {
        var factory = this;

        return new factory.LoadScope(factory.valueFactory, effectiveScope, callerFilePath, type);
    },

    /**
     * Creates a new NamespaceScope
     *
     * @param {Namespace} namespace
     * @param {Module} module
     * @param {boolean=} global
     * @returns {NamespaceScope}
     */
    createNamespaceScope: function (namespace, module, global) {
        var factory = this;

        return new factory.NamespaceScope(
            factory,
            factory.globalNamespace,
            factory.valueFactory,
            factory.callStack,
            module,
            namespace,
            Boolean(global)
        );
    },

    /**
     * Sets the ClosureFactory service to pass to Scopes created by this factory
     *
     * @param {ClosureFactory} closureFactory
     */
    setClosureFactory: function (closureFactory) {
        this.closureFactory = closureFactory;
    },

    /**
     * Sets the global Namespace
     *
     * @param {Namespace} globalNamespace
     */
    setGlobalNamespace: function (globalNamespace) {
        this.globalNamespace = globalNamespace;
    },

    /**
     * Sets the global Scope to pass to Scopes created by this factory
     *
     * @param {Scope} globalScope
     */
    setGlobalScope: function (globalScope) {
        this.globalScope = globalScope;
    }
});

module.exports = ScopeFactory;
