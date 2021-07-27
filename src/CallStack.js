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
    PHPError = phpCommon.PHPError,
    PHPFatalError = phpCommon.PHPFatalError;

/**
 * @param {ValueFactory} valueFactory
 * @param {Translator} translator
 * @param {ErrorReporting} errorReporting
 * @constructor
 */
function CallStack(valueFactory, translator, errorReporting) {
    /**
     * @type {Call[]}
     */
    this.calls = [];
    /**
     * @type {ErrorReporting}
     */
    this.errorReporting = errorReporting;
    /**
     * @type {Translator}
     */
    this.translator = translator;
    /**
     * @type {ValueFactory}
     */
    this.valueFactory = valueFactory;
}

_.extend(CallStack.prototype, {
    /**
     * Fetches the previous Call near the top of the stack, or null if none
     *
     * @returns {Call|null}
     */
    getCaller: function () {
        var chain = this;

        return chain.calls[chain.calls.length - 2] || null;
    },

    /**
     * Fetches the path to the file containing the last line of code executed
     *
     * @returns {string|null}
     */
    getCallerFilePath: function () {
        var caller = this.getUserlandCaller();

        return caller ? caller.getFilePath() : null;
    },

    /**
     * Fetches the number of the last line of code executed in the caller
     *
     * @returns {number|null}
     */
    getCallerLastLine: function () {
        var caller = this.getUserlandCaller();

        return caller ? caller.getLastLine() : null;
    },

    /**
     * Fetches the scope of the previous Call near the top of the stack, or null if none
     *
     * @returns {Scope|null}
     */
    getCallerScope: function () {
        var chain = this,
            callerCall = chain.calls[chain.calls.length - 2] || null;

        return callerCall ? callerCall.getScope() : null;
    },

    /**
     * Fetches the current Call on the top of the stack, or null if none
     *
     * @returns {Call|null}
     */
    getCurrent: function () {
        var chain = this;

        return chain.calls[chain.calls.length - 1] || null;
    },

    /**
     * Fetches the class that defines the current function being executed
     *
     * @returns {Class|null}
     */
    getCurrentClass: function () {
        var chain = this,
            call = chain.getCurrent();

        if (!call) {
            return null;
        }

        return call.getCurrentClass();
    },

    /**
     * Fetches the module of the current call
     *
     * @returns {Module|null}
     */
    getCurrentModule: function () {
        return this.getCurrent().getModule();
    },

    /**
     * Fetches the module scope of the current call
     *
     * @returns {ModuleScope}
     */
    getCurrentModuleScope: function () {
        return this.getCurrent().getModuleScope();
    },

    /**
     * Fetches the current NamespaceScope of the ModuleScope of the current call
     *
     * @returns {NamespaceScope}
     */
    getCurrentNamespaceScope: function () {
        var stack = this,
            currentCall = stack.getCurrent(),
            currentCallNamespaceScope = currentCall.getNamespaceScope(),
            moduleScope;

        if (currentCallNamespaceScope.isGlobal()) {
            return currentCallNamespaceScope;
        }

        moduleScope = this.getCurrentModuleScope();

        if (currentCallNamespaceScope === moduleScope.getTopLevelNamespaceScope()) {
            // We are at the top level of a module, use the ModuleScope's current NamespaceScope
            return moduleScope.getCurrentNamespaceScope();
        }

        // Otherwise we are inside a nested scope, so use the NamespaceScope it was defined in
        return currentCallNamespaceScope;
    },

    /**
     * Fetches the scope of the current call
     *
     * @returns {Scope}
     */
    getCurrentScope: function () {
        return this.getCurrent().getScope();
    },

    getCurrentTrace: function () {
        var currentCall = this.getCurrent();

        if (currentCall === null) {
            throw new Error('CallStack.getCurrentTrace() :: No current call');
        }

        return currentCall.getTrace();
    },

    /**
     * Fetches the path to the file containing the last line of code executed
     *
     * @returns {string|null}
     */
    getLastFilePath: function () {
        var caller = this.getUserlandCallee();

        return caller ? caller.getFilePath() : null;
    },

    /**
     * Fetches the number of the last line of code executed
     *
     * @returns {number|null}
     */
    getLastLine: function () {
        var caller = this.getUserlandCallee();

        return caller ? caller.getLastLine() : null;
    },

    /**
     * Fetches the number of calls on the stack (stack depth)
     *
     * @returns {number}
     */
    getLength: function () {
        return this.calls.length;
    },

    /**
     * Fetches the class that is currently considered the static context,
     * referenced with static:: in PHP-land
     *
     * @returns {Class|null}
     */
    getStaticClass: function () {
        var call,
            callStack = this,
            index,
            newStaticClass,
            staticClass = null;

        for (index = callStack.calls.length - 1; index >= 0; index--) {
            call = callStack.calls[index];
            newStaticClass = call.getStaticClass();

            if (newStaticClass) {
                staticClass = newStaticClass;

                break;
            }
        }

        return staticClass;
    },

    /**
     * Fetches the ObjectValue that is the current `$this` object, if any
     *
     * @returns {ObjectValue|null}
     */
    getThisObject: function () {
        var currentCall = this.getCurrent();

        if (!currentCall) {
            return null;
        }

        return currentCall.getThisObject();
    },

    /**
     * Fetches a call stack trace array, with one element for each stack frame (call)
     *
     * @returns {{index: number, file: string, line: number, func: function, args: *[]}[]}
     */
    getTrace: function () {
        var call,
            callStack = this,
            index,
            trace = [],
            chronoIndex = callStack.calls.length - 2;

        for (index = 1; index < callStack.calls.length; index++) {
            call = callStack.calls[index];

            trace.unshift({
                // Most recent call should have index 0
                index: chronoIndex--,
                file: callStack.calls[index - 1].getTraceFilePath(),
                // Fetch the line number the call _occurred on_, rather than the line
                // last executed inside the called function
                line: callStack.calls[index - 1].getLastLine(),
                func: call.getFunctionName(),
                args: call.getFunctionArgs()
            });
        }

        return trace;
    },

    /**
     * Fetches the PHP-land call for the current stack frame. If we are currently
     * executing a built-in function called from a PHP method, the PHP method
     * would be the PHP-land (userland) caller.
     *
     * @returns {Call|null}
     */
    getUserlandCallee: function () {
        var call,
            callStack = this,
            index;

        if (callStack.calls.length === 0) {
            return null;
        }

        index = callStack.calls.length - 1;
        call = callStack.calls[index];

        do {
            if (call.isUserland() || index === 0) {
                return call;
            }

            call = callStack.calls[--index];
        } while (call);

        throw new Error('Could not find a valid userland callee');
    },

    /**
     * Fetches the PHP-land call for the current stack frame. If we are currently
     * executing a built-in function called from a PHP method, the PHP method
     * would be the PHP-land (userland) caller.
     *
     * @returns {Call|null}
     */
    getUserlandCaller: function () {
        var call,
            callStack = this,
            index;

        if (callStack.calls.length < 2) {
            return null;
        }

        index = callStack.calls.length - 2;
        call = callStack.calls[index];

        do {
            if (call.isUserland() || index === 0) {
                return call;
            }

            call = callStack.calls[--index];
        } while (call);

        throw new Error('Could not find a valid userland caller');
    },

    /**
     * Instruments the current call
     *
     * @param {function} finder
     */
    instrumentCurrent: function (finder) {
        this.getCurrent().instrument(finder);
    },

    /**
     * Removes the current call from the stack
     */
    pop: function () {
        this.calls.pop();
    },

    /**
     * Pushes a new current call onto the top of the stack
     *
     * @param {Call} call
     */
    push: function (call) {
        this.calls.push(call);
    },

    /**
     * Raises an error/warning with the specified level and message
     *
     * @TODO: Most places where this function is called provide built-in strings,
     *        which we should move to translations. An exception is trigger_error(...)'s user-provided messages
     * @param {string} level One of the PHPError.E_* constants, eg. `PHPError.E_WARNING`
     * @param {string} message String text message representing the error
     * @param {string=} errorClass
     * @param {boolean=} reportsOwnContext Whether the error handles reporting its own file/line context
     */
    raiseError: function (level, message, errorClass, reportsOwnContext) {
        var call,
            chain = this,
            calls = chain.calls,
            index;

        if (level === PHPError.E_ERROR) {
            // Throw an uncatchable fatal error (catchable errors must be thrown
            // via .raiseTranslatedError(...))
            throw new PHPFatalError(message, chain.getLastFilePath(), chain.getLastLine());
        }

        // Some constructs like isset(...) should only suppress errors
        // for their own scope
        call = chain.getCurrent();

        if (call && call.suppressesOwnErrors()) {
            return;
        }

        // Check whether any parent scope is set to suppress errors (eg. with the @-operator)
        for (index = calls.length - 1; index >= 0; --index) {
            call = calls[index];

            if (call.suppressesErrors()) {
                return;
            }
        }

        chain.errorReporting.reportError(
            level,
            message,
            chain.getLastFilePath(),
            chain.getLastLine(),
            chain.getTrace(),
            !!reportsOwnContext
        );
    },

    /**
     * Raises a catchable Error or a notice/warning with the specified level, message translation key and variables
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
    raiseTranslatedError: function (
        level,
        translationKey,
        placeholderVariables,
        errorClass,
        reportsOwnContext,
        filePath,
        lineNumber
    ) {
        var callStack = this,
            message = callStack.translator.translate(translationKey, placeholderVariables);

        if (level === PHPError.E_ERROR) {
            // Non-warning/non-notice errors need to actually stop execution
            // NB: The Error class' constructor will fetch file and line number info
            throw callStack.valueFactory.createErrorObject(
                errorClass || 'Error',
                message,
                null,
                null,
                filePath,
                lineNumber,
                reportsOwnContext
            );
        }

        callStack.raiseError(level, message, errorClass, reportsOwnContext);
    },

    /**
     * Raises an uncatchable PHP fatal error with the specified message translation key and variables
     *
     * @param {string} translationKey
     * @param {Object.<string, string>=} placeholderVariables
     * @throws {PHPFatalError} Throws an uncatchable PHPFatalError
     */
    raiseUncatchableFatalError: function (translationKey, placeholderVariables) {
        var callStack = this,
            message = callStack.translator.translate(translationKey, placeholderVariables);

        callStack.raiseError(PHPError.E_ERROR, message);
    },

    /**
     * Restores the stack from a paused state, ready to be resumed
     *
     * @param {Call[]} savedCalls
     */
    restore: function (savedCalls) {
        var stack = this;

        if (stack.calls.length > 0) {
            throw new Error('Cannot restore when not paused');
        }

        [].push.apply(stack.calls, savedCalls);

        // var stack = this;
        //
        // if (stack.calls.length > 0 && savedCalls.length > 0) {
        //     stack.calls.length = 0;
        // }
        //
        // [].push.apply(stack.calls, savedCalls);
    },

    /**
     * Resumes with a given resume value
     *
     * @param {*} resumeValue
     */
    resume: function (resumeValue) {
        // Set up ready to be resumed from the top stack frame
        var call = this.getUserlandCallee();

        if (!call) {
            throw new Error('CallStack.resume() :: Cannot resume when there is no userland callee');
        }

        call.resume(resumeValue);
    },

    /**
     * Pauses the current call stack, returning the current stack state
     * and clearing the stack contents
     *
     * @returns {Call[]}
     */
    save: function () {
        var stack = this,
            calls = stack.calls.slice();

        // Clear the current call stack
        stack.calls.length = 0;

        return calls;
    },

    /**
     * Resumes with a given error to throw
     *
     * @param {Error} error
     */
    throwInto: function (error) {
        // Set up ready to be resumed from the top stack frame
        var call = this.getUserlandCallee();

        if (!call) {
            throw new Error('CallStack.throwInto() :: Cannot throw-resume when there is no userland callee');
        }

        call.throwInto(error);
    }
});

module.exports = CallStack;
