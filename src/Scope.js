/*
 * PHPCore - PHP environment runtime components
 * Copyright (c) Dan Phillimore (asmblah)
 * https://github.com/uniter/phpcore/
 *
 * Released under the MIT license
 * https://github.com/uniter/phpcore/raw/master/MIT-LICENSE.txt
 */

'use strict';

module.exports = require('pauser')([
    require('microdash'),
    require('phpcommon')
], function (
    _,
    phpCommon
) {
    var hasOwn = {}.hasOwnProperty,
        IS_STATIC = 'isStatic',
        PHPError = phpCommon.PHPError,

        CANNOT_ACCESS_WHEN_NO_ACTIVE_CLASS = 'core.cannot_access_when_no_active_class',
        NO_PARENT_CLASS = 'core.no_parent_class',
        SCOPED_ERROR = 'core.scoped_error';

    /**
     * @param {CallStack} callStack
     * @param {Translator} translator
     * @param {Scope} globalScope
     * @param {SuperGlobalScope} superGlobalScope
     * @param {ClosureFactory} closureFactory
     * @param {FunctionSpecFactory} functionSpecFactory
     * @param {ValueFactory} valueFactory
     * @param {VariableFactory} variableFactory
     * @param {ReferenceFactory} referenceFactory
     * @param {Class|null} currentClass
     * @param {Function|null} currentFunction
     * @param {ObjectValue|null} thisObject
     * @constructor
     */
    function Scope(
        callStack,
        translator,
        globalScope,
        superGlobalScope,
        closureFactory,
        functionSpecFactory,
        valueFactory,
        variableFactory,
        referenceFactory,
        currentClass,
        currentFunction,
        thisObject
    ) {
        var thisObjectVariable = variableFactory.createVariable('this');

        this.callStack = callStack;
        this.closureFactory = closureFactory;
        /**
         * @type {Class|null}
         */
        this.currentClass = currentClass;
        this.currentFunction = currentFunction;
        this.errorsSuppressed = false;
        this.functionSpecFactory = functionSpecFactory;
        this.globalScope = globalScope || this;
        this.referenceFactory = referenceFactory;
        this.superGlobalScope = superGlobalScope;
        this.thisObject = currentFunction && currentFunction[IS_STATIC] ? null : thisObject;
        /**
         * @type {Translator}
         */
        this.translator = translator;
        this.valueFactory = valueFactory;
        this.variableFactory = variableFactory;
        this.variables = {
            'this': thisObjectVariable
        };

        if (thisObject && (!currentFunction || !currentFunction[IS_STATIC])) {
            thisObjectVariable.setValue(thisObject);
        }
    }

    _.extend(Scope.prototype, {
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
            var functionSpec,
                scope = this,
                thisObject = null;

            // Fetch the `$this` object to bind to the closure from the current scope,
            // if the closure is a normal (non-static) one. Otherwise, if the closure is static
            // then it will have no `$this` object bound to it
            if (!isStatic) {
                thisObject = scope.thisObject;
            }

            functionSpec = scope.functionSpecFactory.createClosureSpec(
                namespaceScope,
                scope.currentClass,
                parametersSpecData || [],
                namespaceScope.getFilePath(),
                lineNumber
            );

            return scope.closureFactory.create(
                scope,
                func,
                namespaceScope,
                scope.currentClass,
                thisObject,
                functionSpec
            );
        },

        /**
         * Defines a variable with the given name in this scope. If it is already defined,
         * in this scope (not including the superglobal scope) then an error will be thrown
         *
         * @param {string} name
         * @returns {Variable}
         * @throws {Error} Throws when the variable is already defined in this scope
         */
        defineVariable: function (name) {
            var scope = this,
                variable;

            if (hasOwn.call(scope.variables, name)) {
                // Variable is already defined, just return
                throw new Error('Variable "' + name + '" is already defined in this scope');
            }

            variable = scope.variableFactory.createVariable(name);

            scope.variables[name] = variable;

            return variable;
        },

        /**
         * Defines one or more variables with the given names in this scope
         *
         * @param {string[]} names
         */
        defineVariables: function (names) {
            var scope = this;

            _.each(names, function (name) {
                scope.defineVariable(name);
            });
        },

        /**
         * Returns a hash with the values of all variables defined
         * for this scope, including all superglobals
         *
         * @returns {Object.<string, Value>}
         */
        exportVariables: function () {
            var scope = this,
                values = scope.superGlobalScope.exportVariables();

            _.forOwn(scope.variables, function (variable, variableName) {
                if (variable.isDefined()) {
                    values[variableName] = variable.getValue();
                }
            });

            return values;
        },

        /**
         * Defines a variable in the current scope with the given native value
         *
         * @param {Value|*} value
         * @param {string} name
         */
        expose: function (value, name) {
            var scope = this,
                valueFactory = scope.valueFactory;

            scope.defineVariable(name).setValue(valueFactory.coerce(value));
        },

        /**
         * Fetches the name of the current class, or an empty string if there is none
         *
         * @returns {StringValue}
         */
        getClassName: function () {
            var scope = this;

            return scope.valueFactory.createString(
                scope.currentClass ? scope.currentClass.getName() : ''
            );
        },

        /**
         * Fetches the name of the class in which this scope's function is defined
         *
         * @returns {StringValue}
         * @throws {PHPFatalError} When there is no current class scope
         */
        getClassNameOrThrow: function () {
            var scope = this;

            if (!scope.currentClass) {
                // PHP Fatal error: Uncaught Error: Cannot access self:: when no class scope is active
                scope.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_ACCESS_WHEN_NO_ACTIVE_CLASS, {
                    className: 'self'
                });
            }

            return scope.valueFactory.createString(scope.currentClass.getName());
        },

        /**
         * Fetches the current class, if any
         *
         * @returns {Class|null}
         */
        getCurrentClass: function () {
            return this.currentClass;
        },

        /**
         * Fetches the current file path, taking eval into account
         *
         * @param {string|null} filePath
         * @returns {string|null}
         */
        getFilePath: function (filePath) {
            return filePath; // Passes through unaltered: see LoadScope for where a change is made
        },

        /**
         * Fetches the current function name (used by eg. the magic __FUNCTION__ constant)
         *
         * @returns {StringValue}
         */
        getFunctionName: function () {
            var scope = this,
                functionName = '';

            if (scope.currentFunction) {
                // NB: Method functions have no special treatment here -
                //     the owning namespace and/or class will be omitted
                functionName = scope.currentFunction.functionSpec.getUnprefixedFunctionName();
            }

            return scope.valueFactory.createString(functionName);
        },

        /**
         * Fetches the current method name (used by eg. the magic __METHOD__ constant)
         *
         * Note that this differs from .getFunctionName() when the current function is a method
         *
         * @param {boolean=} isStaticCall
         * @returns {StringValue}
         */
        getMethodName: function (isStaticCall) {
            var scope = this,
                functionName = '';

            if (scope.currentFunction) {
                // NB: Methods are prefixed with namespace, class and `::`
                functionName = scope.currentFunction.functionSpec.getFunctionName(isStaticCall !== false);
            }

            return scope.valueFactory.createString(functionName);
        },

        /**
         * Fetches the name of the parent of the current class in scope
         *
         * @returns {StringValue}
         * @throws {PHPFatalError} When there is no current class scope or current class has no parent
         */
        getParentClassNameOrThrow: function () {
            var scope = this,
                superClass;

            if (!scope.currentClass) {
                // PHP Fatal error: Uncaught Error: Cannot access parent:: when no class scope is active
                scope.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_ACCESS_WHEN_NO_ACTIVE_CLASS, {
                    className: 'parent'
                });
            }

            superClass = scope.currentClass.getSuperClass();

            if (!superClass) {
                // PHP Fatal error: Uncaught Error: Cannot access parent:: when current class scope has no parent
                scope.callStack.raiseTranslatedError(PHPError.E_ERROR, NO_PARENT_CLASS);
            }

            return scope.valueFactory.createString(superClass.getName());
        },

        /**
         * Fetches the name of the current static class scope, which may be different
         * from the class in which its function is defined (eg. after a forward_static_call(...))
         *
         * @returns {StringValue}
         * @throws {PHPFatalError} When there is no static class scope
         */
        getStaticClassNameOrThrow: function () {
            var scope = this,
                staticClass = scope.callStack.getStaticClass();

            if (!staticClass) {
                // PHP Fatal error: Uncaught Error: Cannot access static:: when no class scope is active
                scope.callStack.raiseTranslatedError(PHPError.E_ERROR, CANNOT_ACCESS_WHEN_NO_ACTIVE_CLASS, {
                    className: 'static'
                });
            }

            return scope.valueFactory.createString(staticClass.getName());
        },

        /**
         * Fetches the current object (the value of $this) if any
         *
         * @returns {ObjectValue|null}
         */
        getThisObject: function () {
            return this.thisObject;
        },

        /**
         * Fetches the current function or method name as used in stack traces
         *
         * Note that this differs from .getFunctionName() and .getMethodName()
         *
         * @returns {string}
         */
        getTraceFrameName: function () {
            var scope = this,
                functionName = '';

            if (scope.currentFunction) {
                // NB: Methods are prefixed with namespace, class and `::`
                functionName = scope.currentFunction.functionSpec.getFunctionTraceFrameName(scope.isStatic());
            }

            return functionName;
        },

        /**
         * Fetches a variable for the current or super global scope,
         * implicitly defining it if needed
         *
         * @param {string} name
         * @returns {Variable}
         */
        getVariable: function (name) {
            var scope = this,
                variable;

            // Look in the current scope for the variable first
            if (hasOwn.call(scope.variables, name)) {
                return scope.variables[name];
            }

            // If not found, look in the super global scope
            variable = scope.superGlobalScope.getVariable(name);

            if (!variable) {
                // Variable is not local or a super-global: implicitly define it
                variable = scope.variableFactory.createVariable(name);
                scope.variables[name] = variable;

                if (scope.errorsSuppressed) {
                    variable.setValue(scope.valueFactory.createNull());
                }
            }

            return variable;
        },

        /**
         * Determines whether this scope defines the specified variable or not
         * (not including the superglobal scope)
         *
         * @param {string} name
         * @returns {boolean}
         */
        hasVariable: function (name) {
            return hasOwn.call(this.variables, name);
        },

        /**
         * Imports a global variable into this scope by defining the variable
         * in this scope and setting its reference to point to the global one.
         *
         * @param {string} variableName
         */
        importGlobal: function (variableName) {
            var scope = this;

            if (scope.globalScope === scope) {
                // Nothing to do; we're trying to import a global into the global scope
                return;
            }

            scope.getVariable(variableName).setReference(
                scope.globalScope.getVariable(variableName).getReference()
            );
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
            var scope = this,
                staticVariables,
                staticVariable;

            if (scope.currentFunction) {
                if (scope.currentFunction.staticVariables) {
                    staticVariables = scope.currentFunction.staticVariables;
                } else {
                    staticVariables = {};
                    scope.currentFunction.staticVariables = staticVariables;
                }

                if (!hasOwn.call(staticVariables, variableName)) {
                    staticVariables[variableName] = scope.variableFactory.createVariable(variableName);

                    if (initialValue) {
                        // Initialiser is optional
                        staticVariables[variableName].setValue(initialValue);
                    }
                }

                staticVariable = staticVariables[variableName];

                // Define a variable in the current scope that is a reference
                // to the static variable stored against either the current function or the global scope if none
                scope.getVariable(variableName).setReference(staticVariable.getReference());
            } else {
                scope.getVariable(variableName).setValue(initialValue);
            }
        },

        /**
         * Whether this call scope is in a static context or not
         *
         * @returns {boolean}
         */
        isStatic: function () {
            return !this.thisObject;
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
            var scope = this,
                message = scope.translator.translate(SCOPED_ERROR, {
                    function: scope.getFunctionName().getNative(),
                    message: scope.translator.translate(translationKey, placeholderVariables)
                });

            if (level === PHPError.E_ERROR) {
                // Non-warning/non-notice errors need to actually stop execution
                // NB: The Error class' constructor will fetch file and line number info
                throw scope.valueFactory.createErrorObject(
                    errorClass || 'Error',
                    message,
                    null,
                    null,
                    filePath,
                    lineNumber,
                    reportsOwnContext
                );
            }

            scope.callStack.raiseError(level, message, errorClass, reportsOwnContext);
        },

        /**
         * Suppresses errors for this and any descendant scopes
         */
        suppressErrors: function () {
            this.errorsSuppressed = true;
        },

        /**
         * Suppresses errors for only this and not any descendant scopes
         */
        suppressOwnErrors: function () {
            this.ownErrorsSuppressed = true;
        },

        /**
         * Determines whether errors have been suppressed for this and any descendant scopes
         *
         * @returns {boolean}
         */
        suppressesErrors: function () {
            return this.errorsSuppressed;
        },

        /**
         * Determines whether errors have been suppressed for this but not any descendant scopes
         *
         * @returns {boolean}
         */
        suppressesOwnErrors: function () {
            return this.ownErrorsSuppressed;
        },

        /**
         * Unsuppresses errors for this and any descendant scopes
         */
        unsuppressErrors: function () {
            this.errorsSuppressed = false;
        },

        /**
         * Unsuppresses errors for this but not any descendant scopes
         */
        unsuppressOwnErrors: function () {
            this.ownErrorsSuppressed = false;
        }
    });

    return Scope;
}, {strict: true});
