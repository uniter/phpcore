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
 * Represents a stack frame on the call stack.
 *
 * @param {Scope} scope
 * @param {NamespaceScope} namespaceScope NamespaceScope the call was made in
 * @param {Trace} trace
 * @param {InstrumentationFactory} instrumentationFactory
 * @param {Value[]} args
 * @param {Class|null} newStaticClass
 * @constructor
 */
function Call(
    scope,
    namespaceScope,
    trace,
    instrumentationFactory,
    args,
    newStaticClass
) {
    /**
     * @type {Value[]}
     */
    this.args = args;
    /**
     * @type {NamespaceScope}
     */
    this.effectiveNamespaceScope = namespaceScope;
    /**
     * @type {NamespaceScope|null}
     */
    this.enteredNamespaceScope = null;
    /**
     * @type {number|null}
     */
    this.entryLineNumber = null;
    /**
     * @type {number|null}
     */
    this.exitLineNumber = null;
    /**
     * @type {Function|null}
     */
    this.finder = null;
    /**
     * @type {ObjectValue<Generator>|null}
     */
    this.generator = null;
    /**
     * @type {InstrumentationFactory}
     */
    this.instrumentationFactory = instrumentationFactory;
    /**
     * @type {Object[]}
     */
    this.isolatedCallStack = [];
    /**
     * @type {Class|null}
     */
    this.newStaticClass = newStaticClass;
    /**
     * @type {NamespaceScope}
     */
    this.originalNamespaceScope = namespaceScope;
    /**
     * @type {Scope}
     */
    this.scope = scope;
    /**
     * @type {Trace}
     */
    this.trace = trace;
}

_.extend(Call.prototype, {
    /**
     * Enables strict-types mode for the module this call was performed in.
     */
    enableStrictTypes: function () {
        this.originalNamespaceScope.enableStrictTypes();
    },

    /**
     * Enters an isolated call within this outer one, making the given NamespaceScope
     * and CallInstrumentation the current ones.
     *
     * @param {NamespaceScope} namespaceScope
     * @param {CallInstrumentation} instrumentation
     */
    enterIsolatedCall: function (namespaceScope, instrumentation) {
        var call = this;

        call.isolatedCallStack.push({
            enteredNamespaceScope: call.enteredNamespaceScope,
            effectiveNamespaceScope: call.effectiveNamespaceScope,
            finder: call.finder
        });
        call.enteredNamespaceScope = namespaceScope;
        call.effectiveNamespaceScope = namespaceScope;
        call.entryLineNumber = call.finder ? call.finder() : null;
        call.finder = instrumentation.getFinder();
        call.exitLineNumber = null;
    },

    /**
     * Fetches the current class for the call, if any
     *
     * @returns {Class|null}
     */
    getCurrentClass: function () {
        return this.scope.getCurrentClass();
    },

    /**
     * Fetches the effective NamespaceScope. Note that this may be different from the entered or isolated sub-call,
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
     * @returns {NamespaceScope|null}
     */
    getEnteredNamespaceScope: function () {
        return this.enteredNamespaceScope;
    },

    /**
     * Fetches the effective file path of this call.
     *
     * @returns {string|null}
     */
    getFilePath: function () {
        return this.effectiveNamespaceScope.getFilePath();
    },

    /**
     * Fetches the Value objects passed as arguments to the called function
     *
     * @returns {Value[]}
     */
    getFunctionArgs: function () {
        return this.args;
    },

    /**
     * Fetches the name of the current function
     *
     * @returns {string}
     */
    getFunctionName: function () {
        return this.scope.getTraceFrameName();
    },

    /**
     * Fetches the Generator instance for this call.
     *
     * @returns {ObjectValue<Generator>}
     */
    getGenerator: function () {
        var call = this;

        if (!call.generator) {
            throw new Exception('Call.getGenerator() :: Current call is not a generator');
        }

        return call.generator;
    },

    /**
     * Fetches the CallInstrumentation for this call.
     *
     * @returns {CallInstrumentation}
     */
    getInstrumentation: function () {
        var call = this;

        // Lazily create the CallInstrumentation only when needed.
        // TODO: Cache in case of repeated calls, e.g. multiple class definitions in one module?
        return call.instrumentationFactory.createCallInstrumentation(call.finder);
    },

    /**
     * Fetches the current depth of the isolated call stack within this call.
     *
     * @returns {number}
     */
    getIsolatedCallStackDepth: function () {
        return this.isolatedCallStack.length;
    },

    /**
     * Fetches the number of the last line executed inside this call's scope.
     *
     * @returns {number|null}
     */
    getLastLine: function () {
        var call = this,
            latestLineNumber;

        if (!call.finder) {
            return null;
        }

        latestLineNumber = call.finder();

        if (call.exitLineNumber !== null) {
            if (latestLineNumber === call.exitLineNumber) {
                return call.entryLineNumber;
            }

            call.entryLineNumber = null;
            call.exitLineNumber = null;
        }

        return latestLineNumber;
    },

    /**
     * Fetches the effective module of this call.
     *
     * @returns {Module}
     */
    getModule: function () {
        return this.effectiveNamespaceScope.getModule();
    },

    /**
     * Fetches the original NamespaceScope of this call, i.e. not the entered one
     * if there is an isolated call active.
     *
     * Note that this may not be the effective one,
     * e.g. when .enterIsolatedCall(...) or .useDescendantNamespaceScope(...) have been used.
     *
     * @returns {NamespaceScope}
     */
    getOriginalNamespaceScope: function () {
        return this.originalNamespaceScope;
    },

    /**
     * Fetches the scope inside the called function
     *
     * @returns {Scope}
     */
    getScope: function () {
        return this.scope;
    },

    /**
     * Fetches the static class introduced by this call's scope. If null,
     * the call was a forwarding call, and so the parent call's static class should be used
     *
     * @returns {Class|null}
     */
    getStaticClass: function () {
        var call = this,
            thisObject = call.scope.getThisObject();

        if (thisObject && thisObject.getType() !== 'null') {
            return thisObject.getClass();
        }

        return call.newStaticClass;
    },

    /**
     * Fetches the ObjectValue that is the current `$this` object, if any
     *
     * @returns {ObjectValue|null}
     */
    getThisObject: function () {
        return this.scope.getThisObject();
    },

    /**
     * Fetches the Trace for this call.
     *
     * @returns {Trace}
     */
    getTrace: function () {
        return this.trace;
    },

    /**
     * Fetches the effective path of this call, suitable for stack traces (so without any eval context).
     *
     * @returns {string|null}
     */
    getTraceFilePath: function () {
        var call = this;

        return call.scope.getFilePath(call.effectiveNamespaceScope.getFilePath());
    },

    /**
     * Registers a finder for looking up the current/last line number inside the called function.
     *
     * @param {Function} finder
     */
    instrument: function (finder) {
        this.finder = finder;
    },

    /**
     * Determines whether the module this call was performed in is in strict-types mode.
     *
     * @returns {boolean}
     */
    isStrictTypesMode: function () {
        return this.originalNamespaceScope.isStrictTypesMode();
    },

    /**
     * Determines whether this call is to a userland function (defined inside PHP-land) or not.
     *
     * @returns {boolean}
     */
    isUserland: function () {
        // If the called function was defined inside the "invisible" global namespace scope,
        // then it was defined in JS-land either as a built-in or was consumer-provided.
        return !this.originalNamespaceScope.isGlobal();
    },

    /**
     * Leaves the current isolated call, returning to the previous one (or the original).
     *
     * @param {NamespaceScope} namespaceScope
     * @param {CallInstrumentation} instrumentation
     */
    leaveIsolatedCall: function (namespaceScope, instrumentation) {
        var call = this,
            previousState;

        if (call.isolatedCallStack.length === 0) {
            throw new Exception('Call.leaveIsolatedCall() :: NamespaceScope stack is empty');
        }

        if (call.enteredNamespaceScope !== namespaceScope) {
            throw new Exception('Call.leaveIsolatedCall() :: Incorrect NamespaceScope provided');
        }

        if (call.finder !== instrumentation.getFinder()) {
            throw new Exception('Call.leaveIsolatedCall() :: Incorrect CallInstrumentation provided');
        }

        previousState = call.isolatedCallStack.pop();

        call.enteredNamespaceScope = previousState.enteredNamespaceScope;
        call.effectiveNamespaceScope = previousState.effectiveNamespaceScope;
        call.finder = previousState.finder;
        call.exitLineNumber = call.finder ? call.finder() : null;
    },

    /**
     * Resumes this paused call's Trace with the given result value.
     *
     * @param {*} resultValue
     */
    resume: function (resultValue) {
        this.trace.resume(resultValue);
    },

    /**
     * Sets the Generator instance for this call.
     *
     * @param {ObjectValue<Generator>} generator
     */
    setGenerator: function (generator) {
        this.generator = generator;
    },

    /**
     * Overrides the Trace for this call. Returns the original Trace.
     *
     * @param {Trace} trace
     * @returns {Trace}
     */
    setTrace: function (trace) {
        var call = this,
            originalTrace = call.trace;

        call.trace = trace;

        return originalTrace;
    },

    /**
     * Determines whether all errors should be suppressed for this call
     *
     * @returns {boolean}
     */
    suppressesErrors: function () {
        return this.scope.suppressesErrors();
    },

    /**
     * Determines whether own errors should be suppressed for this call
     *
     * @returns {boolean}
     */
    suppressesOwnErrors: function () {
        return this.scope.suppressesOwnErrors();
    },

    /**
     * Throws the given error into this paused call's Trace.
     *
     * @param {Error} error
     */
    throwInto: function (error) {
        this.trace.throwInto(error);
    },

    /**
     * Creates a NamespaceScope for the given descendant namespace of this one, switching to it.
     *
     * @param {string} name
     * @returns {NamespaceScope}
     */
    useDescendantNamespaceScope: function (name) {
        var call = this,
            module = call.originalNamespaceScope.getModule(),
            topLevelNamespaceScope = module.getTopLevelNamespaceScope(),
            descendantNamespaceScope = topLevelNamespaceScope.getDescendant(name);

        if (call.enteredNamespaceScope !== null) {
            throw new Exception('Call.useDescendantNamespaceScope() :: Cannot be inside an isolated call');
        }

        // Leave the entered NamespaceScope unchanged.
        call.effectiveNamespaceScope = descendantNamespaceScope;

        return descendantNamespaceScope;
    },

    /**
     * Fetches the NamespaceScope for the global namespace, switching to it.
     *
     * @returns {NamespaceScope}
     */
    useGlobalNamespaceScope: function () {
        var call = this,
            module = call.originalNamespaceScope.getModule(),
            namespaceScope = module.getTopLevelNamespaceScope();

        if (call.enteredNamespaceScope !== null) {
            throw new Exception('Call.useGlobalNamespaceScope() :: Cannot be inside an isolated call');
        }

        // Leave the entered NamespaceScope unchanged.
        call.effectiveNamespaceScope = namespaceScope;

        return namespaceScope;
    }
});

module.exports = Call;
