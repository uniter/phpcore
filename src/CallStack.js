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
    Exception = phpCommon.Exception,
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
     * Clears the current stack state.
     */
    clear: function () {
        this.calls.length = 0;
    },

    /**
     * Enables strict-types mode for the module of the current call.
     */
    enableStrictTypes: function () {
        // Note that when enabling, we enable strict-types mode for the callee's module and not the caller's,
        // unlike when checking, where we check the caller instead.
        var call = this.getUserlandCallee();

        if (!call) {
            throw new Exception('CallStack.enableStrictTypes() :: No userland callee');
        }

        call.enableStrictTypes();
    },

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
     * or the current value being evaluated, if any.
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
     * Fetches the class that defines the current function being executed
     * or the current value being evaluated, if any.
     *
     * @returns {Trait|null}
     */
    getCurrentTrait: function () {
        var chain = this,
            call = chain.getCurrent();

        if (!call) {
            return null;
        }

        return call.getCurrentTrait();
    },

    /**
     * Fetches the CallInstrumentation for the current call.
     *
     * @returns {CallInstrumentation}
     */
    getCurrentInstrumentation: function () {
        var callStack = this,
            currentCall = callStack.getCurrent();

        if (!currentCall) {
            throw new Exception('CallStack.getCurrentInstrumentation() :: No current call');
        }

        return currentCall.getInstrumentation();
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
     * Fetches the scope of the current call
     *
     * @returns {Scope|null}
     */
    getCurrentScope: function () {
        var currentCall = this.getCurrent();

        return currentCall ? currentCall.getScope() : null;
    },

    /**
     * Fetches the control trace for the current call
     *
     * @returns {Trace}
     */
    getCurrentTrace: function () {
        var currentCall = this.getCurrent();

        if (currentCall === null) {
            throw new Exception('CallStack.getCurrentTrace() :: No current call');
        }

        return currentCall.getTrace();
    },

    /**
     * Fetches the effective NamespaceScope for the current call.
     *
     * @returns {NamespaceScope}
     */
    getEffectiveNamespaceScope: function () {
        var callStack = this,
            currentCall = callStack.getCurrent();

        if (!currentCall) {
            throw new Exception('CallStack.getEffectiveNamespaceScope() :: No current call');
        }

        return currentCall.getEffectiveNamespaceScope();
    },

    /**
     * Fetches the Generator instance for the current call.
     *
     * @returns {ObjectValue<Generator>|null}
     */
    getGenerator: function () {
        var call = this.getUserlandCallee();

        if (!call) {
            throw new Exception('CallStack.getGenerator() :: No userland callee');
        }

        return call.getGenerator();
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
     * Fetches a call stack trace array, with one element for each stack frame (call).
     *
     * @param {boolean=} skipCurrentStackFrame
     * @returns {{index: number, file: string, line: number, func: function, args: *[]}[]}
     */
    getTrace: function (skipCurrentStackFrame) {
        var call,
            callStack = this,
            skipCount = skipCurrentStackFrame ? 1 : 0,
            effectiveCallCount = callStack.calls.length - skipCount,
            index,
            trace = [],
            chronoIndex = callStack.calls.length - 2 - skipCount;

        /**
         * Fetches the path to the file the call was made from.
         *
         * @param {number} index
         * @returns {string|null}
         */
        function getFilePath(index) {
            var caller = callStack.calls[index - 1],
                filePath = caller.getTraceFilePath(),
                ancestorCaller,
                ancestorIndex;

            if (filePath !== null) {
                return filePath;
            }

            for (ancestorIndex = index - 2; ancestorIndex >= 0; ancestorIndex--) {
                ancestorCaller = callStack.calls[ancestorIndex];

                if (!ancestorCaller.isUserland()) {
                    continue;
                }

                filePath = ancestorCaller.getTraceFilePath();

                if (filePath !== null) {
                    return filePath;
                }
            }

            return null;
        }

        /**
         * Fetches the line number the call _occurred on_, rather than the line
         * last executed inside the called function.
         *
         * @param {number} index
         * @returns {number|null}
         */
        function getLineNumber(index) {
            var caller = callStack.calls[index - 1],
                lineNumber = caller.getLastLine(),
                ancestorCaller,
                ancestorIndex;

            if (lineNumber !== null) {
                return lineNumber;
            }

            if (caller.getTraceFilePath() !== null) {
                // Leave line number unknown if we do have a file path,
                // otherwise the line number fetched may be unrelated.
                return null;
            }

            for (ancestorIndex = index - 2; ancestorIndex >= 0; ancestorIndex--) {
                ancestorCaller = callStack.calls[ancestorIndex];

                if (!ancestorCaller.isUserland()) {
                    continue;
                }

                lineNumber = ancestorCaller.getLastLine();

                if (lineNumber !== null) {
                    return lineNumber;
                }
            }

            return null;
        }

        for (index = 1; index < effectiveCallCount; index++) {
            call = callStack.calls[index];

            trace.unshift({
                // Most recent call should have index 0.
                index: chronoIndex--,
                file: getFilePath(index),
                line: getLineNumber(index),
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

        throw new Exception('Could not find a valid userland callee');
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

        throw new Exception('Could not find a valid userland caller');
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
     * Determines whether the module of the caller is in strict-types mode.
     *
     * @returns {boolean}
     */
    isStrictTypesMode: function () {
        // Note use of .getUserlandCallee() and not .getUserlandCaller()
        // because at the point this is checked, the callee has not been pushed onto the stack.
        var call = this.getUserlandCallee();

        if (!call) {
            throw new Exception('CallStack.isStrictTypesMode() :: No userland callee');
        }

        return call.isStrictTypesMode();
    },

    /**
     * Determines whether or not the current stack frame is a userland PHP function.
     *
     * @returns {boolean}
     */
    isUserland: function () {
        var callStack = this;

        return callStack.calls[callStack.calls.length - 1].isUserland();
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
     * Raises a catchable Error or a notice/warning with the specified level, message translation key and variables.
     *
     * @param {string} level One of the PHPError.E_* constants, eg. `PHPError.E_WARNING`
     * @param {string} translationKey
     * @param {Object.<string, string>=} placeholderVariables
     * @param {string=} errorClass
     * @param {boolean=} reportsOwnContext Whether the error handles reporting its own file/line context
     * @param {string=} filePath
     * @param {number=} lineNumber
     * @param {string=} contextTranslationKey
     * @param {Object.<string, string>=} contextPlaceholderVariables
     * @param {boolean=} skipCurrentStackFrame
     * @throws {ObjectValue} Throws an ObjectValue-wrapped Throwable if not a notice or warning
     */
    raiseTranslatedError: function (
        level,
        translationKey,
        placeholderVariables,
        errorClass,
        reportsOwnContext,
        filePath,
        lineNumber,
        contextTranslationKey,
        contextPlaceholderVariables,
        skipCurrentStackFrame
    ) {
        var callStack = this,
            message = callStack.translator.translate(translationKey, placeholderVariables),
            context = contextTranslationKey ?
                callStack.translator.translate(contextTranslationKey, contextPlaceholderVariables) :
                '';

        if (level === PHPError.E_ERROR) {
            // Non-warning/non-notice errors need to actually stop execution
            // NB: The Error class' constructor will fetch file and line number info.
            throw callStack.valueFactory.createErrorObject(
                errorClass || 'Error',
                message,
                null,
                null,
                filePath,
                lineNumber,
                reportsOwnContext,
                context,
                skipCurrentStackFrame
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
            stack.calls.length = 0;
        }

        if (savedCalls.length > 0) {
            [].push.apply(stack.calls, savedCalls);
        }
    },

    /**
     * Resumes with a given resume value.
     *
     * @param {*} resumeValue
     */
    resume: function (resumeValue) {
        // Set up ready to be resumed from the top stack frame.
        var call = this.getUserlandCallee();

        if (!call) {
            throw new Exception('CallStack.resume() :: Cannot resume when there is no userland callee');
        }

        call.resume(resumeValue);
    },

    /**
     * Fetches a copy of the current stack state without clearing it.
     *
     * @returns {Call[]}
     */
    save: function () {
        return this.calls.slice();
    },

    /**
     * Resumes with a given error to throw.
     *
     * @param {Error} error
     */
    throwInto: function (error) {
        // Set up ready to be resumed from the top stack frame.
        var call = this.getUserlandCallee();

        if (!call) {
            throw new Exception('CallStack.throwInto() :: Cannot throw-resume when there is no userland callee');
        }

        call.throwInto(error);
    },

    /**
     * Creates a NamespaceScope for the given descendant namespace of the current one, switching to it.
     *
     * @param {string} name
     * @returns {NamespaceScope}
     */
    useDescendantNamespaceScope: function (name) {
        var callStack = this,
            currentCall = callStack.getCurrent();

        if (!currentCall) {
            throw new Exception('CallStack.useDescendantNamespaceScope() :: No current call');
        }

        return currentCall.useDescendantNamespaceScope(name);
    },

    /**
     * Fetches the NamespaceScope for the global namespace, switching to it.
     *
     * @returns {NamespaceScope}
     */
    useGlobalNamespaceScope: function () {
        var callStack = this,
            currentCall = callStack.getCurrent();

        if (!currentCall) {
            throw new Exception('CallStack.useGlobalNamespaceScope() :: No current call');
        }

        return currentCall.useGlobalNamespaceScope();
    }
});

module.exports = CallStack;
