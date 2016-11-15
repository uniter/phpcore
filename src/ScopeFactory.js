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
 * @param {class} Scope
 * @param {CallStack} callStack
 * @param {SuperGlobalScope} superGlobalScope
 * @param {ValueFactory} valueFactory
 * @param {ReferenceFactory} referenceFactory
 * @constructor
 */
function ScopeFactory(Scope, callStack, superGlobalScope, valueFactory, referenceFactory) {
    /**
     * @type {CallStack}
     */
    this.callStack = callStack;
    /**
     * @type {ClosureFactory}
     */
    this.closureFactory = null;
    /**
     * @type {Scope}
     */
    this.globalScope = null;
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
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(ScopeFactory.prototype, {
    /**
     * Creates a new Scope
     *
     * @param {NamespaceScope} namespaceScope
     * @param {Class|null} currentClass
     * @param {Function|null} currentFunction
     * @param {ObjectValue|null} thisObject
     * @returns {Scope}
     */
    create: function (namespaceScope, currentClass, currentFunction, thisObject) {
        var factory = this;

        return new factory.Scope(
            factory.callStack,
            factory.globalScope,
            factory.superGlobalScope,
            factory.closureFactory,
            factory.valueFactory,
            factory.referenceFactory,
            namespaceScope || null,
            currentClass || null,
            currentFunction || null,
            thisObject || null
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
     * Sets the global Scope to pass to Scopes created by this factory
     *
     * @param {Scope} globalScope
     */
    setGlobalScope: function (globalScope) {
        this.globalScope = globalScope;
    }
});

module.exports = ScopeFactory;
