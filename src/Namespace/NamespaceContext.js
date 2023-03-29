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
    Exception = phpCommon.Exception;

/**
 * Manages the currently entered and effective NamespaceScopes.
 *
 * @param {Environment} environment
 * @constructor
 */
function NamespaceContext(environment) {
    /**
     * @type {NamespaceScope|null}
     */
    this.effectiveNamespaceScope = null;
    /**
     * @type {NamespaceScope|null}
     */
    this.enteredNamespaceScope = null;
    /**
     * @type {Environment}
     */
    this.environment = environment;
    /**
     * @type {NamespaceScope[]}
     */
    this.namespaceScopeStack = [];
}

_.extend(NamespaceContext.prototype, {
    /**
     * Enters a NamespaceScope, making it the current one.
     *
     * @param {NamespaceScope} namespaceScope
     */
    enterNamespaceScope: function (namespaceScope) {
        var context = this;

        context.namespaceScopeStack.push({
            enteredNamespaceScope: context.enteredNamespaceScope,
            effectiveNamespaceScope: context.effectiveNamespaceScope
        });
        context.enteredNamespaceScope = namespaceScope;
        context.effectiveNamespaceScope = namespaceScope;
    },

    /**
     * Fetches the effective NamespaceScope. Note that this may be different from the entered one,
     * e.g. when .useDescendantNamespaceScope(...) has been used.
     *
     * @returns {NamespaceScope}
     */
    getEffectiveNamespaceScope: function () {
        return this.effectiveNamespaceScope;
    },

    /**
     * Fetches the entered NamespaceScope. Note that this may not be the effective one,
     * e.g. when .useDescendantNamespaceScope(...) has been used.
     *
     * @returns {NamespaceScope}
     */
    getEnteredNamespaceScope: function () {
        return this.enteredNamespaceScope;
    },

    /**
     * Fetches the Environment.
     *
     * @returns {Environment}
     */
    getEnvironment: function () {
        return this.environment;
    },

    /**
     * Fetches the current depth of the NamespaceScope stack.
     *
     * @returns {number}
     */
    getNamespaceScopeStackDepth: function () {
        return this.namespaceScopeStack.length;
    },

    /**
     * Fetches a human-readable string representing the path to the current script file.
     *
     * @returns {string}
     */
    getNormalisedPath: function () {
        var path = this.effectiveNamespaceScope.getFilePath();

        return path !== null ? path : '(program)';
    },

    /**
     * Leaves the current NamespaceScope, returning to the previous one.
     *
     * @param {NamespaceScope} namespaceScope
     */
    leaveNamespaceScope: function (namespaceScope) {
        var context = this,
            previousState;

        if (context.namespaceScopeStack.length === 0) {
            throw new Exception('leaveNamespaceScope() :: NamespaceScope stack is empty');
        }

        if (context.enteredNamespaceScope !== namespaceScope) {
            throw new Exception('leaveNamespaceScope() :: Incorrect NamespaceScope provided');
        }

        previousState = context.namespaceScopeStack.pop();

        context.enteredNamespaceScope = previousState.enteredNamespaceScope;
        context.effectiveNamespaceScope = previousState.effectiveNamespaceScope;
    },

    /**
     * Restores a state previously exported by .save().
     *
     * @param {Object} previousState
     */
    restore: function (previousState) {
        var context = this;

        context.enteredNamespaceScope = previousState.enteredNamespaceScope;
        context.effectiveNamespaceScope = previousState.effectiveNamespaceScope;
        context.namespaceScopeStack = previousState.namespaceScopeStack;
    },

    /**
     * Exports the current state of the context for later restore, clearing it.
     *
     * @returns {Object}
     */
    save: function () {
        var context = this,
            state = {
                enteredNamespaceScope: context.enteredNamespaceScope,
                effectiveNamespaceScope: context.effectiveNamespaceScope,
                namespaceScopeStack: context.namespaceScopeStack
            };

        context.enteredNamespaceScope = null;
        context.effectiveNamespaceScope = null;
        context.namespaceScopeStack = [];

        return state;
    },

    /**
     * Creates a NamespaceScope for the given descendant namespace of this one, switching to it.
     *
     * @param {string} name
     * @returns {NamespaceScope}
     */
    useDescendantNamespaceScope: function (name) {
        var context = this,
            module = context.enteredNamespaceScope.getModule(),
            topLevelNamespaceScope = module.getTopLevelNamespaceScope(),
            descendantNamespaceScope = topLevelNamespaceScope.getDescendant(name);

        // Leave the entered NamespaceScope unchanged.
        context.effectiveNamespaceScope = descendantNamespaceScope;

        return descendantNamespaceScope;
    },

    /**
     * Creates a NamespaceScope for the global namespace, switching to it.
     */
    useGlobalNamespaceScope: function () {
        var context = this,
            module = context.effectiveNamespaceScope.getModule(),
            namespaceScope = module.getTopLevelNamespaceScope();

        // Leave the entered NamespaceScope unchanged.
        context.effectiveNamespaceScope = namespaceScope;

        return namespaceScope;
    }
});

module.exports = NamespaceContext;
