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
 * Wraps a Scope having a load (eval, include etc.) performed from inside it
 *
 * @param {ValueFactory} valueFactory
 * @param {Scope} effectiveScope
 * @param {string} callerFilePath
 * @param {string} type The type of load, eg. `eval` or `include`
 * @constructor
 */
function LoadScope(valueFactory, effectiveScope, callerFilePath, type) {
    /**
     * @type {string}
     */
    this.callerFilePath = callerFilePath;
    /**
     * @type {Scope}
     */
    this.effectiveScope = effectiveScope;
    /**
     * @type {string}
     */
    this.type = type;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(LoadScope.prototype, {
    /**
     * Creates a closure, either static (with no `$this` object bound) or non-static
     *
     * @param {NamespaceScope} namespaceScope
     * @param {Function} func
     * @param {Array=} parametersSpecData
     * @param {boolean=} isStatic
     * @param {number|null=} lineNumber
     * @returns {Closure}
     */
    createClosure: function (namespaceScope, func, parametersSpecData, isStatic, lineNumber) {
        return this.effectiveScope.createClosure(
            namespaceScope,
            func,
            parametersSpecData,
            isStatic,
            lineNumber
        );
    },

    /**
     * Defines a variable with the given name in this scope
     *
     * @param {string} name
     * @returns {Variable}
     */
    defineVariable: function (name) {
        return this.effectiveScope.defineVariable(name);
    },

    /**
     * Defines one or more variables with the given names in this scope
     *
     * @param {string[]} names
     */
    defineVariables: function (names) {
        this.effectiveScope.defineVariables(names);
    },

    /**
     * Returns a hash with the values of all variables defined
     * for this scope, including all superglobals
     *
     * @returns {Object.<string, Value>}
     */
    exportVariables: function () {
        return this.effectiveScope.exportVariables();
    },

    /**
     * Defines a variable in the current scope with the given native value
     *
     * @param {Value} value
     * @param {string} name
     */
    expose: function (value, name) {
        this.effectiveScope.expose(value, name);
    },

    /**
     * Fetches the name of the current class, or an empty string if there is none
     *
     * @returns {StringValue}
     */
    getClassName: function () {
        return this.effectiveScope.getClassName();
    },

    /**
     * Fetches the name of the class in which this scope's function is defined
     *
     * @returns {StringValue}
     * @throws {PHPFatalError} When there is no current class scope
     */
    getClassNameOrThrow: function () {
        return this.effectiveScope.getClassNameOrThrow();
    },

    /**
     * Fetches the current class, if any
     *
     * @returns {Class|null}
     */
    getCurrentClass: function () {
        return this.effectiveScope.getCurrentClass();
    },

    /**
     * Fetches the current file path, taking eval or include into account
     *
     * @param {string|null} filePath
     * @returns {string|null}
     */
    getFilePath: function (filePath) {
        return filePath !== null ? filePath : this.callerFilePath;
    },

    /**
     * Fetches the current function name (used by eg. the magic __FUNCTION__ constant)
     *
     * @returns {StringValue}
     */
    getFunctionName: function () {
        // Eval/include contexts do not report the calling function, if any
        return this.valueFactory.createString('');
    },

    /**
     * Fetches the current method name (used by eg. the magic __METHOD__ constant)
     *
     * Note that this differs from .getFunctionName() when the current function is a method
     *
     * @returns {StringValue}
     */
    getMethodName: function () {
        // Eval/include contexts do not report the calling method, if any
        return this.valueFactory.createString('');
    },

    /**
     * Fetches the name of the parent of the current class in scope
     *
     * @returns {StringValue}
     * @throws {PHPFatalError} When there is no current class scope or current class has no parent
     */
    getParentClassNameOrThrow: function () {
        return this.effectiveScope.getParentClassNameOrThrow();
    },

    /**
     * Fetches the name of the current static class scope, which may be different
     * from the class in which its function is defined (eg. after a forward_static_call(...))
     *
     * @returns {StringValue}
     * @throws {PHPFatalError} When there is no static class scope
     */
    getStaticClassNameOrThrow: function () {
        return this.effectiveScope.getStaticClassNameOrThrow();
    },

    /**
     * Fetches the current object (the value of $this) if any
     *
     * @returns {ObjectValue|null}
     */
    getThisObject: function () {
        return this.effectiveScope.getThisObject();
    },

    /**
     * Fetches the current function or method name as used in stack traces
     *
     * Note that this differs from .getFunctionName() and .getMethodName()
     *
     * @returns {string}
     */
    getTraceFrameName: function () {
        return this.type;
    },

    /**
     * Fetches a variable for the current or super global scope,
     * implicitly defining it if needed
     *
     * @param {string} name
     * @returns {Variable}
     */
    getVariable: function (name) {
        return this.effectiveScope.getVariable(name);
    },

    /**
     * Imports a global variable into this scope by defining the variable
     * in this scope and setting its reference to point to the global one.
     *
     * @param {string} variableName
     */
    importGlobal: function (variableName) {
        this.effectiveScope.importGlobal(variableName);
    },

    /**
     * Imports a static variable into this scope by defining the variable
     * in this scope and setting its reference to point to the "static" one,
     * stored against the current function/method. The first time the variable
     * is declared, it will be assigned the initial value (if any).
     *
     * @param {string} variableName
     * @param {Value|null} initialValue
     */
    importStatic: function (variableName, initialValue) {
        this.effectiveScope.importStatic(variableName, initialValue);
    },

    /**
     * Whether this call scope is in a static context or not
     *
     * @returns {boolean}
     */
    isStatic: function () {
        return this.effectiveScope.isStatic();
    },

    /**
     * Raises a catchable Error or a notice/warning with the specified level, message translation key and variables,
     * scoped to the current function scope
     *
     * @param {string} level One of the PHPError.E_* constants, eg. `PHPError.E_WARNING`
     * @param {string} translationKey
     * @param {Object.<string, string>=} placeholderVariables
     * @param {string=} errorClass
     * @param {boolean=} reportsOwnContext Whether the error handles reporting its own file/line context
     * @param {string=} filePath
     * @param {number=} lineNumber
     * @throws {ObjectValue} Throws an ObjectValue-wrapped Throwable if not a notice or warning
     */
    raiseScopedTranslatedError: function (
        level,
        translationKey,
        placeholderVariables,
        errorClass,
        reportsOwnContext,
        filePath,
        lineNumber
    ) {
        this.effectiveScope.raiseScopedTranslatedError(
            level,
            translationKey,
            placeholderVariables,
            errorClass,
            reportsOwnContext,
            filePath,
            lineNumber
        );
    },

    /**
     * Suppresses errors for this and any descendant scopes
     */
    suppressErrors: function () {
        this.effectiveScope.suppressErrors();
    },

    /**
     * Suppresses errors for only this and not any descendant scopes
     */
    suppressOwnErrors: function () {
        this.effectiveScope.suppressOwnErrors();
    },

    /**
     * Determines whether errors have been suppressed for this and any descendant scopes
     *
     * @returns {boolean}
     */
    suppressesErrors: function () {
        return this.effectiveScope.suppressesErrors();
    },

    /**
     * Determines whether errors have been suppressed for this but not any descendant scopes
     *
     * @returns {boolean}
     */
    suppressesOwnErrors: function () {
        return this.effectiveScope.suppressesOwnErrors();
    },

    /**
     * Unsuppresses errors for this and any descendant scopes
     */
    unsuppressErrors: function () {
        this.effectiveScope.unsuppressErrors();
    },

    /**
     * Unsuppresses errors for this but not any descendant scopes
     */
    unsuppressOwnErrors: function () {
        this.effectiveScope.unsuppressOwnErrors();
    }
});

module.exports = LoadScope;
